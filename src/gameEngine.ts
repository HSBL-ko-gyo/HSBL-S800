export const SUIT_CODES = [
  '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m',
  '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p',
  '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s',
] as const

export const HONOR_CODES = ['E', 'S', 'W', 'N', 'P', 'F', 'C'] as const
export const TILE_CODES = [...SUIT_CODES, ...HONOR_CODES] as const

export type TileCode = (typeof TILE_CODES)[number]
export type Wind = '東' | '南' | '西' | '北'

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

export interface GameState {
  status: 'playing' | 'draw'
  wall: Tile[]
  players: PlayerState[]
  currentPlayer: number
  awaitingDiscard: boolean
  drawnTileId: string | null
  turnNumber: number
  lastDiscard: { playerIndex: number; tileId: string } | null
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

export function createInitialGame(random: () => number = Math.random): GameState {
  const wall = shuffleTiles(createTileSet(), random)
  const players: PlayerState[] = PLAYER_DATA.map((player) => ({
    ...player,
    hand: [],
    river: [],
  }))

  for (let round = 0; round < 13; round += 1) {
    for (const player of players) {
      const tile = wall.pop()
      if (tile) player.hand.push(tile)
    }
  }

  return {
    status: 'playing',
    wall,
    players: players.map((player) => ({ ...player, hand: sortTiles(player.hand) })),
    currentPlayer: 0,
    awaitingDiscard: false,
    drawnTileId: null,
    turnNumber: 0,
    lastDiscard: null,
  }
}

export function beginTurn(state: GameState): GameState {
  if (state.status !== 'playing' || state.awaitingDiscard) return state
  if (state.wall.length === 0) return { ...state, status: 'draw', drawnTileId: null }

  const wall = [...state.wall]
  const drawnTile = wall.pop()!
  const players = state.players.map((player, index) =>
    index === state.currentPlayer
      ? { ...player, hand: [...player.hand, drawnTile] }
      : player,
  )

  return {
    ...state,
    wall,
    players,
    awaitingDiscard: true,
    drawnTileId: drawnTile.id,
  }
}

export function discardTile(state: GameState, tileId: string): GameState {
  if (state.status !== 'playing' || !state.awaitingDiscard) return state

  const player = state.players[state.currentPlayer]
  const discarded = player.hand.find((tile) => tile.id === tileId)
  if (!discarded) return state

  const playerIndex = state.currentPlayer
  const players = state.players.map((item, index) => {
    if (index !== playerIndex) return item
    return {
      ...item,
      hand: sortTiles(item.hand.filter((tile) => tile.id !== tileId)),
      river: [...item.river, discarded],
    }
  })

  return {
    ...state,
    players,
    currentPlayer: (playerIndex + 1) % players.length,
    awaitingDiscard: false,
    drawnTileId: null,
    turnNumber: state.turnNumber + 1,
    lastDiscard: { playerIndex, tileId },
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
  if (state.currentPlayer === 0 || state.status !== 'playing') return state
  const afterDraw = beginTurn(state)
  if (afterDraw.status !== 'playing' || !afterDraw.awaitingDiscard) return afterDraw
  const hand = afterDraw.players[afterDraw.currentPlayer].hand
  return discardTile(afterDraw, chooseAutomaticDiscard(hand, random).id)
}

export function tileName(code: TileCode): string {
  const honors: Record<string, string> = {
    E: '東', S: '南', W: '西', N: '北', P: '白', F: '發', C: '中',
  }
  if (honors[code]) return honors[code]
  const suits: Record<string, string> = { m: '萬', p: '筒', s: '索' }
  return `${code[0]}${suits[code[1]]}`
}
