import {
  calculateShanten,
  canDeclareTsumo,
  getVisibleTiles,
  getRiichiWaitTiles,
  getWaitTiles,
  getYakuHints,
  type GameState,
  type Tile,
} from '../gameEngine'
import { DiscardHistory } from './DiscardHistory'
import { HandView } from './HandView'
import { LearningPanel } from './LearningPanel'
import { RiverView } from './RiverView'

interface TableViewProps {
  game: GameState
  onDiscard: (tile: Tile) => void
  onRiichiMode: (enabled: boolean) => void
  onTsumo: () => void
  onRon: () => void
  onRestart: () => void
}

const SEATS = ['south', 'east', 'north', 'west'] as const

export function TableView({
  game,
  onDiscard,
  onRiichiMode,
  onTsumo,
  onRon,
  onRestart,
}: TableViewProps) {
  const humanTurn = game.status === 'playing' && game.currentPlayer === 0 && game.awaitingDiscard
  const freeDiscard = humanTurn && !game.playerRiichi
  const currentPlayer = game.players[game.currentPlayer]
  const canTsumo = canDeclareTsumo(game)
  const baselineHand = game.players[0].hand.filter((tile) => tile.id !== game.drawnTileId)
  const baselineShanten = calculateShanten(baselineHand)
  const drawnTile = game.players[0].hand.find((tile) => tile.id === game.drawnTileId)
  const baselineWaits = getWaitTiles(
    baselineHand,
    [...getVisibleTiles(game), ...(drawnTile ? [drawnTile] : [])],
  )
  const yakuHints = getYakuHints(game.players[0].hand)
  const riichiWaits = getRiichiWaitTiles(game)
  const statusText = game.status === 'draw'
    ? '流局'
    : game.status === 'win'
      ? game.winType === 'tsumo' ? 'ツモ和了' : 'ロン和了'
      : game.pendingRonTile
        ? 'ロンできます'
        : canTsumo
          ? 'ツモできます'
          : humanTurn
            ? game.playerRiichi ? 'リーチ中' : 'あなたの番'
            : `${currentPlayer.name} 打牌中`
  const handHint = game.pendingRonTile
    ? 'ロンできます'
    : canTsumo
      ? 'ツモできます'
      : game.riichiDeclareMode
        ? 'リーチ宣言中：切る牌を選んでください'
        : game.lastFeedback
          ?? (freeDiscard ? '切る牌を選んでください' : game.playerRiichi ? 'リーチ後は自動ツモ切り' : '敵の打牌中…')

  return (
    <>
      <main className="table-board">
        {[2, 3, 1, 0].map((playerIndex) => {
          const player = game.players[playerIndex]
          const lastDiscardId = game.lastDiscard?.playerIndex === playerIndex
            ? game.lastDiscard.tileId
            : undefined
          return (
            <RiverView
              key={player.wind}
              player={player}
              seat={SEATS[playerIndex]}
              active={game.status === 'playing' && game.currentPlayer === playerIndex}
              lastDiscardId={lastDiscardId}
            />
          )
        })}

        <section className="table-center" aria-live="polite">
          <span className="round-label">東一局</span>
          <strong>{statusText}</strong>
          {game.playerRiichi && <span className="riichi-status">立直</span>}
          <div className="wall-counter">
            <span>山</span>
            <b>{game.wall.length}</b>
            <span>枚</span>
          </div>
          <small>{game.turnNumber} 打牌</small>
        </section>
      </main>

      <HandView
        tiles={game.players[0].hand}
        drawnTileId={game.drawnTileId}
        canDiscard={freeDiscard}
        canRon={Boolean(game.pendingRonTile)}
        canTsumo={canTsumo}
        hint={handHint}
        onDiscard={onDiscard}
        onRon={onRon}
        onTsumo={onTsumo}
      />

      <LearningPanel
        shanten={baselineShanten}
        improvementTypeCount={baselineWaits.length}
        improvementTileCount={baselineWaits.reduce((sum, tile) => sum + tile.remaining, 0)}
        yakuHints={yakuHints}
        hand={game.players[0].hand}
        evaluation={game.lastEvaluation}
        riichiWaits={riichiWaits}
        feedback={game.lastFeedback}
        showRiichiButton={humanTurn && !game.playerRiichi}
        riichiDeclareMode={game.riichiDeclareMode}
        onRiichiMode={onRiichiMode}
      />

      {game.status !== 'playing' && (
        <section className="round-result" role="dialog" aria-label={game.status === 'draw' ? '流局' : '和了'}>
          <span className="result-kicker">{game.status === 'draw' ? '牌山終了' : '練習結果'}</span>
          <h2>{game.status === 'draw' ? '流局' : game.winType === 'tsumo' ? 'ツモ' : 'ロン'}</h2>
          <p>{game.status === 'draw' ? '最後まで打ち切りました。打牌を振り返りましょう。' : '和了しました。打牌を振り返りましょう。'}</p>
          <DiscardHistory logs={game.discardLogs} />
          <button className="restart-button" type="button" onClick={onRestart}>もう一局</button>
        </section>
      )}
    </>
  )
}
