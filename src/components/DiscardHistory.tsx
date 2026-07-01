import { createTile, shantenLabel, tileName, type DiscardLog } from '../gameEngine'
import { TileView } from './TileView'

interface DiscardHistoryProps {
  logs: DiscardLog[]
}

function uniqueTileCodes(codes: DiscardLog['bestDiscards']): DiscardLog['bestDiscards'] {
  return [...new Set(codes)]
}

function uniqueTileText(codes: DiscardLog['bestDiscards']): string {
  return uniqueTileCodes(codes).map(tileName).join(' / ')
}

function TileCodeRow({ codes, idPrefix }: { codes: DiscardLog['bestDiscards']; idPrefix: string }) {
  return (
    <div className="history-tile-row">
      {uniqueTileCodes(codes).map((code, index) => (
        <TileView key={`${idPrefix}-${code}-${index}`} tile={createTile(code, `${idPrefix}-${code}-${index}`)} usage="mini" />
      ))}
    </div>
  )
}

function findReviewTarget(logs: DiscardLog[]): DiscardLog | null {
  return logs.find((log) => log.defenseWarningLevel === 'scold')
    ?? logs.find((log) => log.defenseWarningLevel === 'caution')
    ?? logs.find((log) => log.whatToDiscardGrade === 'offPlan')
    ?? null
}

export function DiscardHistory({ logs }: DiscardHistoryProps) {
  const reviewTarget = findReviewTarget(logs)
  const reviewText = reviewTarget
    ? reviewTarget.defenseWarning
      ?? `${reviewTarget.turn}巡目は${uniqueTileText(reviewTarget.bestDiscards)}を切っておきたかった場面です。実戦で迷ったら、まず「余っている牌」と「安全そうな牌」を見比べましょう。`
    : null

  return (
    <section className="discard-history">
      <h3>自分の打牌履歴</h3>
      {logs.length === 0
        ? <p className="history-empty">打牌履歴はありません。</p>
        : (
          <>
            {reviewText && (
              <div className={`history-review ${reviewTarget?.defenseWarningLevel === 'scold' ? 'is-scold' : ''}`}>
                <strong>終局メモ</strong>
                {reviewTarget && (
                  <div className="history-review-targets">
                    <span>{reviewTarget.defenseWarning ? '守るなら' : 'これを切る'}</span>
                    <TileCodeRow
                      codes={reviewTarget.defenseWarning
                        ? reviewTarget.defenseAlternativeDiscards
                        : reviewTarget.bestDiscards}
                      idPrefix={`review-${reviewTarget.turn}`}
                    />
                  </div>
                )}
                <p>{reviewText}</p>
              </div>
            )}
            <ol>
              {logs.map((log) => (
                <li key={log.turn} className={log.defenseWarningLevel !== 'none' ? 'has-defense-warning' : ''}>
                  <div className="history-title">
                    <b>{log.turn}巡目 {tileName(log.discardedTile)}切り</b>
                    <span>山 {log.wallRemaining}枚</span>
                  </div>
                  <p>{shantenLabel(log.shanten)} / 受け入れ {log.improvementTypeCount}種{log.improvementTileCount}枚</p>
                  <div className="history-discard-answer">
                    <span>何切るなら</span>
                    <TileCodeRow codes={log.bestDiscards} idPrefix={`best-${log.turn}`} />
                    <b>{log.whatToDiscardLabel}</b>
                  </div>
                  <p>ツモ: {log.drawnTile ? tileName(log.drawnTile) : 'なし'} / 手牌: {log.hand.map(tileName).join(' ')}</p>
                  {log.yakuHints.length > 0 && <p>役候補: {log.yakuHints.join('・')}</p>}
                  <p>{log.explanation}</p>
                  {log.defenseWarning && log.defenseAlternativeDiscards.length > 0 && (
                    <div className="history-discard-answer is-defense">
                      <span>守るなら</span>
                      <TileCodeRow codes={log.defenseAlternativeDiscards} idPrefix={`safe-${log.turn}`} />
                    </div>
                  )}
                  {log.defenseWarning && <p className="history-defense-warning">{log.defenseWarning}</p>}
                  {log.attackDefenseGood && <p className="history-defense-good">{log.attackDefenseGood}</p>}
                  {(log.declaredRiichi || log.riichiEstablished) && <span className="history-flag">リーチ宣言</span>}
                  {!log.declaredRiichi && !log.riichiEstablished && log.wasRiichiPossible && (
                    <span className="history-flag missed">リーチ可能だった</span>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
    </section>
  )
}
