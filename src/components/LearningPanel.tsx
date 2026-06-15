import { useState } from 'react'
import { shantenLabel, type DiscardEvaluation, type ImprovementTile, type Tile, type YakuHint } from '../gameEngine'
import { DiscardEvaluationPanel } from './DiscardEvaluationPanel'
import { HandPlanPanel } from './HandPlanPanel'
import { RiichiWaitPanel } from './RiichiWaitPanel'
import { YakuInfoPanel } from './YakuInfoPanel'
import type { HandPlanAdvice } from '../gameEngine'

interface LearningPanelProps {
  shanten: number
  improvementTypeCount: number
  improvementTileCount: number
  yakuHints: YakuHint[]
  handPlan: HandPlanAdvice
  hand: Tile[]
  evaluation: DiscardEvaluation | null
  riichiWaits: ImprovementTile[]
  feedback: string | null
  showRiichiButton: boolean
  riichiButtonEnabled: boolean
  playerRiichi: boolean
  riichiDeclareMode: boolean
  onRiichiMode: (enabled: boolean) => void
}

export function LearningPanel({
  shanten,
  improvementTypeCount,
  improvementTileCount,
  yakuHints,
  handPlan,
  hand,
  evaluation,
  riichiWaits,
  feedback,
  showRiichiButton,
  riichiButtonEnabled,
  playerRiichi,
  riichiDeclareMode,
  onRiichiMode,
}: LearningPanelProps) {
  const [metricsHidden, setMetricsHidden] = useState(false)

  return (
    <aside className="learning-panel">
      <DiscardEvaluationPanel evaluation={evaluation} />

      <div className="learning-metrics">
        <button
          className="metric-privacy-toggle"
          type="button"
          aria-pressed={metricsHidden}
          aria-label={metricsHidden ? 'シャンテン数と受け入れを表示する' : 'シャンテン数と受け入れを隠す'}
          onClick={() => setMetricsHidden((hidden) => !hidden)}
        >
          <span className="metric-chip">現在: <b>{metricsHidden ? '---' : shantenLabel(shanten)}</b></span>
          <span className="metric-chip">受け入れ: <b>{metricsHidden ? '---' : `${improvementTypeCount}種${improvementTileCount}枚`}</b></span>
          <span className="metric-privacy-icon" aria-hidden="true">
            {metricsHidden ? (
              <svg viewBox="0 0 24 24" role="img">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.4 5.4A9.8 9.8 0 0 1 12 5c5.2 0 8.5 4.4 9.4 6.1a1.8 1.8 0 0 1 0 1.8 12.6 12.6 0 0 1-2.1 2.7" />
                <path d="M6.4 6.7a12.6 12.6 0 0 0-3.8 4.4 1.8 1.8 0 0 0 0 1.8C3.5 14.6 6.8 19 12 19a9.7 9.7 0 0 0 4.1-.9" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" role="img">
                <path d="M2.6 11.1C3.5 9.4 6.8 5 12 5s8.5 4.4 9.4 6.1a1.8 1.8 0 0 1 0 1.8C20.5 14.6 17.2 19 12 19s-8.5-4.4-9.4-6.1a1.8 1.8 0 0 1 0-1.8Z" />
                <circle cx="12" cy="12" r="2.7" />
              </svg>
            )}
          </span>
        </button>
      </div>

      <HandPlanPanel advice={handPlan} />
      <RiichiWaitPanel waits={riichiWaits} />

      <section className="yaku-hints">
        <span className="learning-label">狙える役</span>
        <div className="hint-chips">
          {yakuHints.length > 0
            ? yakuHints.map((hint) => <span className="hint-chip" key={hint}>{hint}</span>)
            : <span className="hint-empty">まだ形を探しているところ</span>}
        </div>
      </section>

      <YakuInfoPanel hints={yakuHints} hand={hand} />

      {feedback && <p className="feedback-message" role="status">{feedback}</p>}

      <div className="action-buttons">
        {showRiichiButton && (
          <button
            className={[
              'riichi-button',
              riichiDeclareMode ? 'is-active' : '',
              playerRiichi ? 'is-established' : '',
            ].filter(Boolean).join(' ')}
            type="button"
            disabled={!riichiButtonEnabled}
            onClick={() => onRiichiMode(!riichiDeclareMode)}
          >
            {playerRiichi ? 'リーチ成立' : riichiDeclareMode ? 'リーチ宣言をやめる' : 'リーチ宣言'}
          </button>
        )}
      </div>
    </aside>
  )
}
