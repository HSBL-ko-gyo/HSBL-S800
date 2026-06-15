import { useEffect, useRef } from 'react'
import type { Tile } from '../gameEngine'
import { sortTiles } from '../gameEngine'
import { TileView } from './TileView'

interface HandViewProps {
  tiles: Tile[]
  drawnTileId: string | null
  canDiscard: boolean
  canRon: boolean
  canTsumo: boolean
  hint: string
  onDiscard: (tile: Tile) => void
  onRon: () => void
  onTsumo: () => void
}

export function HandView({
  tiles,
  drawnTileId,
  canDiscard,
  canRon,
  canTsumo,
  hint,
  onDiscard,
  onRon,
  onTsumo,
}: HandViewProps) {
  const handRef = useRef<HTMLDivElement>(null)
  const drawnTile = tiles.find((tile) => tile.id === drawnTileId)
  const concealed = sortTiles(tiles.filter((tile) => tile.id !== drawnTileId))
  const displayed = drawnTile ? [...concealed, drawnTile] : concealed

  useEffect(() => {
    if (!drawnTileId || !handRef.current) return
    handRef.current.scrollLeft = handRef.current.scrollWidth
  }, [drawnTileId])

  return (
    <section className="hand-zone" aria-label="あなたの手牌">
      <div className={`hand ${canDiscard ? 'is-active' : ''}`} ref={handRef}>
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
      <span className="hand-scroll-hint">横にスワイプして牌を選べます</span>
      {(canTsumo || canRon) && (
        <div className="hand-action-buttons">
          {canTsumo && <button className="win-button" type="button" onClick={onTsumo}>ツモ</button>}
          {canRon && <button className="win-button" type="button" onClick={onRon}>ロン</button>}
        </div>
      )}
      <p className="hand-hint">{hint}</p>
    </section>
  )
}
