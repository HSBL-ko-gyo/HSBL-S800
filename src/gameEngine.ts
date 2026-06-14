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

export interface PlayerState {
  name: string
  wind: Wind
  hand: Tile[]
  river: Tile[]
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
  rank: number
  optionCount: number
  postHand: Tile[]
}

export interface DiscardExplanation {
  discard: Tile
  shanten: number
  improvementTypeCount: number
  improvementTileCount: number
  rank: number
  optionCount: number
  canRiichi: boolean
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
  explanation: string
}

export interface GameState {
  status: 'playing' | 'draw' | 'win'
  winType: 'tsumo' | 'ron' | null
  wall: Tile[]
  players: PlayerState[]
  currentPlayer: number
  awaitingDiscard: boolean
  drawnTileId: string | null
  turnNumber: number
  lastDiscard: { playerIndex: number; tileId: string } | null
  playerRiichi: boolean
  riichiDeclareMode: boolean
  lastFeedback: string | null
  lastExplanation: DiscardExplanation | null
  discardLogs: DiscardLog[]
  pendingRonTile: Tile | null
}

const PLAYER_DATA: Array<{ name: string; wind: Wind }> = [
  { name: 'あなた', wind: '東' },
  { name: '下家', wind: '南' },
  { name: '対面', wind: '西' },
  { name: '上家', wind: '北' },
]

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

