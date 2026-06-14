import { tileName, type ImprovementTile } from '../gameEngine'
import { createTile } from '../gameEngine'
import { TileView } from './TileView'

interface RiichiWaitPanelProps {
  waits: ImprovementTile[]
}

export function RiichiWaitPanel({ waits }: RiichiWaitPanelProps) {
  if (waits.length === 0) return null

  return (
    <section className="riichi-wait-panel" aria-label="リーチ待ち牌答え合わせ">
      <span className="learning-label">待ち牌答え合わせ</span>
      <div className="riichi-wait-list">
        {waits.map((wait) => (
          <div className="riichi-wait-item" key={wait.code}>
            <TileView tile={createTile(wait.code, `wait-${wait.code}`)} usage="mini" />
            <span>{tileName(wait.code)} 残り<b>{wait.remaining}</b>枚</span>
          </div>
        ))}
      </div>
    </section>
  )
}
