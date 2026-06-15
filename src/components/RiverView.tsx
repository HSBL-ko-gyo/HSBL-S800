import type { PlayerState } from '../gameEngine'
import { TileView } from './TileView'

interface RiverViewProps {
  player: PlayerState
  seat: 'south' | 'east' | 'north' | 'west'
  active: boolean
  lastDiscardId?: string
}

export function RiverView({ player, seat, active, lastDiscardId }: RiverViewProps) {
  const visibleRiver = player.river.filter((record) => record.calledBy === undefined)

  return (
    <section className={`river-panel river-${seat} ${active ? 'active-player' : ''}`}>
      <div className="player-label">
        <span className="wind-badge">{player.wind}</span>
        <span>{player.name}</span>
        {seat !== 'south' && <span className="hand-count">手牌 {player.hand.length}</span>}
      </div>
      <div className="river" aria-label={`${player.name}の捨て牌`}>
        {visibleRiver.map((record) => (
          <TileView
            key={record.id}
            tile={record.tile}
            usage="river"
            className={record.tile.id === lastDiscardId ? 'latest-discard' : ''}
          />
        ))}
        {visibleRiver.length === 0 && <span className="river-empty">まだ捨て牌なし</span>}
      </div>
    </section>
  )
}
