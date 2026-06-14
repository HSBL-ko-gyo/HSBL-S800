import { shantenLabel, type DiscardExplanation, type YakuHint } from '../gameEngine'
import { DiscardExplanationPanel } from './DiscardExplanationPanel'

interface LearningPanelProps {
  shanten: number
  improvementTypeCount: number
  improvementTileCount: number
  yakuHints: YakuHint[]
  explanation: DiscardExplanation | null
  feedback: string | null
  showRiichiButton: boolean
  riichiDeclareMode: boolean
  canTsumo: boolean
  canRon: boolean
  onRiichiMode: (enabled: boolean) => void
  onTsumo: () => void
  onRon: () => void
}

export function LearningPanel({
  shanten,
  improvementTypeCount,
  improvementTileCount,
  yakuHints,
  explanation,
  feedback,
  showRiichiButton,
  riichiDeclareMode,
  canTsumo,
  canRon,
  onRiichiMode,
  onTsumo,
  onRon,
}: LearningPanelProps) {
  return (
    <aside className="learning-panel">
      <div className="learning-metrics">
        <span>現在: <b>{shantenLabel(shanten)}</b></span>
        <span>受け入れ: <b>{improvementTypeCount}種{improvementTileCount}枚</b></span>
      </div>

      <section className="yaku-hints">
        <span className="learning-label">狙える役</span>
        <div className="hint-chips">
          {yakuHints.length > 0
            ? yakuHints.map((hint) => <span className="hint-chip" key={hint}>{hint}</span>)
            : <span className="hint-empty">まだ形を探しているところ</span>}
        </div>
      </section>

      <DiscardExplanationPanel explanation={explanation} />

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
        {canTsumo && <button className="win-button" type="button" onClick={onTsumo}>ツモ</button>}
        {canRon && <button className="win-button" type="button" onClick={onRon}>ロン</button>}
      </div>
    </aside>
  )
}
