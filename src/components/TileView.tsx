import type { Tile, TileCode } from '../gameEngine'
import { tileName } from '../gameEngine'

const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const NUMBER_READINGS = ['', 'イー', 'リャン', 'サン', 'スー', 'ウー', 'ロー', 'チー', 'パー', 'キュウ']
const HONORS: Partial<Record<TileCode, string>> = {
  E: '東', S: '南', W: '西', N: '北', F: '發', C: '中',
}
const HONOR_READINGS: Partial<Record<TileCode, string>> = {
  E: 'トン', S: 'ナン', W: 'シャー', N: 'ペー', P: 'ハク', F: 'ハツ', C: 'チュン',
}
const SUIT_READINGS: Record<string, string> = {
  m: 'マン',
  p: 'ピン',
  s: 'ソウ',
}

export type TileVisualState = 'picked-right' | 'picked-wrong' | 'dim' | 'static'

interface TileViewProps {
  tile: Tile
  usage?: 'hand' | 'river' | 'mini' | 'tiny'
  visualState?: TileVisualState
  className?: string
  disabled?: boolean
  onClick?: (tile: Tile) => void
}

function tileContent(code: TileCode) {
  const honorReading = HONOR_READINGS[code]
  const reading = honorReading
    ? <span className="tile-reading" aria-hidden="true">{honorReading}</span>
    : null

  if (code === 'P') return <>{reading}<span className="haku" /></>

  const honor = HONORS[code]
  if (honor) {
    const colorClass = code === 'C' ? 'chun' : code === 'F' ? 'hatsu' : ''
    return <>{reading}<span className={`honor ${colorClass}`}>{honor}</span></>
  }

  const number = Number(code[0])
  const suit = code[1]
  const numberReading = <span className="tile-reading" aria-hidden="true">{NUMBER_READINGS[number]}</span>
  const suitReading = <span className="tile-suit-reading" aria-hidden="true">{SUIT_READINGS[suit]}</span>
  if (suit === 'm') {
    return <>{numberReading}<span className="num">{KANJI[number]}</span><span className="suit">萬</span>{suitReading}</>
  }
  if (suit === 'p') {
    return <>{numberReading}<span className="num">{number}</span><span className="suit">筒</span>{suitReading}</>
  }
  return <>{numberReading}<span className="num">{number}</span><span className="suit">索</span>{suitReading}</>
}

export function TileView({
  tile,
  usage,
  visualState,
  className = '',
  disabled = false,
  onClick,
}: TileViewProps) {
  const suitClass = tile.code.length === 2
    ? tile.code[1] === 'm' ? 'man' : tile.code[1] === 'p' ? 'pin' : 'sou'
    : ''
  const isInteractive = Boolean(onClick) && !disabled
  const classes = ['tile', suitClass, usage ?? '', visualState ?? '', className]
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
