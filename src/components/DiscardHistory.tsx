import { shantenLabel, tileName, type DiscardLog } from '../gameEngine'

interface DiscardHistoryProps {
  logs: DiscardLog[]
}

export function DiscardHistory({ logs }: DiscardHistoryProps) {
  return (
    <section className="discard-history">
      <h3>自分の打牌履歴</h3>
      {logs.length === 0
        ? <p className="history-empty">打牌履歴はありません。</p>
        : (
          <ol>
            {logs.map((log) => (
              <li key={log.turn}>
                <div className="history-title">
                  <b>{log.turn}巡目 {tileName(log.discardedTile)}切り</b>
                  <span>山 {log.wallRemaining}枚</span>
                </div>
                <p>{shantenLabel(log.shanten)} / 受け入れ {log.improvementTypeCount}種{log.improvementTileCount}枚</p>
                <p>ツモ: {log.drawnTile ? tileName(log.drawnTile) : 'なし'} / 手牌: {log.hand.map(tileName).join(' ')}</p>
                {log.yakuHints.length > 0 && <p>役候補: {log.yakuHints.join('・')}</p>}
                <p>{log.explanation}</p>
                {log.declaredRiichi && <span className="history-flag">リーチ宣言</span>}
                {!log.declaredRiichi && log.wasRiichiPossible && <span className="history-flag missed">リーチ可能だった</span>}
              </li>
            ))}
          </ol>
        )}
    </section>
  )
}
