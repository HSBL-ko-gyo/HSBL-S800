import type { Tile, YakuHint } from '../gameEngine'
import { YakuInfoCard } from './YakuInfoCard'

interface YakuInfoPanelProps {
  hints: YakuHint[]
  hand: Tile[]
}

export function YakuInfoPanel({ hints, hand }: YakuInfoPanelProps) {
  const priority: YakuHint[] = ['役牌候補', '混一色気味', '七対子候補', '一気通貫候補', '三色同順候補', '平和寄り', '断么九']
  const sortedHints = hints
    .filter((hint) => !hint.includes('リーチ'))
    .sort((a, b) => priority.indexOf(a) - priority.indexOf(b))
  const directionHint = sortedHints.find((hint) => hint.includes('寄り') || hint.includes('気味'))
  const displayedHints = [...new Set([
    ...sortedHints.slice(0, 1),
    ...(directionHint ? [directionHint] : []),
  ])]
    .slice(0, 2)
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
