export const SUIT_CODES = [
  '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m',
  '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p',
  '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s',
] as const

export const HONOR_CODES = ['E', 'S', 'W', 'N', 'P', 'F', 'C'] as const
export const TILE_CODES = [...SUIT_CODES, ...HONOR_CODES] as const

export type TileCode = (typeof TILE_CODES)[number]
export type Wind = '東' | '南' | '西' | '北'
export type YakuHint = '断么九' | '平和寄り' | '役牌候補' | '七対子候補' | '混一色気味' | '一気通貫候補' | '三色同順候補'

export interface Tile {
  id: string
  code: TileCode
}

export type PlayerId = 0 | 1 | 2 | 3
export type CallType = 'ron' | 'pon' | 'chi' | 'kan'
export type MeldType = 'pon' | 'chi' | 'kan'
export type GamePhase =
  | 'player_draw'
  | 'player_discard'
  | 'enemy_auto'
  | 'reaction_review'
  | 'declare_reaction'
  | 'win'
  | 'draw'

export interface Meld {
  type: MeldType
  tiles: Tile[]
  calledTile: Tile
  from: PlayerId
}

export interface DiscardRecord {
  id: string
  tile: Tile
  actor: PlayerId
  calledBy?: PlayerId
  callType?: CallType
}

export interface PlayerState {
  name: string
  wind: Wind
  hand: Tile[]
  river: DiscardRecord[]
  melds: Meld[]
  isRiichi: boolean
}

export interface ImprovementTile {
  code: TileCode
  remaining: number
}

export interface DiscardOptionAnalysis {
  discard: Tile
  shanten: number
  improvementTiles: ImprovementTile[]
  improvementTypeCount: number
  improvementTileCount: number
  yakuHints: YakuHint[]
  canRiichi: boolean
  goodShapeCount: number
  structureScore: number
  isolatedDiscard: boolean
  evaluationScore: number
  rank: number
  optionCount: number
  postHand: Tile[]
}

export type DiscardGrade = 'best' | 'good' | 'compromise' | 'bad'

export interface DiscardEvaluation {
  discard: Tile
  grade: DiscardGrade
  gradeLabel: string
  shanten: number
  bestShanten: number
  shantenDifference: number
  improvementTypeCount: number
  improvementTileCount: number
  bestImprovementTileCount: number
  improvementTileDifference: number | null
  rank: number
  optionCount: number
  bestDiscards: Tile[]
  canRiichi: boolean
  declaredRiichi: boolean
  riichiEstablished: boolean
  missedRiichiOpportunity: boolean
  summary: string
  detail: string
}

export interface DiscardLog {
  turn: number
  hand: TileCode[]
  drawnTile: TileCode | null
  discardedTile: TileCode
  wallRemaining: number
  shanten: number
  improvementTypeCount: number
  improvementTileCount: number
  yakuHints: YakuHint[]
  wasRiichiPossible: boolean
  declaredRiichi: boolean
  riichiEstablished: boolean
  explanation: string
}

export interface ScoreYaku {
  name: string
  han: number
}

export interface RoundScore {
  winType: 'tsumo' | 'ron'
  han: number
  fu: number
  basePoints: number
  totalPoints: number
  limitName: string | null
  dealer: boolean
  paymentText: string
  yaku: ScoreYaku[]
  note: string
}

export type HandPlanKind = 'push' | 'fast' | 'value' | 'patient'

export interface HandPlanAdvice {
  kind: HandPlanKind
  label: string
  stance: string
  reason: string
  action: string
  shanten: number
  improvementTypeCount: number
  improvementTileCount: number
  playerTurn: number
  yakuHints: YakuHint[]
}

export interface RollbackSnapshot {
  players: PlayerState[]
  wall: Tile[]
  currentPlayer: PlayerId
  phase: GamePhase
  awaitingDiscard: boolean
  drawnTileId: string | null
  turnNumber: number
  lastDiscard: { playerIndex: number; tileId: string } | null
}

export interface ReactionEvent {
  id: string
  actor: PlayerId
  tile: Tile
  riverDiscardId: string
  turnIndex: number
  canRon: boolean
  canPon: boolean
  canChi: boolean
  snapshot: RollbackSnapshot
}

export interface CallLog {
  turnIndex: number
  type: 'ron' | 'pon' | 'chi'
  targetTile: Tile
  targetPlayer: PlayerId
  success: boolean
  reason?: string
}

export interface GameState {
  status: 'playing' | 'draw' | 'win'
  phase: GamePhase
  winType: 'tsumo' | 'ron' | null
  roundScore: RoundScore | null
  winningHand: Tile[] | null
  wall: Tile[]
  players: PlayerState[]
  currentPlayer: PlayerId
  awaitingDiscard: boolean
  drawnTileId: string | null
  turnNumber: number
  lastDiscard: { playerIndex: number; tileId: string } | null
  playerRiichi: boolean
  riichiWaitTiles: TileCode[]
  riichiDeclareMode: boolean
  lastFeedback: string | null
  lastEvaluation: DiscardEvaluation | null
  discardLogs: DiscardLog[]
  pendingRonTile: Tile | null
  reactionEvents: ReactionEvent[]
  pendingReactionEvents: ReactionEvent[]
  callLogs: CallLog[]
  callsDisabled: boolean
}

const PLAYER_DATA: Array<{ name: string; wind: Wind }> = [
  { name: 'あなた', wind: '東' },
  { name: '下家', wind: '南' },
  { name: '対面', wind: '西' },
  { name: '上家', wind: '北' },
]

const DEAD_WALL_SIZE = 14
const ROUND_WIND: Wind = '東'

const CODE_ORDER = new Map<TileCode, number>(
  TILE_CODES.map((code, index) => [code, index]),
)

function asCode(tile: Tile | TileCode): TileCode {
  return typeof tile === 'string' ? tile : tile.code
}

function tileCodes(tiles: Array<Tile | TileCode>): TileCode[] {
  return tiles.map(asCode)
}

function toCounts(tiles: Array<Tile | TileCode>): number[] {
  const counts = Array<number>(34).fill(0)
  for (const tile of tiles) counts[CODE_ORDER.get(asCode(tile)) ?? 0] += 1
  return counts
}

function ceilToHundred(value: number): number {
  return Math.ceil(value / 100) * 100
}

function isTerminalOrHonor(code: TileCode): boolean {
  return code.length === 1 || code[0] === '1' || code[0] === '9'
}

function countSequenceCandidates(counts: number[]): number {
  let total = 0
  for (const offset of [0, 9, 18]) {
    for (let start = 1; start <= 7; start += 1) {
      if (
        counts[offset + start - 1] > 0
        && counts[offset + start] > 0
        && counts[offset + start + 1] > 0
      ) total += 1
    }
  }
  return total
}

function hasStraight(counts: number[], offset: number): boolean {
  return [1, 4, 7].every((start) =>
    [start, start + 1, start + 2].every((number) => counts[offset + number - 1] > 0),
  )
}

function getValuePairFu(
  counts: number[],
  playerWindTile: Extract<TileCode, 'E' | 'S' | 'W' | 'N'>,
  roundWindTile: Extract<TileCode, 'E' | 'S' | 'W' | 'N'>,
): number {
  let fu = 0
  for (const code of ['E', 'S', 'W', 'N'] as const) {
    if (counts[CODE_ORDER.get(code) ?? 27] < 2) continue
    if (code === playerWindTile) fu += 2
    if (code === roundWindTile) fu += 2
  }
  for (const code of ['P', 'F', 'C'] as const) {
    if (counts[CODE_ORDER.get(code) ?? 27] >= 2) fu += 2
  }
  return fu
}

