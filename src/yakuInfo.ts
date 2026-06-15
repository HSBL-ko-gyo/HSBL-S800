import { tileName, type Tile, type TileCode, type YakuHint } from './gameEngine'

export interface YakuExampleRow {
  label: string
  tone?: 'ok' | 'ng' | 'neutral'
  groups: TileCode[][]
  suffix?: string
}

export interface YakuInfoDefinition {
  name: string
  reading: string
  description: string
  condition: string
  examples: YakuExampleRow[]
}

export const YAKU_INFO: Record<YakuHint, YakuInfoDefinition> = {
  '断么九': {
    name: '断么九候補',
    reading: 'タンヤオこうほ',
    description: '2〜8の数牌だけで作る役。',
    condition: '1・9・字牌を使わない。',
    examples: [
      { label: 'OK', tone: 'ok', groups: [['2m'], ['5p'], ['8s']] },
      { label: 'NG', tone: 'ng', groups: [['1m'], ['9s'], ['E']] },
    ],
  },
  '役牌候補': {
    name: '役牌候補',
    reading: 'ヤクハイこうほ',
    description: '白・發・中、場風や自風を3枚集める役。',
    condition: '対象の字牌を刻子にする。',
    examples: [
      { label: 'あと1枚', tone: 'ok', groups: [['F', 'F']], suffix: '→ 發で刻子' },
    ],
  },
  '七対子候補': {
    name: '七対子候補',
    reading: 'チートイツこうほ',
    description: '同じ牌のペアを7組作る役。',
    condition: '異なる7種類を2枚ずつそろえる。',
    examples: [
      { label: 'ペア', groups: [['5p', '5p'], ['E', 'E'], ['9m', '9m']] },
    ],
  },
  '混一色気味': {
    name: '混一色候補',
    reading: 'ホンイツこうほ',
    description: '1種類の数牌と字牌だけで作る役。',
    condition: '他の2種類の数牌を手放す。',
    examples: [
      { label: 'OK', tone: 'ok', groups: [['2s'], ['6s'], ['E'], ['C']] },
      { label: 'NG', tone: 'ng', groups: [['5m'], ['3p']] },
    ],
  },
  '一気通貫候補': {
    name: '一気通貫候補',
    reading: 'イッツーこうほ',
    description: '同じ色で123・456・789をそろえる役。',
    condition: '3つの順子を同一色で完成させる。',
    examples: [
      { label: '萬子', groups: [['1m', '2m', '3m'], ['4m', '5m', '6m'], ['7m', '8m', '9m']] },
    ],
  },
  '三色同順候補': {
    name: '三色同順候補',
    reading: 'サンショクこうほ',
    description: '萬子・筒子・索子で同じ順子を作る役。',
    condition: '同じ数字並びを3色でそろえる。',
    examples: [
      { label: '345', groups: [['3m', '4m', '5m'], ['3p', '4p', '5p'], ['3s', '4s', '5s']] },
    ],
  },
  '平和寄り': {
    name: '平和候補',
    reading: 'ピンフこうほ',
    description: '順子4つと雀頭で作る、順子中心の役。',
    condition: '役牌でない雀頭と両面待ちが基本。',
    examples: [
      { label: '順子', groups: [['3m', '4m', '5m']] },
      { label: '両面', tone: 'ok', groups: [['6p', '7p']], suffix: '→ 5筒 / 8筒' },
    ],
  },
}

function countsFromHand(hand: Tile[]): Map<TileCode, number> {
  const counts = new Map<TileCode, number>()
  for (const tile of hand) counts.set(tile.code, (counts.get(tile.code) ?? 0) + 1)
  return counts
}

export function getYakuCurrentReason(hint: YakuHint, hand: Tile[]): string {
  const counts = countsFromHand(hand)
  const codes = hand.map((tile) => tile.code)
  if (hint === '断么九') {
    const blockers = codes.filter((code) => code.length === 1 || code[0] === '1' || code[0] === '9').length
    return `現在: 端牌・字牌が${blockers}枚と少ないため候補。`
  }
  if (hint === '役牌候補') {
    const honor = (['E', 'S', 'W', 'N', 'P', 'F', 'C'] as TileCode[])
      .find((code) => (counts.get(code) ?? 0) >= 2)
    return `現在: ${honor ? `${tileName(honor)}が対子以上` : '字牌の対子'}なので候補。`
  }
  if (hint === '七対子候補') {
    const pairs = [...counts.values()].filter((count) => count >= 2).length
    return `現在: 対子が${pairs}組あるので候補。`
  }
  if (hint === '混一色気味') {
    const suits = ['m', 'p', 's'].map((suit) => codes.filter((code) => code.length === 2 && code[1] === suit).length)
    const dominant = suits.indexOf(Math.max(...suits))
    return `現在: ${['萬子', '筒子', '索子'][dominant]}と字牌に寄っているので候補。`
  }
  if (hint === '一気通貫候補') return '現在: 同じ色に123・456・789の材料が見えています。'
  if (hint === '三色同順候補') return '現在: 同じ数字並びが複数の色でつながっています。'
  return '現在: 順子候補が多く、刻子候補が少ない形です。'
}
