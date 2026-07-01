import { createTile, tileName, type DiscardLog, type TileCode } from '../gameEngine'
import { TileView } from './TileView'

interface DefenseMiniWindowProps {
  log: DiscardLog | null
  className?: string
}

function TileCodeMiniRow({ codes, idPrefix, limit = 1 }: { codes: TileCode[]; idPrefix: string; limit?: number }) {
  return (
    <div className="mini-tile-strip">
      {[...new Set(codes)].slice(0, limit).map((code, index) => (
        <span className="mini-tile-choice" key={`${idPrefix}-${code}-${index}`}>
          <TileView tile={createTile(code, `${idPrefix}-${code}-${index}`)} usage="mini" />
          <em>{tileName(code)}</em>
        </span>
      ))}
    </div>
  )
}

export function DefenseMiniWindow({ log, className = '' }: DefenseMiniWindowProps) {
  if (!log) return null

  return (
    <aside
      className={[
        'defense-mini-window',
        log.defenseWarningLevel === 'scold' ? 'is-scold' : '',
        log.attackDefenseGood ? 'is-good' : '',
        className,
      ].filter(Boolean).join(' ')}
      aria-live="polite"
    >
      <div>
        <span>今切った</span>
        <TileCodeMiniRow codes={[log.discardedTile]} idPrefix={`danger-${log.turn}`} />
        <b>{log.attackDefenseGood ? '攻守OK' : log.defenseWarningLevel === 'scold' ? '危険' : '注意'}</b>
      </div>
      {!log.attackDefenseGood && log.defenseAlternativeDiscards.length > 0 && (
        <div>
          <span>守るなら</span>
          <TileCodeMiniRow codes={log.defenseAlternativeDiscards} idPrefix={`defense-${log.turn}`} />
        </div>
      )}
    </aside>
  )
}