export function createTile(code: TileCode, suffix = 'test'): Tile {
  return { id: `${code}-${suffix}`, code }
}

export function createTileSet(): Tile[] {
  return TILE_CODES.flatMap((code) =>
    Array.from({ length: 4 }, (_, copy) => ({ id: `${code}-${copy}`, code })),
  )
}

export function shuffleTiles(tiles: Tile[], random: () => number = Math.random): Tile[] {
  const shuffled = [...tiles]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort(
    (a, b) => (CODE_ORDER.get(a.code) ?? 0) - (CODE_ORDER.get(b.code) ?? 0),
  )
}

function standardShanten(tiles: Array<Tile | TileCode>, openMelds = 0): number {
  const counts = toCounts(tiles)
  let minimum = 8

  const search = (index: number, melds: number, pairs: number, blocks: number) => {
    while (index < 34 && counts[index] === 0) index += 1
    if (index >= 34) {
      const usableBlocks = Math.min(blocks, 4 - melds)
      minimum = Math.min(minimum, 8 - melds * 2 - usableBlocks - pairs)
      return
    }

    if (counts[index] >= 3) {
      counts[index] -= 3
      search(index, melds + 1, pairs, blocks)
      counts[index] += 3
    }

    if (index < 27 && index % 9 <= 6 && counts[index + 1] > 0 && counts[index + 2] > 0) {
      counts[index] -= 1
      counts[index + 1] -= 1
      counts[index + 2] -= 1
      search(index, melds + 1, pairs, blocks)
      counts[index] += 1
      counts[index + 1] += 1
      counts[index + 2] += 1
    }

    if (counts[index] >= 2) {
      counts[index] -= 2
      if (pairs === 0) search(index, melds, 1, blocks)
      search(index, melds, pairs, blocks + 1)
      counts[index] += 2
    }

    if (index < 27 && index % 9 <= 7 && counts[index + 1] > 0) {
      counts[index] -= 1
      counts[index + 1] -= 1
      search(index, melds, pairs, blocks + 1)
      counts[index] += 1
      counts[index + 1] += 1
    }

    if (index < 27 && index % 9 <= 6 && counts[index + 2] > 0) {
      counts[index] -= 1
      counts[index + 2] -= 1
      search(index, melds, pairs, blocks + 1)
      counts[index] += 1
      counts[index + 2] += 1
    }

    counts[index] -= 1
    search(index, melds, pairs, blocks)
    counts[index] += 1
  }

  search(0, openMelds, 0, 0)
  return minimum
}

function sevenPairsShanten(tiles: Array<Tile | TileCode>): number {
  const counts = toCounts(tiles)
  const pairs = counts.filter((count) => count >= 2).length
  const unique = counts.filter((count) => count > 0).length
  return 6 - pairs + Math.max(0, 7 - unique)
}

function thirteenOrphansShanten(tiles: Array<Tile | TileCode>): number {
  const counts = toCounts(tiles)
  const terminals = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]
  const unique = terminals.filter((index) => counts[index] > 0).length
  const hasPair = terminals.some((index) => counts[index] > 1)
  return 13 - unique - (hasPair ? 1 : 0)
}

export function calculateShanten(hand: Array<Tile | TileCode>, meldCount = 0): number {
  if (meldCount > 0) return standardShanten(hand, meldCount)
  return Math.min(
    standardShanten(hand),
    sevenPairsShanten(hand),
    thirteenOrphansShanten(hand),
  )
}

export function isTenpai(hand13: Array<Tile | TileCode>, meldCount = 0): boolean {
  return hand13.length % 3 === 1 && calculateShanten(hand13, meldCount) === 0
}

export function isWinningHand(hand14: Array<Tile | TileCode>, meldCount = 0): boolean {
  return hand14.length % 3 === 2 && calculateShanten(hand14, meldCount) === -1
}

export function getWaitTiles(
  hand: Array<Tile | TileCode>,
  visibleTiles: Array<Tile | TileCode> = [],
  meldCount = 0,
): ImprovementTile[] {
  const baseShanten = calculateShanten(hand, meldCount)
  const visibleCounts = toCounts([...hand, ...visibleTiles])

  return TILE_CODES.flatMap((code, index) => {
    if (visibleCounts[index] >= 4) return []
    const nextShanten = calculateShanten([...hand, code], meldCount)
    if (nextShanten >= baseShanten) return []
    return [{ code, remaining: 4 - visibleCounts[index] }]
  })
}

function hasSequenceCandidate(counts: number[], suitOffset: number, start: number): boolean {
  return [start, start + 1, start + 2]
    .filter((number) => counts[suitOffset + number - 1] > 0)
    .length >= 2
}

export function getYakuHints(hand: Array<Tile | TileCode>): YakuHint[] {
  const counts = toCounts(hand)
  const codes = tileCodes(hand)
  const hints: YakuHint[] = []
  const terminalOrHonorCount = codes.filter((code) =>
    code.length === 1 || code[0] === '1' || code[0] === '9',
  ).length
  const pairCount = counts.filter((count) => count >= 2).length
  const tripletCount = counts.filter((count) => count >= 3).length
  const honorPair = counts.slice(27).some((count) => count >= 2)

  if (terminalOrHonorCount <= 2 && codes.length >= 10) hints.push('断么九')
  if (honorPair) hints.push('役牌候補')
  if (pairCount >= 5) hints.push('七対子候補')

  const suitTotals = [0, 1, 2].map((suit) =>
    counts.slice(suit * 9, suit * 9 + 9).reduce((sum, count) => sum + count, 0),
  )
  const dominantSuit = Math.max(...suitTotals)
  const offSuit = suitTotals.reduce((sum, count) => sum + count, 0) - dominantSuit
  const honorCount = counts.slice(27).reduce((sum, count) => sum + count, 0)
  if (dominantSuit >= 8 && offSuit <= 2 && honorCount >= 1) hints.push('混一色気味')

  const ittsuCandidate = [0, 9, 18].some((offset) =>
    hasSequenceCandidate(counts, offset, 1)
    && hasSequenceCandidate(counts, offset, 4)
    && hasSequenceCandidate(counts, offset, 7),
  )
  if (ittsuCandidate) hints.push('一気通貫候補')

  const sanshokuCandidate = Array.from({ length: 7 }, (_, index) => index + 1).some((start) =>
    [0, 9, 18].filter((offset) => hasSequenceCandidate(counts, offset, start)).length >= 2,
  )
  if (sanshokuCandidate) hints.push('三色同順候補')

  let sequenceCandidates = 0
  for (const offset of [0, 9, 18]) {
    for (let start = 1; start <= 7; start += 1) {
      if (hasSequenceCandidate(counts, offset, start)) sequenceCandidates += 1
    }
  }
  if (sequenceCandidates >= 3 && pairCount >= 1 && tripletCount <= 1) hints.push('平和寄り')

  return hints
}

