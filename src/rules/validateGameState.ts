import type { DiscardRecord, GamePhase, GameState, Tile } from '../gameEngine'
import type { RuleViolation } from './ruleTypes'

const REVIEW_PHASES: GamePhase[] = ['reaction_review', 'declare_reaction']
const DISCARD_WAIT_PHASES: GamePhase[] = ['player_discard', 'enemy_auto']

function addViolation(
  violations: RuleViolation[],
  ruleId: string,
  message: string,
  context?: unknown,
): void {
  violations.push({ ruleId, severity: 'error', message, context })
}

function collectRiverTiles(records: DiscardRecord[]): Tile[] {
  return records.flatMap((record) => record.calledBy === undefined ? [record.tile] : [])
}

function collectPhysicalTiles(state: GameState): Tile[] {
  return [
    ...state.wall,
    ...state.deadWall,
    ...state.players.flatMap((player) => player.hand),
    ...state.players.flatMap((player) => collectRiverTiles(player.river)),
    ...state.players.flatMap((player) => player.melds.flatMap((meld) => meld.tiles)),
  ]
}

export function validateGameState(state: GameState): RuleViolation[] {
  const violations: RuleViolation[] = []

  if (!Number.isInteger(state.currentPlayer) || state.currentPlayer < 0 || state.currentPlayer > 3) {
    addViolation(violations, 'R-TURN-001', 'currentPlayer must be between 0 and 3.', {
      currentPlayer: state.currentPlayer,
    })
  }

  if (state.awaitingDiscard && !DISCARD_WAIT_PHASES.includes(state.phase)) {
    addViolation(violations, 'R-DISCARD-001', 'awaitingDiscard is true outside a discard-capable phase.', {
      phase: state.phase,
      awaitingDiscard: state.awaitingDiscard,
    })
  }

  if (state.phase === 'player_discard' && !state.awaitingDiscard) {
    addViolation(violations, 'R-DISCARD-001', 'player_discard phase must wait for a discard.', {
      phase: state.phase,
      awaitingDiscard: state.awaitingDiscard,
    })
  }

  if ((state.phase === 'win' || state.phase === 'draw') && state.awaitingDiscard) {
    addViolation(violations, 'R-DISCARD-001', 'completed rounds cannot still wait for a discard.', {
      phase: state.phase,
      awaitingDiscard: state.awaitingDiscard,
    })
  }

  if (state.drawnTileId) {
    const currentHand = state.players[state.currentPlayer]?.hand ?? []
    if (!currentHand.some((tile) => tile.id === state.drawnTileId)) {
      addViolation(violations, 'R-DISCARD-002', 'drawnTileId is not present in the current player hand.', {
        currentPlayer: state.currentPlayer,
        drawnTileId: state.drawnTileId,
      })
    }
  }

  const pendingReactionsAllowedDuringEnemyTurn =
    state.currentPlayer !== 0 && (state.phase === 'enemy_auto' || state.phase === 'player_discard')
  if (
    state.pendingReactionEvents.length > 0
    && !REVIEW_PHASES.includes(state.phase)
    && !pendingReactionsAllowedDuringEnemyTurn
  ) {
    addViolation(violations, 'R-CALL-003', 'pendingReactionEvents exist outside reaction phases.', {
      phase: state.phase,
      pendingReactionEvents: state.pendingReactionEvents.length,
    })
  }

  const physicalTiles = collectPhysicalTiles(state)
  const ids = new Map<string, number>()
  const codes = new Map<string, number>()

  for (const tile of physicalTiles) {
    ids.set(tile.id, (ids.get(tile.id) ?? 0) + 1)
    codes.set(tile.code, (codes.get(tile.code) ?? 0) + 1)
  }

  const duplicatedIds = [...ids.entries()].filter(([, count]) => count > 1)
  if (duplicatedIds.length > 0) {
    addViolation(violations, 'R-WALL-001', 'A physical tile id is counted more than once.', {
      duplicatedIds,
    })
  }

  const impossibleCodes = [...codes.entries()].filter(([, count]) => count > 4)
  if (impossibleCodes.length > 0) {
    addViolation(violations, 'R-WALL-002', 'A TileCode appears five or more times in physical tiles.', {
      impossibleCodes,
    })
  }

  if (physicalTiles.length > 136) {
    addViolation(violations, 'R-WALL-001', 'Physical tile count exceeds 136.', {
      physicalTileCount: physicalTiles.length,
    })
  }

  if (state.deadWall.length > 14) {
    addViolation(violations, 'R-WALL-003', 'deadWall cannot contain more than 14 tiles.', {
      deadWallCount: state.deadWall.length,
    })
  }

  if (
    state.status === 'playing'
    && state.playerRiichi
    && state.currentPlayer === 0
    && state.awaitingDiscard
    && !state.drawnTileId
  ) {
    addViolation(violations, 'R-RIICHI-001', 'Riichi discard wait must preserve the drawn tile id.', {
      currentPlayer: state.currentPlayer,
      playerRiichi: state.playerRiichi,
      drawnTileId: state.drawnTileId,
    })
  }

  if (state.riichiFuriten && !state.playerRiichi) {
    addViolation(violations, 'R-FURITEN-003', 'riichiFuriten requires playerRiichi.', {
      playerRiichi: state.playerRiichi,
      riichiFuriten: state.riichiFuriten,
    })
  }

  const inconsistentRonEvents = state.pendingReactionEvents.filter((event) =>
    event.canRon && event.furitenInfo?.isFuriten,
  )
  if (inconsistentRonEvents.length > 0) {
    addViolation(violations, 'R-FURITEN-006', 'ReactionEvent canRon is true while furitenInfo is furiten.', {
      events: inconsistentRonEvents.map((event) => event.id),
    })
  }

  const unexplainedBlockedRonEvents = state.pendingReactionEvents.filter((event) =>
    event.rawCanRon && !event.canRon && event.ronBlockedReason === undefined,
  )
  if (unexplainedBlockedRonEvents.length > 0) {
    addViolation(violations, 'R-FURITEN-006', 'Blocked raw ron events must include ronBlockedReason.', {
      events: unexplainedBlockedRonEvents.map((event) => event.id),
    })
  }

  const kanMelds = state.players.flatMap((player, playerIndex) =>
    player.melds
      .filter((meld) => meld.type === 'kan')
      .map((meld) => ({ playerIndex, tile: meld.calledTile.code })),
  )
  const kanRiverRecords = state.players.flatMap((player, playerIndex) =>
    player.river
      .filter((record) => record.callType === 'kan')
      .map((record) => ({ playerIndex, tile: record.tile.code })),
  )
  const kanEvents = state.pendingReactionEvents.filter((event) =>
    Object.prototype.hasOwnProperty.call(event, 'canKan'),
  )

  if (kanMelds.length > 0 || kanRiverRecords.length > 0 || kanEvents.length > 0) {
    addViolation(violations, 'R-KAN-001', 'Kan state exists while kan is unsupported.', {
      kanMelds,
      kanRiverRecords,
      kanEventCount: kanEvents.length,
    })
  }

  return violations
}
