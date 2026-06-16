import { shantenLabel, type DiscardEvaluation } from '../gameEngine'

interface DiscardInsightPanelProps {
  evaluation: DiscardEvaluation | null
}

export function DiscardInsightPanel({ evaluation }: DiscardInsightPanelProps) {
  if (!evaluation) return null

  return (
    <section className="discard-insight-card">
      <span className="learning-label">打牌メモ</span>
      <p>{evaluation.tableInsight}</p>
      <p className="beginner-advice"><b>初心者メモ</b>{evaluation.beginnerAdvice}</p>
      <div className="insight-meta">
        <span>{shantenLabel(evaluation.shanten)}</span>
        <span>{evaluation.improvementTypeCount}種{evaluation.improvementTileCount}枚</span>
        <span>
          {evaluation.improvementTileDifference === null
            ? '比較は形重視'
            : `おすすめとの差 ${evaluation.improvementTileDifference}枚`}
        </span>
      </div>
    </section>
  )
}