function standardShanten(tiles: Array<Tile | TileCode>): number {
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

  search(0, 0, 0, 0)
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

export function calculateShanten(hand: Array<Tile | TileCode>): number {
  return Math.min(
    standardShanten(hand),
    sevenPairsShanten(hand),
    thirteenOrphansShanten(hand),
  )
}

export function isTenpai(hand13: Array<Tile | TileCode>): boolean {
  return hand13.length % 3 === 1 && calculateShanten(hand13) === 0
}

export function isWinningHand(hand14: Array<Tile | TileCode>): boolean {
  return hand14.length % 3 === 2 && calculateShanten(hand14) === -1
}

export function getWaitTiles(
  hand: Array<Tile | TileCode>,
  visibleTiles: Array<Tile | TileCode> = [],
): ImprovementTile[] {
  const baseShanten = calculateShanten(hand)
  const visibleCounts = toCounts([...hand, ...visibleTiles])

  return TILE_CODES.flatMap((code, index) => {
    if (visibleCounts[index] >= 4) return []
    const nextShanten = calculateShanten([...hand, code])
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
  if (pairCount >= 4) hints.push('七対子候補')

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
  if (a.improvementTileCount !== b.improvementTileCount) {
    return b.improvementTileCount - a.improvementTileCount
  }
  return b.improvementTypeCount - a.improvementTypeCount
}

export function analyzeDiscardOptions(
  hand14: Tile[],
  visibleTiles: Tile[] = [],
): DiscardOptionAnalysis[] {
  const byCode = new Map<TileCode, Tile>()
  for (const tile of hand14) if (!byCode.has(tile.code)) byCode.set(tile.code, tile)

  const raw = [...byCode.values()].map((discard) => {
    const postHand = sortTiles(hand14.filter((tile) => tile.id !== discard.id))
    const improvementTiles = getWaitTiles(postHand, [...visibleTiles, discard])
    return {
      discard,
      shanten: calculateShanten(postHand),
      improvementTiles,
      improvementTypeCount: improvementTiles.length,
      improvementTileCount: improvementTiles.reduce((sum, tile) => sum + tile.remaining, 0),
      yakuHints: getYakuHints(postHand),
      canRiichi: isTenpai(postHand),
      rank: 0,
      optionCount: byCode.size,
      postHand,
    }
  })

  const sorted = [...raw].sort(compareOptions)
  return raw.map((option) => ({
    ...option,
    rank: sorted.findIndex((candidate) => candidate.discard.code === option.discard.code) + 1,
  }))
}

function shapeExplanation(selected: DiscardOptionAnalysis, hand14: Tile[]): string {
  const code = selected.discard.code
  const copiesBefore = hand14.filter((tile) => tile.code === code).length
  if (code.length === 1) {
    return copiesBefore >= 2
      ? '字牌の対子候補を手放す選択です。'
      : '孤立した字牌を処理し、数牌の形を残します。'
  }

  const number = Number(code[0])
  const suit = code[1]
  const nearby = selected.postHand.filter((tile) =>
    tile.code.length === 2
    && tile.code[1] === suit
    && Math.abs(Number(tile.code[0]) - number) <= 2,
  ).length

  if ((number === 1 || number === 9) && nearby === 0) {
    return '孤立した端牌を処理して、中張牌の連続形を残します。'
  }
  if (nearby === 0) return '孤立牌を処理し、つながっている牌を優先します。'
  if (selected.rank === 1) return '受け入れを広く保ち、両面候補を残す打牌です。'
  return '近い数牌とのつながりを一部手放す選択です。'
}

export function shantenLabel(shanten: number): string {
  if (shanten < 0) return '和了'
  if (shanten === 0) return 'テンパイ'
  return `${shanten}シャンテン`
}

export function buildDiscardExplanation(
  selectedDiscard: Tile,
  analysis: DiscardOptionAnalysis[],
  hand14: Tile[],
): DiscardExplanation {
  const selected = analysis.find((option) => option.discard.code === selectedDiscard.code)
  if (!selected) throw new Error('Selected discard was not analyzed')

  const quality = selected.rank === 1
    ? '候補内で受け入れ最大。'
    : selected.rank <= Math.ceil(selected.optionCount / 2)
      ? `候補${selected.optionCount}種中${selected.rank}番手。`
      : `候補${selected.optionCount}種中${selected.rank}番手で、受け入れはやや狭め。`
  const reachText = selected.canRiichi ? ' 今の打牌、リーチできたよ。' : ''
  const summary = `${tileName(selected.discard.code)}切り: ${shantenLabel(selected.shanten)}。受け入れ${selected.improvementTypeCount}種${selected.improvementTileCount}枚。`
  const detail = `${quality}${shapeExplanation(selected, hand14)}${reachText}`

  return {
    discard: selected.discard,
    shanten: selected.shanten,
    improvementTypeCount: selected.improvementTypeCount,
    improvementTileCount: selected.improvementTileCount,
    rank: selected.rank,
    optionCount: selected.optionCount,
    canRiichi: selected.canRiichi,
    summary,
    detail,
  }
}

export function getVisibleTiles(state: GameState): Tile[] {
  return state.players.flatMap((player) => player.river)
}

export function createInitialGame(random: () => number = Math.random): GameState {
  const wall = shuffleTiles(createTileSet(), random)
  const players: PlayerState[] = PLAYER_DATA.map((player) => ({ ...player, hand: [], river: [] }))

  for (let round = 0; round < 13; round += 1) {
    for (const player of players) {
      const tile = wall.pop()
      if (tile) player.hand.push(tile)
    }
  }

  return {
    status: 'playing',
    winType: null,
    wall,
    players: players.map((player) => ({ ...player, hand: sortTiles(player.hand) })),
    currentPlayer: 0,
    awaitingDiscard: false,
    drawnTileId: null,
    turnNumber: 0,
    lastDiscard: null,
    playerRiichi: false,
    riichiDeclareMode: false,
    lastFeedback: null,
    lastExplanation: null,
    discardLogs: [],
    pendingRonTile: null,
  }
}

export function beginTurn(state: GameState): GameState {
  if (state.status !== 'playing' || state.awaitingDiscard || state.pendingRonTile) return state
  if (state.wall.length === 0) {
    return { ...state, status: 'draw', drawnTileId: null, riichiDeclareMode: false }
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
  }
}

function applyDiscard(state: GameState, tileId: string): GameState {
  if (state.status !== 'playing' || !state.awaitingDiscard || state.pendingRonTile) return state

  const player = state.players[state.currentPlayer]
  const discarded = player.hand.find((tile) => tile.id === tileId)
  if (!discarded) return state

  const playerIndex = state.currentPlayer
  const players = state.players.map((item, index) => index === playerIndex
    ? {
        ...item,
        hand: sortTiles(item.hand.filter((tile) => tile.id !== tileId)),
        river: [...item.river, discarded],
      }
    : item)
  const pendingRonTile = playerIndex !== 0
    && state.playerRiichi
    && isWinningHand([...players[0].hand, discarded])
      ? discarded
      : null

  return {
    ...state,
    players,
    currentPlayer: (playerIndex + 1) % players.length,
    awaitingDiscard: false,
    drawnTileId: null,
    turnNumber: state.turnNumber + 1,
    lastDiscard: { playerIndex, tileId },
    pendingRonTile,
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
  ) return state
  return { ...state, riichiDeclareMode: enabled, lastFeedback: null }
}

function appendHumanLog(
  stateBefore: GameState,
  stateAfter: GameState,
  selected: DiscardOptionAnalysis,
  explanation: DiscardExplanation,
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
    wasRiichiPossible: selected.canRiichi,
    declaredRiichi,
    explanation: `${explanation.summary} ${explanation.detail}`,
  }
  return {
    ...stateAfter,
    discardLogs: [...stateBefore.discardLogs, log],
    lastExplanation: explanation,
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
  const analysis = analyzeDiscardOptions(hand14, getVisibleTiles(state))
  const selected = analysis.find((option) => option.discard.code === discarded.code)!

  if (state.riichiDeclareMode && !selected.canRiichi) {
    return {
      ...state,
      riichiDeclareMode: false,
      lastFeedback: 'その牌ではリーチできません',
    }
  }

  const declaredRiichi = state.riichiDeclareMode && selected.canRiichi
  const explanation = buildDiscardExplanation(discarded, analysis, hand14)
  const discardedState = applyDiscard(state, tileId)
  const withLog = appendHumanLog(state, discardedState, selected, explanation, declaredRiichi)
  return {
    ...withLog,
    playerRiichi: state.playerRiichi || declaredRiichi,
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
    || isWinningHand(state.players[0].hand)
  ) return state

  const hand14 = state.players[0].hand
  const discarded = hand14.find((tile) => tile.id === state.drawnTileId)!
  const analysis = analyzeDiscardOptions(hand14, getVisibleTiles(state))
  const selected = analysis.find((option) => option.discard.code === discarded.code)!
  const explanation = buildDiscardExplanation(discarded, analysis, hand14)
  return appendHumanLog(state, applyDiscard(state, discarded.id), selected, explanation, false)
}

export function canDeclareTsumo(state: GameState): boolean {
  return state.status === 'playing'
    && state.currentPlayer === 0
    && state.playerRiichi
    && state.awaitingDiscard
    && isWinningHand(state.players[0].hand)
}

export function declareWin(state: GameState, type: 'tsumo' | 'ron'): GameState {
  const allowed = type === 'tsumo' ? canDeclareTsumo(state) : Boolean(state.pendingRonTile)
  if (!allowed) return state
  return {
    ...state,
    status: 'win',
    winType: type,
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
  if (state.currentPlayer === 0 || state.status !== 'playing' || state.pendingRonTile) return state
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
