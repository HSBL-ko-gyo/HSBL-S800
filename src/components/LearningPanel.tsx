import { shantenLabel, type DiscardEvaluation, type ImprovementTile, type Tile, type YakuHint } from '../gameEngine'
import { DiscardEvaluationPanel } from './DiscardEvaluationPanel'
import { RiichiWaitPanel } from './RiichiWaitPanel'
import { YakuInfoPanel } from './YakuInfoPanel'

interface LearningPanelProps {
  shanten: number
  improvementTypeCount: number
  improvementTileCount: number
  yakuHints: YakuHint[]
  hand: Tile[]
  evaluation: DiscardEvaluation | null
  riichiWaits: ImprovementTile[]
  feedback: string | null
  showRiichiButton: boolean
  riichiDeclareMode: boolean
  onRiichiMode: (enabled: boolean) => void
}

export function LearningPanel({
  shanten,
  improvementTypeCount,
  improvementTileCount,
  yakuHints,
  hand,
  evaluation,
  riichiWaits,
  feedback,
  showRiichiButton,
  riichiDeclareMode,
  onRiichiMode,
}: LearningPanelProps) {
  return (
    <aside className="learning-panel">
      <div className="learning-metrics">
        <span>現在: <b>{shantenLabel(shanten)}</b></span>
        <span>受け入れ: <b>{improvementTypeCount}種{improvementTileCount}枚</b></span>
      </div>

      <DiscardEvaluationPanel evaluation={evaluation} />
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
            className={`riichi-button ${riichiDeclareMode ? 'is-active' : ''}`}
            type="button"
            onClick={() => onRiichiMode(!riichiDeclareMode)}
          >
            {riichiDeclareMode ? 'リーチ宣言をやめる' : 'リーチ宣言'}
          </button>
        )}
      </div>
    </aside>
  )
}
