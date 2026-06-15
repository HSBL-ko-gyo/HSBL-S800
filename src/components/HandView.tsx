import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Tile } from '../gameEngine'
import { sortTiles } from '../gameEngine'
import { TileView } from './TileView'

interface HandViewProps {
  tiles: Tile[]
  drawnTileId: string | null
  canDiscard: boolean
  canRon: boolean
  canTsumo: boolean
  showRiichiButton: boolean
  riichiDeclareMode: boolean
  hint: string
  onDiscard: (tile: Tile) => void
  onRon: () => void
  onTsumo: () => void
  onRiichiMode: (enabled: boolean) => void
}

export function HandView({
  tiles,
  drawnTileId,
  canDiscard,
  canRon,
  canTsumo,
  showRiichiButton,
  riichiDeclareMode,
  hint,
  onDiscard,
  onRon,
  onTsumo,
  onRiichiMode,
}: HandViewProps) {
  const handRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    selectedTileId: null as string | null,
    selectedAtPointerDown: false,
    moved: false,
    verticalLocked: false,
  })
  const tapRef = useRef({ tileId: null as string | null, count: 0, lastAt: 0 })
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const [selectedLift, setSelectedLift] = useState(0)
  const drawnTile = tiles.find((tile) => tile.id === drawnTileId)
  const concealed = sortTiles(tiles.filter((tile) => tile.id !== drawnTileId))
  const displayed = drawnTile ? [...concealed, drawnTile] : concealed
  const selectedTile = displayed.find((tile) => tile.id === selectedTileId)

  useEffect(() => {
    setSelectedTileId(null)
    setSelectedLift(0)
    tapRef.current = { tileId: null, count: 0, lastAt: 0 }
  }, [drawnTileId, canDiscard])

  useEffect(() => {
    if (!selectedTileId) return

    const cancelSelection = (event: globalThis.PointerEvent) => {
      if (handRef.current?.contains(event.target as Node)) return
      setSelectedTileId(null)
      setSelectedLift(0)
      tapRef.current = { tileId: null, count: 0, lastAt: 0 }
    }

    document.addEventListener('pointerdown', cancelSelection)
    return () => document.removeEventListener('pointerdown', cancelSelection)
  }, [selectedTileId])

  const handleTileClick = (tile: Tile) => {
    if (window.matchMedia('(max-width: 480px)').matches) return
    onDiscard(tile)
  }

  const tileIdAtX = (clientX: number) => {
    const slots = [...(handRef.current?.querySelectorAll<HTMLElement>('[data-hand-tile-id]') ?? [])]
    let nearest: { id: string; distance: number } | null = null

    for (const slot of slots) {
      const rect = slot.getBoundingClientRect()
      const distance = Math.abs(clientX - (rect.left + rect.width / 2))
      if (!nearest || distance < nearest.distance) {
        nearest = { id: slot.dataset.handTileId ?? '', distance }
      }
    }

    return nearest?.id || null
  }

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
      startX: event.clientX,
      startY: event.clientY,
      selectedTileId: tileId,
      selectedAtPointerDown: selectedTileId === tileId,
      moved: false,
      verticalLocked: false,
    }
    if (selectedTileId !== tileId) {
      tapRef.current = { tileId: null, count: 0, lastAt: 0 }
    }
    setSelectedTileId(tileId)
    setSelectedLift(0)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (gesture.pointerId !== event.pointerId) return
    event.preventDefault()

    if (Math.abs(event.clientX - gesture.startX) > 6 || Math.abs(event.clientY - gesture.startY) > 6) {
      gesture.moved = true
    }

    const upwardDistance = Math.max(0, gesture.startY - event.clientY)
    if (upwardDistance >= 10) gesture.verticalLocked = true

    if (!gesture.verticalLocked) {
      const hoveredTileId = tileIdAtX(event.clientX)
      if (hoveredTileId && hoveredTileId !== gesture.selectedTileId) {
        gesture.selectedTileId = hoveredTileId
        gesture.selectedAtPointerDown = false
        tapRef.current = { tileId: null, count: 0, lastAt: 0 }
        setSelectedTileId(hoveredTileId)
      }
    }

    setSelectedLift(Math.min(upwardDistance, 42))

    if (upwardDistance >= 48) {
      const tileToDiscard = displayed.find((tile) => tile.id === gesture.selectedTileId)
      gesture.pointerId = -1
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      setSelectedTileId(null)
      setSelectedLift(0)
      tapRef.current = { tileId: null, count: 0, lastAt: 0 }
      if (tileToDiscard) onDiscard(tileToDiscard)
    }
  }

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (gesture.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (!gesture.moved && gesture.selectedAtPointerDown && gesture.selectedTileId) {
      const now = Date.now()
      const continuesDoubleTap = tapRef.current.tileId === gesture.selectedTileId
        && now - tapRef.current.lastAt <= 500
      tapRef.current = {
        tileId: gesture.selectedTileId,
        count: continuesDoubleTap ? tapRef.current.count + 1 : 1,
        lastAt: now,
      }

      if (tapRef.current.count >= 2) {
        const tileToDiscard = displayed.find((tile) => tile.id === gesture.selectedTileId)
        tapRef.current = { tileId: null, count: 0, lastAt: 0 }
        setSelectedTileId(null)
        if (tileToDiscard) onDiscard(tileToDiscard)
      }
    }

    gesture.pointerId = -1
    gesture.verticalLocked = false
    setSelectedLift(0)
  }

  const cancelGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current.pointerId !== event.pointerId) return
    gestureRef.current.pointerId = -1
    gestureRef.current.verticalLocked = false
    setSelectedLift(0)
  }

  return (
    <section
      className="hand-zone"
      aria-label="あなたの手牌"
      style={{ '--selected-lift': `${selectedLift}px` } as CSSProperties}
    >
      <div className={`hand-selection-preview ${selectedTile ? 'has-selection' : ''}`} aria-live="polite">
        {selectedTile
          ? <TileView tile={selectedTile} usage="hand" className="hand-preview-tile" />
          : <span className="hand-preview-placeholder">牌を選択</span>}
      </div>
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
          ? '下段を横になぞって選択・上スワイプ または ダブルタップで打牌'
          : '下段をタップまたは横になぞって選択'}
      </span>
      {(canTsumo || canRon || showRiichiButton) && (
        <div className="hand-action-buttons">
          {canTsumo && <button className="win-button" type="button" onClick={onTsumo}>ツモ</button>}
          {canRon && <button className="win-button" type="button" onClick={onRon}>ロン</button>}
          {showRiichiButton && (
            <button
              className={`riichi-button hand-riichi-button ${riichiDeclareMode ? 'is-active' : ''}`}
              type="button"
              onClick={() => onRiichiMode(!riichiDeclareMode)}
            >
              {riichiDeclareMode ? 'リーチ取消' : 'リーチ宣言'}
            </button>
          )}
        </div>
      )}
      <p className="hand-hint">{hint}</p>
    </section>
  )
}