export function canRiichiAfterDiscard(hand14: Tile[], discardTile: Tile): boolean {
  const postHand = hand14.filter((tile) => tile.id !== discardTile.id)
  return postHand.length === 13 && isTenpai(postHand)
}

function compareOptions(a: DiscardOptionAnalysis, b: DiscardOptionAnalysis): number {
  if (a.shanten !== b.shanten) return a.shanten - b.shanten
  return b.evaluationScore - a.evaluationScore
}

function countGoodShapes(tiles: Tile[]): number {
  const counts = toCounts(tiles)
  let total = 0
  for (const offset of [0, 9, 18]) {
    for (let number = 2; number <= 7; number += 1) {
      if (counts[offset + number - 1] > 0 && counts[offset + number] > 0) total += 1
    }
  }
  return total
}

function calculateStructureScore(tiles: Tile[]): number {
  const counts = toCounts(tiles)
  const pairs = counts.filter((count) => count >= 2).length
  const triplets = counts.filter((count) => count >= 3).length
  let sequenceCandidates = 0
  for (const offset of [0, 9, 18]) {
    for (let start = 1; start <= 7; start += 1) {
      if (hasSequenceCandidate(counts, offset, start)) sequenceCandidates += 1
    }
  }
  return pairs * 2 + triplets * 3 + sequenceCandidates
}

function isIsolatedDiscard(discard: Tile, hand: Tile[]): boolean {
  const copies = hand.filter((tile) => tile.code === discard.code).length
  if (copies > 1) return false
  if (discard.code.length === 1) return true
  const number = Number(discard.code[0])
  return !hand.some((tile) =>
    tile.id !== discard.id
    && tile.code.length === 2
    && tile.code[1] === discard.code[1]
    && Math.abs(Number(tile.code[0]) - number) <= 2,
  )
}

export function analyzeDiscardOptions(
  hand14: Tile[],
  visibleTiles: Tile[] = [],
  meldCount = 0,
): DiscardOptionAnalysis[] {
  const byCode = new Map<TileCode, Tile>()
  for (const tile of hand14) if (!byCode.has(tile.code)) byCode.set(tile.code, tile)

  const raw = [...byCode.values()].map((discard) => {
    const postHand = sortTiles(hand14.filter((tile) => tile.id !== discard.id))
    const improvementTiles = getWaitTiles(postHand, [...visibleTiles, discard], meldCount)
    const improvementTypeCount = improvementTiles.length
    const improvementTileCount = improvementTiles.reduce((sum, tile) => sum + tile.remaining, 0)
    const yakuHints = getYakuHints(postHand)
    const goodShapeCount = countGoodShapes(postHand)
    const structureScore = calculateStructureScore(postHand)
    const isolatedDiscard = isIsolatedDiscard(discard, hand14)
    return {
      discard,
      shanten: calculateShanten(postHand, meldCount),
      improvementTiles,
      improvementTypeCount,
      improvementTileCount,
      yakuHints,
      canRiichi: meldCount === 0 && isTenpai(postHand),
      goodShapeCount,
      structureScore,
      isolatedDiscard,
      evaluationScore:
        improvementTileCount * 10
        + improvementTypeCount * 4
        + goodShapeCount * 5
        + structureScore * 2
        + yakuHints.length * 3
        + (isolatedDiscard ? 4 : 0),
      rank: 0,
      optionCount: byCode.size,
      postHand,
    }
  })

  return raw.map((option) => ({
    ...option,
    rank: 1 + raw.filter((candidate) => compareOptions(candidate, option) < 0).length,
  }))
}

function uniqueYakuHints(hints: YakuHint[]): YakuHint[] {
  return [...new Set(hints)]
}

function hasOpenHandRoute(hints: YakuHint[]): boolean {
  return hints.some((hint) => ['断么九', '役牌候補', '混一色気味'].includes(hint))
}

function hasValueRoute(hints: YakuHint[]): boolean {
  return hints.some((hint) => ['混一色気味', '一気通貫候補', '三色同順候補', '七対子候補'].includes(hint))
}

function turnStageAdvice(turn: number): { label: string; guidance: string } {
  if (turn <= 6) {
    return {
      label: '序盤',
      guidance: '序盤は形と役の種を作る時間。',
    }
  }
  if (turn <= 12) {
    return {
      label: '中盤',
      guidance: '中盤はテンパイ速度と安全牌の両方を見る時間。',
    }
  }
  return {
    label: '終盤',
    guidance: '終盤は無理な手作りより放銃回避を優先する時間。',
  }
}

export function buildHandPlanAdvice(
  hand: Tile[],
  visibleTiles: Tile[] = [],
  meldCount = 0,
  playerTurn = 1,
): HandPlanAdvice {
  const normalizedTurn = Math.max(1, playerTurn)
  const stage = turnStageAdvice(normalizedTurn)
  const isDiscardTurn = hand.length % 3 === 2

  const bestOptions = isDiscardTurn
    ? analyzeDiscardOptions(hand, visibleTiles, meldCount)
    : []
  const bestShanten = bestOptions.length > 0
    ? Math.min(...bestOptions.map((option) => option.shanten))
    : calculateShanten(hand, meldCount)
  const bestShantenOptions = bestOptions.filter((option) => option.shanten === bestShanten)
  const bestImprovementTileCount = bestShantenOptions.length > 0
    ? Math.max(...bestShantenOptions.map((option) => option.improvementTileCount))
    : getWaitTiles(hand, visibleTiles, meldCount).reduce((sum, tile) => sum + tile.remaining, 0)
  const bestImprovementTypeCount = bestShantenOptions.length > 0
    ? Math.max(...bestShantenOptions.map((option) => option.improvementTypeCount))
    : getWaitTiles(hand, visibleTiles, meldCount).length
  const counts = toCounts(hand)
  const pairCount = counts.filter((count) => count >= 2).length
  const yakuHints = uniqueYakuHints([
    ...getYakuHints(hand),
    ...bestShantenOptions.flatMap((option) => option.yakuHints),
  ])
  const openRoute = hasOpenHandRoute(yakuHints)
  const valueRoute = hasValueRoute(yakuHints)
  const earlyWindow = normalizedTurn <= 6
  const fastEnough = bestShanten <= 2 && bestImprovementTileCount >= 12
  const nearlyThere = bestShanten <= 1
  const strongValueRoute = yakuHints.includes('混一色気味')
    ? bestShanten <= 3 && bestImprovementTileCount >= 16
    : valueRoute && bestShanten <= 2 && bestImprovementTileCount >= 12
  const tooSlowForCheap = bestShanten >= 3 && !strongValueRoute && (!earlyWindow || bestImprovementTileCount < 24)

  let kind: HandPlanKind
  let label: string
  let stance: string
  let action: string

  if (nearlyThere && bestImprovementTileCount >= 6) {
    kind = 'push'
    label = '先制チャンスを逃さない'
    stance = 'テンパイ速度を最優先。先に入ればリーチや即押しの価値があります。'
    action = '受け入れ最大の打牌を優先。テンパイしたら良形か先制なら強めに。'
  } else if ((fastEnough || bestShanten <= 2) && openRoute) {
    kind = 'fast'
    label = '高望みしすぎない'
    stance = '安くても上がり切る価値がある手。高打点より局消化を見ます。'
    action = '役牌・タンヤオ・染めが残るなら鳴きも許可。孤立牌より役と形を残す。'
  } else if (strongValueRoute) {
    kind = 'value'
    label = '打点を見るなら形も確認'
    stance = '少し遅くても育てる理由があります。ただし中盤以降は危険牌を抱えすぎない。'
    action = '打点の種を残しつつ、6巡目までに2シャンテン以下へ寄らなければ撤退も見る。'
  } else if (tooSlowForCheap || (!earlyWindow && bestShanten >= 3)) {
    kind = 'patient'
    label = '無理押し注意'
    stance = '遅くて安い寄り。上がりに寄せすぎると放銃だけ残りやすい局面です。'
    action = '安全牌候補を残し、形が急によくなった時だけ参加。リーチには早めに受ける。'
  } else {
    kind = 'fast'
    label = '決め打ちしすぎ注意'
    stance = 'まだ決め打ちしすぎない手。速度を落とさず自然に役を見る段階です。'
    action = '受け入れと良形を優先。次の2巡で役が見えなければリーチ手順へ寄せる。'
  }

  const yakuText = yakuHints.length > 0 ? yakuHints.join(' / ') : 'まだ薄い'
  const reason = `${normalizedTurn}巡目(${stage.label})・${shantenLabel(bestShanten)}・受け入れ${bestImprovementTypeCount}種${bestImprovementTileCount}枚・役候補 ${yakuText}`
  const pairWarning = pairCount >= 4 && !yakuHints.includes('七対子候補')
    ? '対子が多いので、七対子決め打ちより順子に戻せる受けや鳴ける対子を見ます。'
    : ''

  return {
    kind,
    label,
    stance,
    reason,
    action: `${stage.guidance}${pairWarning}${action}`,
    shanten: bestShanten,
    improvementTypeCount: bestImprovementTypeCount,
    improvementTileCount: bestImprovementTileCount,
    playerTurn: normalizedTurn,
    yakuHints,
  }
}

