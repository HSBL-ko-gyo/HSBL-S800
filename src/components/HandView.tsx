import { useEffect, useState } from 'react'
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
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const drawnTile = tiles.find((tile) => tile.id === drawnTileId)
  const concealed = sortTiles(tiles.filter((tile) => tile.id !== drawnTileId))
  const displayed = drawnTile ? [...concealed, drawnTile] : concealed

  useEffect(() => {
    setSelectedTileId(null)
  }, [drawnTileId, canDiscard])

  const handleTileClick = (tile: Tile) => {
    const usesMobileConfirmation = window.matchMedia('(max-width: 480px)').matches
    if (!usesMobileConfirmation) {
      onDiscard(tile)
      return
    }

    if (selectedTileId === tile.id) {
      setSelectedTileId(null)
      onDiscard(tile)
      return
    }

    setSelectedTileId(tile.id)
  }

  return (
    <section className="hand-zone" aria-label="あなたの手牌">
      <div className={`hand ${canDiscard ? 'is-active' : ''}`}>
        {displayed.map((tile) => (
          <TileView
            key={tile.id}
            tile={tile}
            usage="hand"
            className={[
              tile.id === drawnTileId ? 'drawn' : '',
              tile.id === selectedTileId ? 'selected' : '',
            ].filter(Boolean).join(' ')}
            visualState={canDiscard ? undefined : 'static'}
            disabled={!canDiscard}
            onClick={canDiscard ? handleTileClick : undefined}
          />
        ))}
      </div>
      <span className="hand-scroll-hint">
        {selectedTileId ? '浮いた牌をもう一度タップで打牌' : '牌をタップして拡大・もう一度タップで打牌'}
      </span>
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
