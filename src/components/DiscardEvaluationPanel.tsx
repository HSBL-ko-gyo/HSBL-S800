import { tileName, type DiscardEvaluation } from '../gameEngine'
import { TileView } from './TileView'

interface DiscardEvaluationPanelProps {
  evaluation: DiscardEvaluation | null
}

export function DiscardEvaluationPanel({ evaluation }: DiscardEvaluationPanelProps) {
  if (!evaluation) {
    return (
      <section className="evaluation-card is-empty">
        <span className="learning-label">何切る</span>
        <p>打牌後に、何切るとしてのおすすめを軽く確認できます。</p>
      </section>
    )
  }

  const bestNames = [...new Set(evaluation.bestDiscards.map((tile) => tileName(tile.code)))].join(' / ')

  return (
    <section className={`evaluation-card recommendation-${evaluation.whatToDiscardGrade}`} aria-live="polite">
      <div className="evaluation-heading">
        <div>
          <span className="learning-label">何切る</span>
          <strong className="evaluation-grade">{evaluation.summary}</strong>
        </div>
        <TileView tile={evaluation.discard} usage="mini" />
      </div>
      <div className="evaluation-meta">
        <span>おすすめ <b>{bestNames}</b></span>
        <span>今の選択 <b>{evaluation.whatToDiscardLabel}</b></span>
      </div>
      {evaluation.riichiEstablished && <p className="evaluation-riichi declared">リーチ宣言</p>}
      {!evaluation.riichiEstablished && evaluation.missedRiichiOpportunity && (
        <p className="evaluation-riichi missed">リーチ可能だった</p>
      )}
      <p>{evaluation.whatToDiscardDetail}</p>
    </section>
  )
}
