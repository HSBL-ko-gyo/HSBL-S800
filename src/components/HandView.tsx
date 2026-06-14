import type { Tile } from '../gameEngine'
import { sortTiles } from '../gameEngine'
import { TileView } from './TileView'

interface HandViewProps {
  tiles: Tile[]
  drawnTileId: string | null
  canDiscard: boolean
  hint: string
  onDiscard: (tile: Tile) => void
}

export function HandView({ tiles, drawnTileId, canDiscard, hint, onDiscard }: HandViewProps) {
  const drawnTile = tiles.find((tile) => tile.id === drawnTileId)
  const concealed = sortTiles(tiles.filter((tile) => tile.id !== drawnTileId))
  const displayed = drawnTile ? [...concealed, drawnTile] : concealed

  return (
    <section className="hand-zone" aria-label="あなたの手牌">
      <div className={`hand ${canDiscard ? 'is-active' : ''}`}>
        {displayed.map((tile) => (
          <TileView
            key={tile.id}
            tile={tile}
            usage="hand"
            className={tile.id === drawnTileId ? 'drawn' : ''}
            visualState={canDiscard ? undefined : 'static'}
            disabled={!canDiscard}
            onClick={canDiscard ? onDiscard : undefined}
          />
        ))}
      </div>
      <p className="hand-hint">{hint}</p>
    </section>
  )
}
