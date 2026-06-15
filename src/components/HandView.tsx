import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'
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
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    dragging: false,
  })
  const suppressClickRef = useRef(false)
  const drawnTile = tiles.find((tile) => tile.id === drawnTileId)
  const concealed = sortTiles(tiles.filter((tile) => tile.id !== drawnTileId))
  const displayed = drawnTile ? [...concealed, drawnTile] : concealed

  useEffect(() => {
    if (!drawnTileId || !handRef.current) return
    handRef.current.scrollLeft = handRef.current.scrollWidth
  }, [drawnTileId])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const hand = handRef.current
    if (!hand || hand.scrollWidth <= hand.clientWidth) return

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: hand.scrollLeft,
      dragging: false,
    }
    suppressClickRef.current = false
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const hand = handRef.current
    const drag = dragRef.current
    if (!hand || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.dragging) {
      if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) return
      if (Math.abs(deltaY) > Math.abs(deltaX)) return

      drag.dragging = true
      suppressClickRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    event.preventDefault()
    hand.scrollLeft = drag.startScrollLeft - deltaX
  }

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    drag.pointerId = -1
    drag.dragging = false
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)
  }

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }

  return (
    <section className="hand-zone" aria-label="あなたの手牌">
      <div
        className={`hand ${canDiscard ? 'is-active' : ''}`}
        ref={handRef}
        onClickCapture={handleClickCapture}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
      >
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
