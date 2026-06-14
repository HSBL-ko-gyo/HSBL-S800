import type { GameState, Tile } from '../gameEngine'
import { HandView } from './HandView'
import { RiverView } from './RiverView'

interface TableViewProps {
  game: GameState
  onDiscard: (tile: Tile) => void
  onRestart: () => void
}

const SEATS = ['south', 'east', 'north', 'west'] as const

export function TableView({ game, onDiscard, onRestart }: TableViewProps) {
  const humanTurn = game.status === 'playing' && game.currentPlayer === 0 && game.awaitingDiscard
  const currentPlayer = game.players[game.currentPlayer]
  const statusText = game.status === 'draw'
    ? '流局'
    : humanTurn
      ? 'あなたの番'
      : `${currentPlayer.name} 打牌中`

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
        canDiscard={humanTurn}
        onDiscard={onDiscard}
      />

      {game.status === 'draw' && (
        <section className="draw-result" role="dialog" aria-label="流局">
          <span className="result-kicker">牌山終了</span>
          <h2>流局</h2>
          <p>全員が最後まで打ち切りました。</p>
          <button type="button" onClick={onRestart}>もう一局</button>
        </section>
      )}
    </>
  )
}
