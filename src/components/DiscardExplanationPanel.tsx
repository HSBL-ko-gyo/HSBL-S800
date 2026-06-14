import type { DiscardExplanation } from '../gameEngine'
import { TileView } from './TileView'

interface DiscardExplanationPanelProps {
  explanation: DiscardExplanation | null
}

export function DiscardExplanationPanel({ explanation }: DiscardExplanationPanelProps) {
  if (!explanation) {
    return (
      <section className="explanation-card is-empty">
        <span className="learning-label">直近の打牌</span>
        <p>打牌すると、シャンテン数と受け入れをここで振り返れます。</p>
      </section>
    )
  }

  return (
    <section className="explanation-card" aria-live="polite">
      <div className="explanation-heading">
        <div>
          <span className="learning-label">何切る解説</span>
          <strong>{explanation.summary}</strong>
        </div>
        <TileView tile={explanation.discard} mini />
      </div>
      <p>{explanation.detail}</p>
    </section>
  )
}
