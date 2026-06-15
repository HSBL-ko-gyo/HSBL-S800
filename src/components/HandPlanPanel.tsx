import type { HandPlanAdvice } from '../gameEngine'

interface HandPlanPanelProps {
  advice: HandPlanAdvice
}

export function HandPlanPanel({ advice }: HandPlanPanelProps) {
  return (
    <section className={`hand-plan-card hand-plan-${advice.kind}`} aria-live="polite">
      <span className="learning-label">打牌前の注意点</span>
      <strong>{advice.label}</strong>
      <p className="hand-plan-reason">{advice.reason}</p>
      <p>{advice.stance}</p>
      <p className="hand-plan-action">{advice.action}</p>
    </section>
  )
}