function evaluationReason(
  selected: DiscardOptionAnalysis,
  hand14: Tile[],
  shapeLoss: number,
  structureLoss: number,
  yakuLoss: number,
): string {
  const code = selected.discard.code
  const copiesBefore = hand14.filter((tile) => tile.code === code).length
  if (shapeLoss >= 2 || structureLoss >= 4) {
    return `${tileName(code)}周辺の連続形を壊すため、かなり損な一打です。`
  }
  if (code.length === 1) {
    return copiesBefore >= 2
      ? '役牌を含む字牌の対子候補を手放します。'
      : '孤立した字牌の処理として自然な一打です。'
  }
  if (selected.isolatedDiscard) return '孤立牌処理として自然で、つながった形を残します。'
  if (yakuLoss > 0) return '受け入れは保ちますが、狙える役の候補を一部手放します。'
  if (selected.rank === 1) return '受け入れと良形を広く残す、素直な一打です。'
  return '手牌のつながりを保ちながら進める選択です。'
}

export function shantenLabel(shanten: number): string {
  if (shanten < 0) return '和了'
  if (shanten === 0) return 'テンパイ'
  return `${shanten}シャンテン`
}

export function buildDiscardEvaluation(
  selectedDiscard: Tile,
  analysis: DiscardOptionAnalysis[],
  hand14: Tile[],
  options: { declaredRiichi?: boolean; playerAlreadyRiichi?: boolean } = {},
): DiscardEvaluation {
  const analyzed = analysis.find((option) => option.discard.code === selectedDiscard.code)
  if (!analyzed || !hand14.some((tile) => tile.id === selectedDiscard.id)) {
    throw new Error('Selected discard was not analyzed from the current hand')
  }
  const selected: DiscardOptionAnalysis = {
    ...analyzed,
    discard: selectedDiscard,
    postHand: sortTiles(hand14.filter((tile) => tile.id !== selectedDiscard.id)),
  }
  const bestShanten = Math.min(...analysis.map((option) => option.shanten))
  const bestShantenOptions = analysis.filter((option) => option.shanten === bestShanten)
  const bestImprovementTileCount = Math.max(...bestShantenOptions.map((option) => option.improvementTileCount))
  const bestEvaluationScore = Math.max(...bestShantenOptions.map((option) => option.evaluationScore))
  const bestOptions = bestShantenOptions.filter((option) => option.evaluationScore === bestEvaluationScore)
  const bestGoodShapeCount = Math.max(...bestOptions.map((option) => option.goodShapeCount))
  const bestStructureScore = Math.max(...bestOptions.map((option) => option.structureScore))
  const bestYakuCount = Math.max(...bestOptions.map((option) => option.yakuHints.length))
  const shantenDifference = selected.shanten - bestShanten
  const improvementTileDifference = shantenDifference > 0
    ? null
    : Math.max(0, bestImprovementTileCount - selected.improvementTileCount)
  const shapeLoss = Math.max(0, bestGoodShapeCount - selected.goodShapeCount)
  const structureLoss = Math.max(0, bestStructureScore - selected.structureScore)
  const yakuLoss = Math.max(0, bestYakuCount - selected.yakuHints.length)
  const importantShapeBroken = shapeLoss >= 2 || structureLoss >= 4
  const grade: DiscardGrade = shantenDifference > 0 || importantShapeBroken
    ? 'bad'
    : improvementTileDifference !== null && improvementTileDifference <= 2
      ? 'best'
      : improvementTileDifference !== null && improvementTileDifference <= 5
        ? 'good'
        : 'compromise'
  const gradeLabels: Record<DiscardGrade, string> = {
    best: '◎ 最善級',
    good: '○ 良い打牌',
    compromise: '△ 妥協',
    bad: '× 悪手寄り',
  }
  const shantenText = shantenDifference > 0
    ? `${shantenLabel(bestShanten)}から${shantenLabel(selected.shanten)}へ悪化します。`
    : `${shantenLabel(selected.shanten)}維持。`
  const differenceText = shantenDifference > 0
    ? 'シャンテン数を戻すため、受け入れ比較以前に大きな損です。'
    : improvementTileDifference === 0
      ? '受け入れ枚数は最善候補と同じです。'
      : `受け入れは${selected.improvementTypeCount}種${selected.improvementTileCount}枚で、最善候補との差は${improvementTileDifference}枚です。`
  const declaredRiichi = options.declaredRiichi ?? false
  const riichiEstablished = declaredRiichi && selected.canRiichi
  const showMissedRiichi = selected.canRiichi && !declaredRiichi && !options.playerAlreadyRiichi
  const reachText = showMissedRiichi ? ' 今の打牌、リーチできたよ。' : ''
  const summary = `${gradeLabels[grade]}：${tileName(selected.discard.code)}切り`
  const detail = `${shantenText}${differenceText}${evaluationReason(selected, hand14, shapeLoss, structureLoss, yakuLoss)}${reachText}`

  return {
    discard: selectedDiscard,
    grade,
    gradeLabel: gradeLabels[grade],
    shanten: selected.shanten,
    bestShanten,
    shantenDifference,
    improvementTypeCount: selected.improvementTypeCount,
    improvementTileCount: selected.improvementTileCount,
    bestImprovementTileCount,
    improvementTileDifference,
    rank: selected.rank,
    optionCount: selected.optionCount,
    bestDiscards: bestOptions.map((option) => option.discard),
    canRiichi: selected.canRiichi,
    declaredRiichi,
    riichiEstablished,
    missedRiichiOpportunity: showMissedRiichi,
    summary,
    detail,
  }
}

