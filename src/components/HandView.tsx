import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Tile } from '../gameEngine'
import { sortTiles } from '../gameEngine'
import { TileView } from './TileView'

const DISCARD_SWIPE_THRESHOLD = 48

interface HandViewProps {
  tiles: Tile[]
  drawnTileId: string | null
  canDiscard: boolean
  canRon: boolean
  canTsumo: boolean
  showRiichiButton: boolean
  riichiButtonEnabled: boolean
  playerRiichi: boolean
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
  riichiButtonEnabled,
  playerRiichi,
  riichiDeclareMode,
  hint,
  onDiscard,
  onRon,
  onTsumo,
  onRiichiMode,
}: HandViewProps) {
  const handRef = useRef<HTMLDivElement>(null)
  const overviewRef = useRef<HTMLDivElement>(null)
  const overviewPointerRef = useRef(-1)
  const gestureRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    selectedTileId: null as string | null,
    selectedAtPointerDown: false,
    moved: false,
    horizontalLocked: false,
    verticalLocked: false,
  })
  const tapRef = useRef({ tileId: null as string | null, count: 0, lastAt: 0 })
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const [selectedLift, setSelectedLift] = useState(0)
  const [discardProgress, setDiscardProgress] = useState(0)
  const [overviewWindow, setOverviewWindow] = useState({ left: 0, width: 60 })
  const drawnTile = tiles.find((tile) => tile.id === drawnTileId)
  const concealed = sortTiles(tiles.filter((tile) => tile.id !== drawnTileId))
  const displayed = drawnTile ? [...concealed, drawnTile] : concealed

  const syncOverviewWindow = () => {
    const rail = handRef.current
    if (!rail) return
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth)
    const visibleRatio = Math.min(1, rail.clientWidth / Math.max(rail.scrollWidth, 1))
    const width = visibleRatio * 100
    const left = maxScroll > 0 ? (rail.scrollLeft / maxScroll) * (100 - width) : 0
    setOverviewWindow({ left, width })
  }

  const selectRailCenterTile = () => {
    const rail = handRef.current
    if (!rail) return
    const centerX = rail.getBoundingClientRect().left + rail.clientWidth / 2
    const slots = [...rail.querySelectorAll<HTMLElement>('[data-hand-tile-id]')]
    let nearest: { id: string; distance: number } | null = null

    for (const slot of slots) {
      const rect = slot.getBoundingClientRect()
      const distance = Math.abs(centerX - (rect.left + rect.width / 2))
      if (!nearest || distance < nearest.distance) {
        nearest = { id: slot.dataset.handTileId ?? '', distance }
      }
    }

    if (nearest?.id && nearest.id !== gestureRef.current.selectedTileId) {
      gestureRef.current.selectedTileId = nearest.id
      gestureRef.current.selectedAtPointerDown = false
      tapRef.current = { tileId: null, count: 0, lastAt: 0 }
      setSelectedTileId(nearest.id)
    }
  }

  const moveRailFromOverview = (clientX: number, overview: HTMLDivElement) => {
    const rail = handRef.current
    if (!rail) return
    const rect = overview.getBoundingClientRect()
    const visibleRatio = Math.min(1, rail.clientWidth / Math.max(rail.scrollWidth, 1))
    const pointerRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const scrollRatio = visibleRatio >= 1
      ? 0
      : Math.max(0, Math.min(1, (pointerRatio - visibleRatio / 2) / (1 - visibleRatio)))
    rail.scrollLeft = scrollRatio * Math.max(0, rail.scrollWidth - rail.clientWidth)
    syncOverviewWindow()
  }

  const handleOverviewPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!window.matchMedia('(max-width: 480px)').matches) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    overviewPointerRef.current = event.pointerId
    setSelectedTileId(null)
    setSelectedLift(0)
    setDiscardProgress(0)
    tapRef.current = { tileId: null, count: 0, lastAt: 0 }
    moveRailFromOverview(event.clientX, event.currentTarget)
  }

  const handleOverviewPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (overviewPointerRef.current !== event.pointerId) return
    event.preventDefault()
    moveRailFromOverview(event.clientX, event.currentTarget)
  }

  const finishOverviewPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (overviewPointerRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    overviewPointerRef.current = -1
  }

  useEffect(() => {
    setSelectedTileId(null)
    setSelectedLift(0)
    tapRef.current = { tileId: null, count: 0, lastAt: 0 }
    const frame = window.requestAnimationFrame(() => {
      const rail = handRef.current
      if (!rail) return
      rail.scrollLeft = rail.scrollWidth - rail.clientWidth
      syncOverviewWindow()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [drawnTileId, canDiscard])

  useEffect(() => {
    if (!selectedTileId) return

    const cancelSelection = (event: globalThis.PointerEvent) => {
      if (
        handRef.current?.contains(event.target as Node)
        || overviewRef.current?.contains(event.target as Node)
      ) return
      setSelectedTileId(null)
      setSelectedLift(0)
      setDiscardProgress(0)
      tapRef.current = { tileId: null, count: 0, lastAt: 0 }
    }

    document.addEventListener('pointerdown', cancelSelection)
    return () => document.removeEventListener('pointerdown', cancelSelection)
  }, [selectedTileId])

  const handleTileClick = (tile: Tile) => {
    if (window.matchMedia('(max-width: 480px)').matches) return
    onDiscard(tile)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canDiscard || !window.matchMedia('(max-width: 480px)').matches) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const tileId = (event.target as Element)
      .closest<HTMLElement>('[data-hand-tile-id]')
      ?.dataset.handTileId
    if (!tileId) return
    const tileIndex = displayed.findIndex((tile) => tile.id === tileId)
    if (tileIndex < 0) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: event.currentTarget.scrollLeft,
      selectedTileId: tileId,
      selectedAtPointerDown: selectedTileId === tileId,
      moved: false,
      horizontalLocked: false,
      verticalLocked: false,
    }
    if (selectedTileId !== tileId) {
      tapRef.current = { tileId: null, count: 0, lastAt: 0 }
    }
    setSelectedTileId(tileId)
    setSelectedLift(0)
    setDiscardProgress(0)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (gesture.pointerId !== event.pointerId) return
    event.preventDefault()

    const horizontalDistance = event.clientX - gesture.startX
    const verticalDistance = event.clientY - gesture.startY
    const absoluteX = Math.abs(horizontalDistance)
    const absoluteY = Math.abs(verticalDistance)

    if (absoluteX > 6 || absoluteY > 6) {
      gesture.moved = true
    }

    const upwardDistance = Math.max(0, gesture.startY - event.clientY)
    if (!gesture.horizontalLocked && !gesture.verticalLocked && (absoluteX >= 8 || absoluteY >= 8)) {
      if (upwardDistance > absoluteX) {
        gesture.verticalLocked = true
      } else {
        gesture.horizontalLocked = true
      }
    }

    if (gesture.horizontalLocked) {
      event.currentTarget.scrollLeft = gesture.startScrollLeft - horizontalDistance
      setSelectedLift(0)
      setDiscardProgress(0)
      syncOverviewWindow()
      selectRailCenterTile()
      return
    }

    if (gesture.verticalLocked) {
      setSelectedLift(Math.min(upwardDistance, DISCARD_SWIPE_THRESHOLD))
      setDiscardProgress(Math.min(1, upwardDistance / DISCARD_SWIPE_THRESHOLD))
    }

    if (gesture.verticalLocked && upwardDistance >= DISCARD_SWIPE_THRESHOLD) {
      const tileToDiscard = displayed.find((tile) => tile.id === gesture.selectedTileId)
      gesture.pointerId = -1
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      setSelectedTileId(null)
      setSelectedLift(0)
      setDiscardProgress(0)
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
        setDiscardProgress(0)
        if (tileToDiscard) onDiscard(tileToDiscard)
      }
    }

    gesture.pointerId = -1
    gesture.horizontalLocked = false
    gesture.verticalLocked = false
    setSelectedLift(0)
    setDiscardProgress(0)
  }

  const cancelGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current.pointerId !== event.pointerId) return
    gestureRef.current.pointerId = -1
    gestureRef.current.horizontalLocked = false
    gestureRef.current.verticalLocked = false
    setSelectedLift(0)
    setDiscardProgress(0)
  }

  return (
    <section
      className="hand-zone"
      data-has-selected-tile={selectedTileId ? 'true' : undefined}
      data-near-discard={discardProgress >= .9 ? 'true' : undefined}
      aria-label="あなたの手牌"
      style={{
        '--selected-lift': `${selectedLift}px`,
        '--discard-progress': discardProgress,
      } as CSSProperties}
    >
      <span className="mobile-hand-guide overview-guide">全体表示・ドラッグで移動</span>
      <div
        className="mobile-hand-overview"
        aria-label="手牌全体。ドラッグで拡大位置を移動"
        ref={overviewRef}
        onPointerDown={handleOverviewPointerDown}
        onPointerMove={handleOverviewPointerMove}
        onPointerUp={finishOverviewPointer}
        onPointerCancel={finishOverviewPointer}
      >
        <span
          className="mobile-overview-window"
          aria-hidden="true"
          style={{
            left: `${overviewWindow.left}%`,
            width: `${overviewWindow.width}%`,
          }}
        />
        {displayed.map((tile) => (
          <span className="mobile-overview-slot" key={`overview-${tile.id}`}>
            <TileView
              tile={tile}
              usage="hand"
              className={tile.id === selectedTileId ? 'overview-selected' : ''}
            />
          </span>
        ))}
      </div>
      <span className="mobile-hand-guide rail-guide">拡大操作・ここを横スライド</span>
      <div className="mobile-hand-control">
        <span className="discard-threshold-guide" aria-hidden="true">
          <span className="discard-drop-zone">
            <span className="discard-drop-fill" />
            <span className="discard-drop-icon">↑</span>
            <span className="discard-drop-text">
              {discardProgress >= .9 ? '捨てる' : '上へ'}
            </span>
          </span>
        </span>
        <div
          className={`hand mobile-hand-rail ${canDiscard ? 'is-active' : ''}`}
          ref={handRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishGesture}
          onPointerCancel={cancelGesture}
          onScroll={syncOverviewWindow}
        >
          <div className="mobile-hand-track">
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
        </div>
      </div>
      <div className={`hand desktop-hand ${canDiscard ? 'is-active' : ''}`}>
        {displayed.map((tile) => (
          <span className="hand-tile-slot" key={`desktop-${tile.id}`}>
            <TileView
              tile={tile}
              usage="hand"
              className={tile.id === drawnTileId ? 'drawn' : ''}
              visualState={canDiscard ? undefined : 'static'}
              disabled={!canDiscard}
              onClick={canDiscard ? handleTileClick : undefined}
            />
          </span>
        ))}
      </div>
      <span className="hand-scroll-hint">
        {selectedTileId
          ? '下段を横スライドで選択・上スワイプ または ダブルタップで打牌'
          : '上段で全体確認・下段を横スライドして選択'}
      </span>
      {(canTsumo || canRon || showRiichiButton) && (
        <div className="hand-action-buttons">
          {canTsumo && <button className="win-button" type="button" onClick={onTsumo}>ツモ</button>}
          {canRon && <button className="win-button" type="button" onClick={onRon}>ロン</button>}
          {showRiichiButton && (
            <button
              className={[
                'riichi-button hand-riichi-button',
                riichiDeclareMode ? 'is-active' : '',
                playerRiichi ? 'is-established' : '',
              ].filter(Boolean).join(' ')}
              type="button"
              disabled={!riichiButtonEnabled}
              onClick={() => onRiichiMode(!riichiDeclareMode)}
            >
              {playerRiichi ? 'リーチ成立' : riichiDeclareMode ? 'リーチ取消' : 'リーチ宣言'}
            </button>
          )}
        </div>
      )}
      <p className="hand-hint">{hint}</p>
    </section>
  )
}
