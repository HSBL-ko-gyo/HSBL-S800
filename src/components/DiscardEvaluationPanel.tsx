import { shantenLabel, tileName, type DiscardEvaluation } from '../gameEngine'
import { TileView } from './TileView'

interface DiscardEvaluationPanelProps {
  evaluation: DiscardEvaluation | null
}

export function DiscardEvaluationPanel({ evaluation }: DiscardEvaluationPanelProps) {
  if (!evaluation) {
    return (
      <section className="evaluation-card is-empty">
        <span className="learning-label">打牌評価</span>
        <p>打牌後に、候補内での評価を答え合わせできます。</p>
      </section>
    )
  }

  const bestNames = [...new Set(evaluation.bestDiscards.map((tile) => tileName(tile.code)))].join(' / ')

  return (
    <section className={`evaluation-card grade-${evaluation.grade}`} aria-live="polite">
      <div className="evaluation-heading">
        <div>
          <span className="learning-label">打牌評価</span>
          <strong className="evaluation-grade">{evaluation.summary}</strong>
        </div>
        <TileView tile={evaluation.discard} usage="mini" />
      </div>
      <div className="evaluation-meta">
        <span>候補内 <b>{evaluation.rank}位 / {evaluation.optionCount}候補</b></span>
        <span>最善候補: <b>{bestNames}</b></span>
      </div>
      <div className="evaluation-deltas">
        <span>シャンテン: <b>{evaluation.shantenDifference > 0 ? `+${evaluation.shantenDifference}` : '維持'}</b></span>
        <span>受け入れ差: <b>{evaluation.improvementTileDifference === null ? '比較対象外' : `${evaluation.improvementTileDifference}枚`}</b></span>
        <span>結果: <b>{shantenLabel(evaluation.shanten)} / {evaluation.improvementTypeCount}種{evaluation.improvementTileCount}枚</b></span>
      </div>
      {evaluation.riichiEstablished && <p className="evaluation-riichi declared">リーチ宣言</p>}
      {!evaluation.riichiEstablished && evaluation.missedRiichiOpportunity && (
        <p className="evaluation-riichi missed">リーチ可能だった</p>
      )}
      <p>{evaluation.detail}</p>
    </section>
  )
}
