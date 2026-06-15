import { useEffect, useRef, useState, type PointerEvent } from 'react'
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
  const gestureRef = useRef({
    pointerId: -1,
    startY: 0,
    selectedTileId: null as string | null,
  })
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const drawnTile = tiles.find((tile) => tile.id === drawnTileId)
  const concealed = sortTiles(tiles.filter((tile) => tile.id !== drawnTileId))
  const displayed = drawnTile ? [...concealed, drawnTile] : concealed

  useEffect(() => {
    setSelectedTileId(null)
  }, [drawnTileId, canDiscard])

  useEffect(() => {
    if (!selectedTileId) return

    const cancelSelection = (event: globalThis.PointerEvent) => {
      if (handRef.current?.contains(event.target as Node)) return
      setSelectedTileId(null)
    }

    document.addEventListener('pointerdown', cancelSelection)
    return () => document.removeEventListener('pointerdown', cancelSelection)
  }, [selectedTileId])

  const handleTileClick = (tile: Tile) => {
    if (window.matchMedia('(max-width: 480px)').matches) return
    onDiscard(tile)
  }

  const tileIdAtPoint = (clientX: number, clientY: number) =>
    document.elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>('[data-hand-tile-id]')
      ?.dataset.handTileId ?? null

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canDiscard || !window.matchMedia('(max-width: 480px)').matches) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const tileId = (event.target as Element)
      .closest<HTMLElement>('[data-hand-tile-id]')
      ?.dataset.handTileId
    if (!tileId) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      selectedTileId: tileId,
    }
    setSelectedTileId(tileId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (gesture.pointerId !== event.pointerId) return
    event.preventDefault()

    const hoveredTileId = tileIdAtPoint(event.clientX, event.clientY)
    if (hoveredTileId && hoveredTileId !== gesture.selectedTileId) {
      gesture.selectedTileId = hoveredTileId
      setSelectedTileId(hoveredTileId)
    }

    if (event.clientY <= gesture.startY - 36) {
      const tileToDiscard = displayed.find((tile) => tile.id === gesture.selectedTileId)
      gesture.pointerId = -1
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      setSelectedTileId(null)
      if (tileToDiscard) onDiscard(tileToDiscard)
    }
  }

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (gesture.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    gesture.pointerId = -1
  }

  const cancelGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current.pointerId !== event.pointerId) return
    gestureRef.current.pointerId = -1
  }

  return (
    <section className="hand-zone" aria-label="あなたの手牌">
      <div
        className={`hand ${canDiscard ? 'is-active' : ''}`}
        ref={handRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={cancelGesture}
      >
        {displayed.map((tile) => (
          <span className="hand-tile-slot" data-hand-tile-id={tile.id} key={tile.id}>
            <TileView
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
          </span>
        ))}
      </div>
      <span className="hand-scroll-hint">
        {selectedTileId
          ? '横になぞって選択・上へスワイプして打牌'
          : '牌を押さえたまま選び、上へスワイプして打牌'}
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
