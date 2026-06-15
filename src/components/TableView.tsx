import {
  calculateShanten,
  canDeclareTsumo,
  getChiOptions,
  getVisibleTiles,
  getRiichiWaitTiles,
  getWaitTiles,
  getYakuHints,
  tileName,
  type CallType,
  type GameState,
  type Meld,
  type Tile,
} from '../gameEngine'
import { DiscardHistory } from './DiscardHistory'
import { HandView } from './HandView'
import { LearningPanel } from './LearningPanel'
import { RiverView } from './RiverView'
import { TileView } from './TileView'

interface TableViewProps {
  game: GameState
  onDiscard: (tile: Tile) => void
  onRiichiMode: (enabled: boolean) => void
  onCallsDisabledMode: (enabled: boolean) => void
  onTsumo: () => void
  onRon: () => void
  onStartReaction: () => void
  onSkipReactions: () => void
  onDeclareReaction: (type: Exclude<CallType, 'kan'>, eventId: string, chiTileIds?: string[]) => void
  onRestart: () => void
}

const SEATS = ['south', 'east', 'north', 'west'] as const

function MeldView({ melds }: { melds: Meld[] }) {
  if (melds.length === 0) return null
  return (
    <div className="meld-area" aria-label="副露">
      {melds.map((meld, index) => (
        <div className={`meld meld-${meld.type}`} key={`${meld.type}-${index}-${meld.calledTile.id}`}>
          <span>{meld.type === 'pon' ? 'ポン' : meld.type === 'chi' ? 'チー' : 'カン'}</span>
          <div className="meld-tiles">
            {meld.tiles.map((tile) => (
              <TileView
                key={tile.id}
                tile={tile}
                usage="mini"
                className={tile.id === meld.calledTile.id ? 'called-tile' : ''}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CallDisableSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <label className="side-call-toggle desktop-call-toggle" aria-label="鳴き無し">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span>鳴き無し</span>
    </label>
  )
}

export function TableView({
  game,
  onDiscard,
  onRiichiMode,
  onCallsDisabledMode,
  onTsumo,
  onRon,
  onStartReaction,
  onSkipReactions,
  onDeclareReaction,
  onRestart,
}: TableViewProps) {
  const humanTurn = game.status === 'playing'
    && game.phase === 'player_discard'
    && game.currentPlayer === 0
    && game.awaitingDiscard
  const freeDiscard = humanTurn && !game.playerRiichi
  const showRiichiButton = game.status === 'playing'
  const currentPlayer = game.players[game.currentPlayer]
  const canTsumo = canDeclareTsumo(game)
  const riichiButtonEnabled = humanTurn && !game.playerRiichi && !canTsumo && game.players[0].melds.length === 0
  const baselineHand = game.players[0].hand.filter((tile) => tile.id !== game.drawnTileId)
  const humanMeldCount = game.players[0].melds.length
  const baselineShanten = calculateShanten(baselineHand, humanMeldCount)
  const drawnTile = game.players[0].hand.find((tile) => tile.id === game.drawnTileId)
  const baselineWaits = getWaitTiles(
    baselineHand,
    [...getVisibleTiles(game), ...(drawnTile ? [drawnTile] : [])],
    humanMeldCount,
  )
  const yakuHints = getYakuHints(game.players[0].hand)
  const riichiWaits = getRiichiWaitTiles(game)
  const hasFourRowRiver = game.players.some((player) => player.river.length >= 19)
  const statusText = game.status === 'draw'
    ? '流局'
    : game.status === 'win'
      ? game.winType === 'tsumo' ? 'ツモ和了' : 'ロン和了'
      : game.phase === 'reaction_review'
        ? 'ツモ前確認'
        : game.phase === 'declare_reaction'
          ? '宣言選択'
        : canTsumo
          ? 'ツモできます'
          : humanTurn
            ? game.playerRiichi ? 'リーチ中' : 'あなたの番'
            : `${currentPlayer.name} 打牌中`
  const handHint = game.pendingRonTile
    ? game.phase === 'declare_reaction' ? '宣言する種類を選んでください' : 'ツモ前に宣言確認できます'
    : canTsumo
      ? 'ツモできます'
      : game.riichiDeclareMode
        ? 'リーチ宣言中：切る牌を選んでください'
        : game.lastFeedback
          ?? (freeDiscard ? '切る牌を選んでください' : game.playerRiichi ? 'リーチ後は自動ツモ切り' : '敵の打牌中…')

  return (
    <>
      <div className="game-layout">
        <div className="play-column">
          <CallDisableSwitch enabled={game.callsDisabled} onChange={onCallsDisabledMode} />
          <main className={`table-board ${hasFourRowRiver ? 'is-late-round' : ''}`}>
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
            canRon={false}
            canTsumo={canTsumo}
            showRiichiButton={showRiichiButton}
            riichiButtonEnabled={riichiButtonEnabled}
            playerRiichi={game.playerRiichi}
            riichiDeclareMode={game.riichiDeclareMode}
            callsDisabled={game.callsDisabled}
            hint={handHint}
            onDiscard={onDiscard}
            onRon={onRon}
            onTsumo={onTsumo}
            onRiichiMode={onRiichiMode}
            onCallsDisabledMode={onCallsDisabledMode}
          />
          <MeldView melds={game.players[0].melds} />
          {game.phase === 'reaction_review' && (
            <section className="reaction-panel" aria-label="ツモ前確認">
              <div>
                <span className="reaction-kicker">ツモ前確認</span>
                <strong>宣言する？</strong>
              </div>
              <div className="reaction-actions">
                <button className="reaction-secondary" type="button" onClick={onStartReaction}>宣言する</button>
                <button className="reaction-primary" type="button" onClick={onSkipReactions}>ツモる</button>
              </div>
            </section>
          )}
          {game.phase === 'declare_reaction' && (
            <section className="reaction-panel declare-panel" aria-label="宣言選択">
              <div>
                <span className="reaction-kicker">宣言選択</span>
                <strong>対象の捨て牌を選択</strong>
              </div>
              <div className="reaction-event-list">
                {game.pendingReactionEvents.length === 0 && (
                  <p className="reaction-empty">宣言できる捨て牌はありません</p>
                )}
                {game.pendingReactionEvents.map((event) => {
                  const chiOptions = event.canChi ? getChiOptions(game.players[0].hand, event.tile) : []
                  return (
                    <div className="reaction-event" key={event.id}>
                      <div className="reaction-target">
                        <TileView tile={event.tile} usage="mini" />
                        <span>{game.players[event.actor].name}の{tileName(event.tile.code)}</span>
                      </div>
                      <div className="reaction-actions">
                        {event.canRon && (
                          <button type="button" onClick={() => onDeclareReaction('ron', event.id)}>ロン</button>
                        )}
                        {event.canPon && (
                          <button type="button" onClick={() => onDeclareReaction('pon', event.id)}>ポン</button>
                        )}
                        {chiOptions.map((option, index) => (
                          <button
                            type="button"
                            key={`${event.id}-chi-${index}`}
                            onClick={() => onDeclareReaction('chi', event.id, option.map((tile) => tile.id))}
                          >
                            チー {option.map((tile) => tileName(tile.code)).join('-')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <button className="reaction-secondary" type="button" onClick={onSkipReactions}>宣言しない</button>
            </section>
          )}
        </div>

        <LearningPanel
          shanten={baselineShanten}
          improvementTypeCount={baselineWaits.length}
          improvementTileCount={baselineWaits.reduce((sum, tile) => sum + tile.remaining, 0)}
          yakuHints={yakuHints}
          hand={game.players[0].hand}
          evaluation={game.lastEvaluation}
          riichiWaits={riichiWaits}
          feedback={game.lastFeedback}
          showRiichiButton={showRiichiButton}
          riichiButtonEnabled={riichiButtonEnabled}
          playerRiichi={game.playerRiichi}
          riichiDeclareMode={game.riichiDeclareMode}
          onRiichiMode={onRiichiMode}
        />
      </div>

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
