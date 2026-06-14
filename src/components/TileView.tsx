import type { Tile, TileCode } from '../gameEngine'
import { tileName } from '../gameEngine'

const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const HONORS: Partial<Record<TileCode, string>> = {
  E: '東', S: '南', W: '西', N: '北', F: '發', C: '中',
}

export type TileVisualState = 'picked-right' | 'picked-wrong' | 'dim' | 'static'

interface TileViewProps {
  tile: Tile
  mini?: boolean
  tiny?: boolean
  visualState?: TileVisualState
  className?: string
  disabled?: boolean
  onClick?: (tile: Tile) => void
}

function tileContent(code: TileCode) {
  if (code === 'P') return <span className="haku" />

  const honor = HONORS[code]
  if (honor) {
    const colorClass = code === 'C' ? 'chun' : code === 'F' ? 'hatsu' : ''
    return <span className={`honor ${colorClass}`}>{honor}</span>
  }

  const number = Number(code[0])
  const suit = code[1]
  if (suit === 'm') {
    return <><span className="num">{KANJI[number]}</span><span className="suit">萬</span></>
  }
  if (suit === 'p') {
    return <><span className="num">{number}</span><span className="suit">筒</span></>
  }
  return <><span className="num">{number}</span><span className="suit">索</span></>
}

export function TileView({
  tile,
  mini = false,
  tiny = false,
  visualState,
  className = '',
  disabled = false,
  onClick,
}: TileViewProps) {
  const suitClass = tile.code.length === 2
    ? tile.code[1] === 'm' ? 'man' : tile.code[1] === 'p' ? 'pin' : 'sou'
    : ''
  const isInteractive = Boolean(onClick) && !disabled
  const classes = ['tile', suitClass, mini ? 'mini' : '', tiny ? 'tiny' : '', visualState ?? '', className]
    .filter(Boolean)
    .join(' ')
  const label = `${tileName(tile.code)}を切る`

  if (isInteractive) {
    return (
      <button className={classes} type="button" aria-label={label} onClick={() => onClick?.(tile)}>
        {tileContent(tile.code)}
      </button>
    )
  }

  return (
    <span className={`${classes} static`} aria-label={tileName(tile.code)} role="img">
      {tileContent(tile.code)}
    </span>
  )
}