function windCode(wind: Wind): Extract<TileCode, 'E' | 'S' | 'W' | 'N'> {
  const codes: Record<Wind, Extract<TileCode, 'E' | 'S' | 'W' | 'N'>> = {
    東: 'E',
    南: 'S',
    西: 'W',
    北: 'N',
  }
  return codes[wind]
}

function limitScore(han: number, fu: number): { basePoints: number; limitName: string | null } {
  const rawBase = fu * (2 ** (han + 2))
  if (han >= 13) return { basePoints: 8000, limitName: '役満' }
  if (han >= 11) return { basePoints: 6000, limitName: '三倍満' }
  if (han >= 8) return { basePoints: 4000, limitName: '倍満' }
  if (han >= 6) return { basePoints: 3000, limitName: '跳満' }
  if (han >= 5 || rawBase >= 2000) return { basePoints: 2000, limitName: '満貫' }
  return { basePoints: rawBase, limitName: null }
}

export function calculateWinningScore(
  hand: Array<Tile | TileCode>,
  winType: 'tsumo' | 'ron',
  options: { riichi?: boolean; playerWind?: Wind; roundWind?: Wind } = {},
): RoundScore {
  const codes = tileCodes(hand)
  const counts = toCounts(codes)
  const yaku: ScoreYaku[] = []
  const playerWind = options.playerWind ?? '東'
  const roundWind = options.roundWind ?? ROUND_WIND
  const playerWindTile = windCode(playerWind)
  const roundWindTile = windCode(roundWind)
  const dealer = playerWind === '東'
  const pairs = counts.filter((count) => count >= 2).length
  const tripletIndexes = counts.flatMap((count, index) => count >= 3 ? [index] : [])
  const sevenPairs = pairs === 7
  const valuePairFu = getValuePairFu(counts, playerWindTile, roundWindTile)
  const pinfuLike = !sevenPairs
    && tripletIndexes.length === 0
    && valuePairFu === 0
    && countSequenceCandidates(counts) >= 4

  if (options.riichi) yaku.push({ name: '立直', han: 1 })
  if (winType === 'tsumo') yaku.push({ name: '門前清自摸和', han: 1 })
  if (codes.every((code) => !isTerminalOrHonor(code))) yaku.push({ name: '断么九', han: 1 })
  if (pinfuLike) yaku.push({ name: '平和', han: 1 })
  if (sevenPairs) yaku.push({ name: '七対子', han: 2 })

  for (const code of ['E', 'S', 'W', 'N'] as const) {
    const count = counts[CODE_ORDER.get(code) ?? 0]
    if (count < 3) continue
    const windHan = (code === playerWindTile ? 1 : 0) + (code === roundWindTile ? 1 : 0)
    if (windHan === 2) yaku.push({ name: 'ダブ東', han: 2 })
    else if (windHan === 1) yaku.push({ name: `${tileName(code)}風`, han: 1 })
  }

  for (const code of ['P', 'F', 'C'] as const) {
    if (counts[CODE_ORDER.get(code) ?? 0] >= 3) yaku.push({ name: `役牌 ${tileName(code)}`, han: 1 })
  }

  const suitedSuits = [0, 1, 2].filter((suit) =>
    counts.slice(suit * 9, suit * 9 + 9).some((count) => count > 0),
  )
  const honorCount = counts.slice(27).reduce((sum, count) => sum + count, 0)
  if (suitedSuits.length === 1 && honorCount > 0) yaku.push({ name: '混一色', han: 3 })
  if (suitedSuits.length === 1 && honorCount === 0) yaku.push({ name: '清一色', han: 6 })

  if ([0, 9, 18].some((offset) => hasStraight(counts, offset))) {
    yaku.push({ name: '一気通貫', han: 2 })
  }

  const hasSanshoku = Array.from({ length: 7 }, (_, index) => index + 1).some((start) =>
    [0, 9, 18].every((offset) =>
      [start, start + 1, start + 2].every((number) => counts[offset + number - 1] > 0),
    ),
  )
  if (hasSanshoku) yaku.push({ name: '三色同順', han: 2 })

  if (!sevenPairs && tripletIndexes.length >= 4) yaku.push({ name: '対々和', han: 2 })

  let fu: number
  if (sevenPairs) {
    fu = 25
  } else if (pinfuLike && winType === 'tsumo') {
    fu = 20
  } else {
    const tripletFu = tripletIndexes.reduce((sum, index) => {
      const code = TILE_CODES[index]
      return sum + (isTerminalOrHonor(code) ? 8 : 4)
    }, 0)
    fu = 20 + valuePairFu + tripletFu + (winType === 'tsumo' ? 2 : 10)
    fu = Math.max(30, Math.ceil(fu / 10) * 10)
  }

  const han = yaku.reduce((sum, item) => sum + item.han, 0)
  if (han === 0) {
    return {
      winType,
      han,
      fu,
      basePoints: 0,
      totalPoints: 0,
      limitName: null,
      dealer,
      paymentText: '役なし',
      yaku,
      note: '簡易判定では役が見つかりません。形だけのロン/ツモ候補かもしれません。',
    }
  }

  const { basePoints, limitName } = limitScore(han, fu)
  let totalPoints: number
  let paymentText: string
  if (dealer && winType === 'tsumo') {
    const payment = ceilToHundred(basePoints * 2)
    totalPoints = payment * 3
    paymentText = `親ツモ ${payment}点オール`
  } else if (dealer) {
    totalPoints = ceilToHundred(basePoints * 6)
    paymentText = `親ロン ${totalPoints}点`
  } else if (winType === 'tsumo') {
    const childPayment = ceilToHundred(basePoints)
    const dealerPayment = ceilToHundred(basePoints * 2)
    totalPoints = childPayment * 2 + dealerPayment
    paymentText = `ツモ 親${dealerPayment}点 / 子${childPayment}点`
  } else {
    totalPoints = ceilToHundred(basePoints * 4)
    paymentText = `ロン ${totalPoints}点`
  }

  return {
    winType,
    han,
    fu,
    basePoints,
    totalPoints,
    limitName,
    dealer,
    paymentText,
    yaku,
    note: 'ドラ・本場・供託なしの簡易計算',
  }
}

function asPlayerId(index: number): PlayerId {
  return (index % 4) as PlayerId
}

function isKamicha(actor: PlayerId, playerId: PlayerId): boolean {
  return actor === asPlayerId(playerId + 3)
}

function findTilesByCode(hand: Tile[], code: TileCode, count: number): Tile[] | null {
  const tiles = hand.filter((tile) => tile.code === code).slice(0, count)
  return tiles.length === count ? tiles : null
}

function suitedCode(number: number, suit: string): TileCode | null {
  if (number < 1 || number > 9 || !['m', 'p', 's'].includes(suit)) return null
  return `${number}${suit}` as TileCode
}

