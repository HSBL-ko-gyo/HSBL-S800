import {
  createInitialGame,
  createTile,
  sortTiles,
  type GamePhase,
  type GameState,
  type PlayerId,
  type Tile,
  type TileCode,
} from '../gameEngine'

interface PlayerFixture {
  hand?: TileCode[]
}

interface StateFixture {
  wall?: TileCode[]
  deadWall?: TileCode[]
  players?: PlayerFixture[]
  currentPlayer?: PlayerId
  phase?: GamePhase
  awaitingDiscard?: boolean
  drawnTileIndex?: number | null
}

function codesToTiles(codes: TileCode[] = [], prefix: string): Tile[] {
  return codes.map((code, index) => createTile(code, `${prefix}-${index}`))
}

export function createStateFromFixture(fixture: StateFixture): GameState {
  const base = createInitialGame(() => 0.42)
  const wall = codesToTiles(fixture.wall ?? [], 'fixture-wall')
  const deadWall = codesToTiles(fixture.deadWall ?? [], 'fixture-dead')
  const currentPlayer = fixture.currentPlayer ?? base.currentPlayer
  const players = base.players.map((player, index) => {
    const playerFixture = fixture.players?.[index]
    if (!playerFixture?.hand) return { ...player, hand: [], river: [], melds: [] }
    return {
      ...player,
      hand: sortTiles(codesToTiles(playerFixture.hand, `p${index}-hand`)),
      river: [],
      melds: [],
    }
  })
  const drawnTileIndex = fixture.drawnTileIndex ?? null
  const drawnTileId = drawnTileIndex === null
    ? null
    : players[currentPlayer]?.hand[drawnTileIndex]?.id ?? null

  return {
    ...base,
    wall,
    deadWall,
    players,
    currentPlayer,
    phase: fixture.phase ?? 'player_draw',
    awaitingDiscard: fixture.awaitingDiscard ?? false,
    drawnTileId,
    lastDiscard: null,
    pendingRonTile: null,
    temporaryFuriten: false,
    riichiFuriten: false,
    reactionEvents: [],
    pendingReactionEvents: [],
    callLogs: [],
    eventLog: [{ type: 'INIT_GAME', wallCount: wall.length, deadWallCount: deadWall.length }],
  }
}
