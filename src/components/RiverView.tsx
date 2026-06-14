import type { PlayerState } from '../gameEngine'
import { TileView } from './TileView'

interface RiverViewProps {
  player: PlayerState
  seat: 'south' | 'east' | 'north' | 'west'
  active: boolean
  lastDiscardId?: string
}

export function RiverView({ player, seat, active, lastDiscardId }: RiverViewProps) {
  return (
    <section className={`river-panel river-${seat} ${active ? 'active-player' : ''}`}>
      <div className="player-label">
        <span className="wind-badge">{player.wind}</span>
        <span>{player.name}</span>
        {seat !== 'south' && <span className="hand-count">手牌 {player.hand.length}</span>}
      </div>
      <div className="river" aria-label={`${player.name}の捨て牌`}>
        {player.river.map((tile) => (
          <TileView
            key={tile.id}
            tile={tile}
            mini
            className={tile.id === lastDiscardId ? 'latest-discard' : ''}
          />
        ))}
        {player.river.length === 0 && <span className="river-empty">まだ捨て牌なし</span>}
      </div>
    </section>
  )
}