export function getChiOptions(hand: Tile[], calledTile: Tile): Tile[][] {
  if (calledTile.code.length !== 2) return []
  const number = Number(calledTile.code[0])
  const suit = calledTile.code[1]
  const patterns = [
    [number - 2, number - 1],
    [number - 1, number + 1],
    [number + 1, number + 2],
  ]
  const seen = new Set<string>()

  return patterns.flatMap(([left, right]) => {
    const leftCode = suitedCode(left, suit)
    const rightCode = suitedCode(right, suit)
    if (!leftCode || !rightCode) return []
    const key = `${leftCode}-${rightCode}`
    if (seen.has(key)) return []
    seen.add(key)
    const leftTile = findTilesByCode(hand, leftCode, 1)?.[0]
    const rightTile = findTilesByCode(hand, rightCode, 1)?.[0]
    return leftTile && rightTile ? [[leftTile, rightTile]] : []
  })
}

function snapshotState(state: GameState): RollbackSnapshot {
  return {
    players: state.players,
    wall: state.wall,
    currentPlayer: state.currentPlayer,
    phase: state.phase,
    awaitingDiscard: state.awaitingDiscard,
    drawnTileId: state.drawnTileId,
    turnNumber: state.turnNumber,
    lastDiscard: state.lastDiscard,
  }
}

function markDiscardCalled(
  players: PlayerState[],
  event: ReactionEvent,
  callType: CallType,
  calledBy: PlayerId = 0,
): PlayerState[] {
  return players.map((player, playerIndex) => playerIndex === event.actor
    ? {
        ...player,
        river: player.river.map((record) => record.id === event.riverDiscardId
          ? { ...record, calledBy, callType }
          : record),
      }
    : player)
}

function getHumanReactionEvent(state: GameState, record: DiscardRecord): ReactionEvent | null {
  if (record.actor === 0) return null

  const human = state.players[0]
  const meldCount = human.melds.length
  const canRon = isWinningHand([...human.hand, record.tile], meldCount)
  const canCallOpen = !state.callsDisabled && !state.playerRiichi && meldCount < 4
  const canPon = canCallOpen && human.hand.filter((tile) => tile.code === record.tile.code).length >= 2
  const canChi = canCallOpen && isKamicha(record.actor, 0) && getChiOptions(human.hand, record.tile).length > 0
  if (!canRon && !canPon && !canChi) return null

  return {
    id: `reaction-${record.id}`,
    actor: record.actor,
    tile: record.tile,
    riverDiscardId: record.id,
    turnIndex: state.turnNumber,
    canRon,
    canPon,
    canChi,
    snapshot: snapshotState(state),
  }
}

function nextPhaseAfterDiscard(
  nextPlayer: PlayerId,
  pendingReactionEvents: ReactionEvent[],
  callsDisabled: boolean,
  playerRiichi: boolean,
): GamePhase {
  const hasRon = pendingReactionEvents.some((event) => event.canRon)
  if (nextPlayer === 0 && playerRiichi && hasRon) return 'reaction_review'
  if (nextPlayer === 0 && playerRiichi) return 'player_draw'
  if (nextPlayer === 0 && (!callsDisabled || hasRon)) {
    return 'reaction_review'
  }
  if (nextPlayer === 0) return 'player_draw'
  return 'enemy_auto'
}

export function getVisibleTiles(state: GameState): Tile[] {
  return [
    ...state.players.flatMap((player) =>
      player.river.filter((record) => record.calledBy === undefined).map((record) => record.tile),
    ),
    ...state.players.flatMap((player) => player.melds.flatMap((meld) => meld.tiles)),
  ]
}

export function createInitialGame(random: () => number = Math.random): GameState {
  const wall = shuffleTiles(createTileSet(), random)
  const players: PlayerState[] = PLAYER_DATA.map((player) => ({
    ...player,
    hand: [],
    river: [],
    melds: [],
    isRiichi: false,
  }))

  for (let round = 0; round < 13; round += 1) {
    for (const player of players) {
      const tile = wall.pop()
      if (tile) player.hand.push(tile)
    }
  }

  wall.splice(0, DEAD_WALL_SIZE)

  return {
    status: 'playing',
    phase: 'player_draw',
    winType: null,
    roundScore: null,
    winningHand: null,
    wall,
    players: players.map((player) => ({ ...player, hand: sortTiles(player.hand) })),
    currentPlayer: 0,
    awaitingDiscard: false,
    drawnTileId: null,
    turnNumber: 0,
    lastDiscard: null,
    playerRiichi: false,
    riichiWaitTiles: [],
    riichiDeclareMode: false,
    lastFeedback: null,
    lastEvaluation: null,
    discardLogs: [],
    pendingRonTile: null,
    reactionEvents: [],
    pendingReactionEvents: [],
    callLogs: [],
    callsDisabled: false,
  }
}

export function beginTurn(state: GameState): GameState {
  if (
    state.status !== 'playing'
    || state.awaitingDiscard
    || state.pendingRonTile
    || state.phase === 'reaction_review'
    || state.phase === 'declare_reaction'
  ) return state
  if (state.wall.length === 0) {
    return { ...state, status: 'draw', phase: 'draw', winType: null, roundScore: null, winningHand: null, drawnTileId: null, riichiDeclareMode: false }
  }

  const wall = [...state.wall]
  const drawnTile = wall.pop()!
  const players = state.players.map((player, index) =>
    index === state.currentPlayer ? { ...player, hand: [...player.hand, drawnTile] } : player,
  )

  return {
    ...state,
    wall,
    players,
    awaitingDiscard: true,
    drawnTileId: drawnTile.id,
    phase: 'player_discard',
  }
}

function applyDiscard(state: GameState, tileId: string): GameState {
  if (
    state.status !== 'playing'
    || !state.awaitingDiscard
    || state.phase === 'reaction_review'
    || state.phase === 'declare_reaction'
  ) return state

  const player = state.players[state.currentPlayer]
  const discarded = player.hand.find((tile) => tile.id === tileId)
  if (!discarded) return state

  const playerIndex = state.currentPlayer
  const discardRecord: DiscardRecord = {
    id: `discard-${state.turnNumber + 1}-${discarded.id}`,
    tile: discarded,
    actor: asPlayerId(playerIndex),
  }
  const players = state.players.map((item, index) => index === playerIndex
    ? {
        ...item,
        hand: sortTiles(item.hand.filter((tile) => tile.id !== tileId)),
        river: [...item.river, discardRecord],
      }
    : item)
  const nextPlayer = asPlayerId(playerIndex + 1)
  const baseState: GameState = {
    ...state,
    players,
    currentPlayer: nextPlayer,
    awaitingDiscard: false,
    drawnTileId: null,
    turnNumber: state.turnNumber + 1,
    lastDiscard: { playerIndex, tileId },
    pendingRonTile: null,
  }
  const reactionEvent = getHumanReactionEvent(baseState, discardRecord)
  const pendingReactionEvents = reactionEvent
    ? [...state.pendingReactionEvents, reactionEvent]
    : state.pendingReactionEvents
  const phase = nextPhaseAfterDiscard(nextPlayer, pendingReactionEvents, state.callsDisabled, state.playerRiichi)

  return {
    ...baseState,
    phase,
    pendingRonTile: phase === 'reaction_review' && pendingReactionEvents.some((event) => event.canRon)
      ? pendingReactionEvents.find((event) => event.canRon)?.tile ?? null
      : null,
    reactionEvents: reactionEvent ? [...state.reactionEvents, reactionEvent] : state.reactionEvents,
    pendingReactionEvents,
  }
}

export function discardTile(state: GameState, tileId: string): GameState {
  if (state.currentPlayer === 0 && state.playerRiichi && tileId !== state.drawnTileId) return state
  return applyDiscard(state, tileId)
}

