import type { Tile, YakuHint } from '../gameEngine'
import { YakuInfoCard } from './YakuInfoCard'

interface YakuInfoPanelProps {
  hints: YakuHint[]
  hand: Tile[]
}

export function YakuInfoPanel({ hints, hand }: YakuInfoPanelProps) {
  const displayedHints = hints.filter((hint) => !hint.includes('リーチ')).slice(0, 2)
  if (displayedHints.length === 0) return null

  return (
    <section className="yaku-info-panel">
      <span className="learning-label">役メモ</span>
      <div className="yaku-info-grid">
        {displayedHints.map((hint) => <YakuInfoCard hint={hint} hand={hand} key={hint} />)}
      </div>
    </section>
  )
}