export function setRiichiDeclareMode(state: GameState, enabled: boolean): GameState {
  if (
    state.status !== 'playing'
    || state.currentPlayer !== 0
    || !state.awaitingDiscard
    || state.playerRiichi
    || state.players[0].melds.length > 0
  ) return state
  return { ...state, riichiDeclareMode: enabled, lastFeedback: null }
}

export function setCallsDisabled(state: GameState, enabled: boolean): GameState {
  if (state.status !== 'playing') return { ...state, callsDisabled: enabled }
  if (!enabled) return { ...state, callsDisabled: false }

  const ronEvents = state.pendingReactionEvents.filter((event) => event.canRon)
  if (state.phase === 'reaction_review' && ronEvents.length === 0) {
    return {
      ...state,
      callsDisabled: true,
      phase: 'player_draw',
      pendingReactionEvents: [],
      pendingRonTile: null,
      lastFeedback: null,
    }
  }

  return {
    ...state,
    callsDisabled: true,
    pendingReactionEvents: ronEvents,
    pendingRonTile: ronEvents[0]?.tile ?? null,
  }
}

function appendHumanLog(
  stateBefore: GameState,
  stateAfter: GameState,
  selected: DiscardOptionAnalysis,
  evaluation: DiscardEvaluation,
  declaredRiichi: boolean,
): GameState {
  const handBefore = stateBefore.players[0].hand
  const drawnTile = handBefore.find((tile) => tile.id === stateBefore.drawnTileId) ?? null
  const log: DiscardLog = {
    turn: stateBefore.discardLogs.length + 1,
    hand: tileCodes(handBefore),
    drawnTile: drawnTile?.code ?? null,
    discardedTile: selected.discard.code,
    wallRemaining: stateAfter.wall.length,
    shanten: selected.shanten,
    improvementTypeCount: selected.improvementTypeCount,
    improvementTileCount: selected.improvementTileCount,
    yakuHints: selected.yakuHints,
    wasRiichiPossible: selected.canRiichi && !stateBefore.playerRiichi,
    declaredRiichi,
    riichiEstablished: declaredRiichi && selected.canRiichi,
    explanation: `${evaluation.summary} ${evaluation.detail}`,
  }
  return {
    ...stateAfter,
    discardLogs: [...stateBefore.discardLogs, log],
    lastEvaluation: evaluation,
  }
}

export function discardHumanTile(state: GameState, tileId: string): GameState {
  if (
    state.status !== 'playing'
    || state.currentPlayer !== 0
    || !state.awaitingDiscard
    || state.playerRiichi
  ) return state

  const hand14 = state.players[0].hand
  const discarded = hand14.find((tile) => tile.id === tileId)
  if (!discarded) return state
  const meldCount = state.players[0].melds.length
  const analysis = analyzeDiscardOptions(hand14, getVisibleTiles(state), meldCount)
  const selected = analysis.find((option) => option.discard.code === discarded.code)!

  if (state.riichiDeclareMode && !selected.canRiichi) {
    return {
      ...state,
      riichiDeclareMode: false,
      lastFeedback: 'その牌ではリーチできません',
    }
  }

  const declaredRiichi = state.riichiDeclareMode && selected.canRiichi
  const evaluation = buildDiscardEvaluation(discarded, analysis, hand14, { declaredRiichi })
  const riichiWaitTiles = declaredRiichi
    ? selected.improvementTiles.map((tile) => tile.code)
    : state.riichiWaitTiles
  const discardedState = applyDiscard(state, tileId)
  const withLog = appendHumanLog(state, discardedState, { ...selected, discard: discarded }, evaluation, declaredRiichi)
  return {
    ...withLog,
    playerRiichi: state.playerRiichi || declaredRiichi,
    players: withLog.players.map((player, index) => index === 0
      ? { ...player, isRiichi: state.playerRiichi || declaredRiichi }
      : player),
    riichiWaitTiles,
    riichiDeclareMode: false,
    lastFeedback: declaredRiichi
      ? 'リーチ成立！'
      : selected.canRiichi
        ? '今の打牌、リーチできたよ'
        : null,
  }
}

export function autoDiscardRiichiDraw(state: GameState): GameState {
  if (
    state.status !== 'playing'
    || state.currentPlayer !== 0
    || !state.playerRiichi
    || !state.awaitingDiscard
    || !state.drawnTileId
    || isWinningHand(state.players[0].hand, state.players[0].melds.length)
  ) return state

  const hand14 = state.players[0].hand
  const discarded = hand14.find((tile) => tile.id === state.drawnTileId)!
  const analysis = analyzeDiscardOptions(hand14, getVisibleTiles(state), state.players[0].melds.length)
  const selected = analysis.find((option) => option.discard.code === discarded.code)!
  const evaluation = buildDiscardEvaluation(discarded, analysis, hand14, { playerAlreadyRiichi: true })
  return appendHumanLog(state, applyDiscard(state, discarded.id), { ...selected, discard: discarded }, evaluation, false)
}

export function startReactionDeclaration(state: GameState): GameState {
  if (state.status !== 'playing' || state.phase !== 'reaction_review') {
    return state
  }
  return { ...state, phase: 'declare_reaction', lastFeedback: null }
}

export function skipReactionReview(state: GameState): GameState {
  if (state.status !== 'playing' || !['reaction_review', 'declare_reaction'].includes(state.phase)) return state
  return {
    ...state,
    phase: 'player_draw',
    pendingReactionEvents: [],
    pendingRonTile: null,
    lastFeedback: null,
  }
}

function findReactionEvent(state: GameState, eventId?: string): ReactionEvent | null {
  if (state.pendingReactionEvents.length === 0) return null
  if (!eventId) return state.pendingReactionEvents[0]
  return state.pendingReactionEvents.find((event) => event.id === eventId) ?? null
}

function restoreReactionSnapshot(state: GameState, event: ReactionEvent): GameState {
  return {
    ...state,
    players: event.snapshot.players,
    wall: event.snapshot.wall,
    currentPlayer: event.snapshot.currentPlayer,
    awaitingDiscard: event.snapshot.awaitingDiscard,
    drawnTileId: event.snapshot.drawnTileId,
    turnNumber: event.snapshot.turnNumber,
    lastDiscard: event.snapshot.lastDiscard,
  }
}

function failedCall(state: GameState, type: 'ron' | 'pon' | 'chi', event: ReactionEvent | null, reason: string): GameState {
  return {
    ...state,
    phase: 'reaction_review',
    lastFeedback: reason,
    callLogs: event
      ? [...state.callLogs, {
          turnIndex: state.turnNumber,
          type,
          targetTile: event.tile,
          targetPlayer: event.actor,
          success: false,
          reason,
        }]
      : state.callLogs,
  }
}

export function declareReaction(
  state: GameState,
  type: 'ron' | 'pon' | 'chi',
  eventId?: string,
  chiTileIds: string[] = [],
): GameState {
  if (state.status !== 'playing' || state.phase !== 'declare_reaction') return state

  const event = findReactionEvent(state, eventId)
  if (!event) return failedCall(state, type, null, '宣言できる捨て牌がありません')

  if (type === 'ron') {
    const restored = restoreReactionSnapshot(state, event)
    const winningHand = [...restored.players[0].hand, event.tile]
    if (!event.canRon || !isWinningHand(winningHand, restored.players[0].melds.length)) {
      return failedCall(state, type, event, 'その牌ではロンできません')
    }
    const roundScore = calculateWinningScore(winningHand, 'ron', {
      riichi: restored.playerRiichi,
      playerWind: restored.players[0].wind,
      roundWind: ROUND_WIND,
    })
    return {
      ...restored,
      status: 'win',
      phase: 'win',
      winType: 'ron',
      roundScore,
      winningHand: sortTiles(winningHand),
      awaitingDiscard: false,
      pendingRonTile: null,
      pendingReactionEvents: [],
      players: markDiscardCalled(restored.players, event, 'ron'),
      lastFeedback: 'ロン成立！',
      callLogs: [...state.callLogs, {
        turnIndex: event.turnIndex,
        type,
        targetTile: event.tile,
        targetPlayer: event.actor,
        success: true,
        reason: 'ロン成立',
      }],
    }
  }

  if (state.playerRiichi) return failedCall(state, type, event, 'リーチ中は鳴けません')

  const restored = restoreReactionSnapshot(state, event)
  const human = restored.players[0]

  if (type === 'pon') {
    const taken = findTilesByCode(human.hand, event.tile.code, 2)
    if (!event.canPon || !taken) return failedCall(state, type, event, 'その牌ではポンできません')
    const meld: Meld = {
      type: 'pon',
      tiles: sortTiles([...taken, event.tile]),
      calledTile: event.tile,
      from: event.actor,
    }
    const players = markDiscardCalled(restored.players, event, 'pon').map((player, index) => index === 0
      ? {
          ...player,
          hand: sortTiles(player.hand.filter((tile) => !taken.some((item) => item.id === tile.id))),
          melds: [...player.melds, meld],
        }
      : player)
    return {
      ...restored,
      players,
      currentPlayer: 0,
      phase: 'player_discard',
      awaitingDiscard: true,
      drawnTileId: null,
      pendingRonTile: null,
      pendingReactionEvents: [],
      riichiDeclareMode: false,
      lastFeedback: 'ポン成立！',
      callLogs: [...state.callLogs, {
        turnIndex: event.turnIndex,
        type,
        targetTile: event.tile,
        targetPlayer: event.actor,
        success: true,
        reason: 'ポン成立',
      }],
    }
  }

  const options = getChiOptions(human.hand, event.tile)
  const selected = chiTileIds.length === 2
    ? options.find((option) => option.every((tile) => chiTileIds.includes(tile.id)))
    : options[0]
  if (!event.canChi || !selected || !isKamicha(event.actor, 0)) {
    return failedCall(state, type, event, 'その牌ではチーできません')
  }
  const meld: Meld = {
    type: 'chi',
    tiles: sortTiles([...selected, event.tile]),
    calledTile: event.tile,
    from: event.actor,
  }
  const players = markDiscardCalled(restored.players, event, 'chi').map((player, index) => index === 0
    ? {
        ...player,
        hand: sortTiles(player.hand.filter((tile) => !selected.some((item) => item.id === tile.id))),
        melds: [...player.melds, meld],
      }
    : player)
  return {
    ...restored,
    players,
    currentPlayer: 0,
    phase: 'player_discard',
    awaitingDiscard: true,
    drawnTileId: null,
    pendingRonTile: null,
    pendingReactionEvents: [],
    riichiDeclareMode: false,
    lastFeedback: 'チー成立！',
    callLogs: [...state.callLogs, {
      turnIndex: event.turnIndex,
      type,
      targetTile: event.tile,
      targetPlayer: event.actor,
      success: true,
      reason: 'チー成立',
    }],
  }
}

export function getRiichiWaitTiles(state: GameState): ImprovementTile[] {
  if (!state.playerRiichi || state.riichiWaitTiles.length === 0) return []
  const visibleCounts = toCounts([
    ...state.players[0].hand,
    ...getVisibleTiles(state),
  ])
  return state.riichiWaitTiles.map((code) => ({
    code,
    remaining: Math.max(0, 4 - visibleCounts[CODE_ORDER.get(code) ?? 0]),
  }))
}

export function canDeclareTsumo(state: GameState): boolean {
  return state.status === 'playing'
    && state.phase === 'player_discard'
    && state.currentPlayer === 0
    && state.playerRiichi
    && state.awaitingDiscard
    && isWinningHand(state.players[0].hand, state.players[0].melds.length)
}

export function declareWin(state: GameState, type: 'tsumo' | 'ron'): GameState {
  const allowed = type === 'tsumo' ? canDeclareTsumo(state) : Boolean(state.pendingRonTile)
  if (!allowed) return state
  const winningHand = type === 'ron' && state.pendingRonTile
    ? [...state.players[0].hand, state.pendingRonTile]
    : state.players[0].hand
  const roundScore = calculateWinningScore(winningHand, type, {
    riichi: state.playerRiichi,
    playerWind: state.players[0].wind,
    roundWind: ROUND_WIND,
  })
  return {
    ...state,
    status: 'win',
    phase: 'win',
    winType: type,
    roundScore,
    winningHand: sortTiles(winningHand),
    awaitingDiscard: false,
    riichiDeclareMode: false,
    pendingRonTile: null,
    lastFeedback: type === 'tsumo' ? 'ツモ！' : 'ロン！',
  }
}

function tileUtility(tile: Tile, hand: Tile[]): number {
  const copies = hand.filter((candidate) => candidate.code === tile.code).length
  if (tile.code.length === 1) return copies > 1 ? copies * 5 : 0

  const number = Number(tile.code[0])
  const suit = tile.code[1]
  const nearby = hand.reduce((score, candidate) => {
    if (candidate.code.length === 1 || candidate.code[1] !== suit) return score
    const distance = Math.abs(Number(candidate.code[0]) - number)
    if (distance === 1) return score + 3
    if (distance === 2) return score + 1
    return score
  }, 0)

  return copies * 5 + nearby + (number === 1 || number === 9 ? -0.5 : 0)
}

export function chooseAutomaticDiscard(hand: Tile[], random: () => number = Math.random): Tile {
  const scored = hand.map((tile) => ({ tile, score: tileUtility(tile, hand) }))
  const lowest = Math.min(...scored.map(({ score }) => score))
  const candidates = scored.filter(({ score }) => score === lowest)
  return candidates[Math.floor(random() * candidates.length)].tile
}

export function playAutomaticTurn(
  state: GameState,
  random: () => number = Math.random,
): GameState {
  if (
    state.currentPlayer === 0
    || state.status !== 'playing'
    || state.phase !== 'enemy_auto'
    || state.pendingRonTile
  ) return state
  const afterDraw = beginTurn(state)
  if (afterDraw.status !== 'playing' || !afterDraw.awaitingDiscard) return afterDraw
  const hand = afterDraw.players[afterDraw.currentPlayer].hand
  return applyDiscard(afterDraw, chooseAutomaticDiscard(hand, random).id)
}

export function tileName(code: TileCode): string {
  const honors: Record<string, string> = {
    E: '東', S: '南', W: '西', N: '北', P: '白', F: '發', C: '中',
  }
  if (honors[code]) return honors[code]
  const suits: Record<string, string> = { m: '萬', p: '筒', s: '索' }
  return `${code[0]}${suits[code[1]]}`
}
