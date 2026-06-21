import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TableView } from '../components/TableView'
import {
  autoDiscardRiichiDraw,
  beginTurn,
  canDeclareTsumo,
  createInitialGame,
  createTile,
  declareReaction,
  declareWin,
  discardHumanTile,
  discardTile,
  getFuritenInfo,
  playAutomaticTurn,
  setRiichiDeclareMode,
  skipReactionReview,
  startReactionDeclaration,
  type GameState,
  type PlayerId,
  type TileCode,
} from '../gameEngine'
import { createStateFromFixture } from '../testFixtures/createStateFromFixture'
import { RULES } from './ruleRegistry'
import { validateGameState } from './validateGameState'
import ruleCases from '../../docs/rule-cases.md?raw'
import ruleset from '../../docs/ruleset.md?raw'

const fixedRandom = () => 0.42
const tenpaiBase: TileCode[] = [
  '1m', '2m', '3m',
  '1p', '2p', '3p',
  '1s', '2s', '3s',
  '7s', '8s', '9s',
  '5m',
]

const tableHandlers = {
  onDiscard: () => undefined,
  onRiichiMode: () => undefined,
  onCallsDisabledMode: () => undefined,
  onTsumo: () => undefined,
  onRon: () => undefined,
  onStartReaction: () => undefined,
  onSkipReactions: () => undefined,
  onDeclareReaction: () => undefined,
  onRestart: () => undefined,
}

function enemyDiscardState(humanHand: TileCode[], discardCode: TileCode, actor: PlayerId = 3): GameState {
  const players = [{ hand: humanHand }, { hand: [] }, { hand: [] }, { hand: [] }]
  players[actor] = { hand: [discardCode] }
  const state = createStateFromFixture({
    players,
    currentPlayer: actor,
    phase: 'enemy_auto',
    awaitingDiscard: true,
    drawnTileIndex: 0,
  })
  const discarded = createTile(discardCode, `enemy-${actor}`)
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === actor ? { ...player, hand: [discarded] } : player,
    ),
    drawnTileId: discarded.id,
  }
}

function addHumanRiver(state: GameState, codes: TileCode[]): GameState {
  return {
    ...state,
    players: state.players.map((player, index) => index === 0
      ? {
          ...player,
          river: codes.map((code, riverIndex) => ({
            id: `human-river-${riverIndex}-${code}`,
            tile: createTile(code, `human-river-${riverIndex}`),
            actor: 0 as PlayerId,
          })),
        }
      : player),
  }
}

function rule(id: string) {
  return RULES.find((item) => item.id === id)
}

describe('rule registry and docs', () => {
  it('documents kan as unsupported in docs and the TypeScript registry', () => {
    expect(ruleset).toContain('暗槓')
    expect(ruleset).toContain('カンは現時点では宣言できない')
    expect(rule('R-KAN-001')).toMatchObject({ status: 'unsupported', category: 'kan' })
    expect(rule('R-WALL-003')).toMatchObject({ status: 'temporary', category: 'wall' })
  })

  it('keeps rule cases and registry ids available for tests and logs', () => {
    for (const id of ['R-WALL-001', 'R-RIICHI-001', 'R-CALL-001', 'R-FURITEN-001', 'R-KAN-001', 'R-DEBUG-002']) {
      expect(ruleCases).toContain(id)
      expect(rule(id)).toBeDefined()
    }
  })
})

describe('validateGameState', () => {
  it('passes after createInitialGame, beginTurn, discardTile, and automatic turns', () => {
    let game = createInitialGame(fixedRandom)
    expect(validateGameState(game)).toEqual([])

    game = beginTurn(game)
    expect(validateGameState(game)).toEqual([])

    game = discardTile(game, game.players[0].hand[0].id)
    expect(validateGameState(game)).toEqual([])

    for (let step = 0; step < 8 && game.status === 'playing'; step += 1) {
      if (game.phase === 'reaction_review' || game.phase === 'declare_reaction') {
        game = skipReactionReview(game)
      } else if (game.currentPlayer === 0) {
        game = beginTurn(game)
        if (game.status === 'playing') game = discardTile(game, game.players[0].hand[0].id)
      } else {
        game = playAutomaticTurn(game, fixedRandom)
      }
      expect(validateGameState(game)).toEqual([])
    }
  })

  it('keeps wall and deadWall counts stable across a normal draw', () => {
    const game = createInitialGame(fixedRandom)
    expect(game.wall.length + game.deadWall.length).toBe(84)
    expect(game.deadWall).toHaveLength(14)

    const drawn = beginTurn(game)
    expect(drawn.wall.length + drawn.deadWall.length).toBe(83)
    expect(drawn.deadWall).toHaveLength(14)
    expect(validateGameState(drawn)).toEqual([])
  })

  it('detects five copies of the same TileCode', () => {
    const invalid = createStateFromFixture({
      players: [{ hand: ['1m', '1m', '1m', '1m', '1m'] }],
      currentPlayer: 0,
      phase: 'player_draw',
    })
    expect(validateGameState(invalid).map((violation) => violation.ruleId)).toContain('R-WALL-002')
  })

  it('does not double count called river tiles against meld tiles', () => {
    const review = discardTile(
      enemyDiscardState(['5m', '5m', '1p', '2p', '3p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S'], '5m'),
      '5m-enemy-3',
    )
    const called = declareReaction(startReactionDeclaration(review), 'pon', review.pendingReactionEvents[0].id)
    expect(called.players[3].river[0].calledBy).toBe(0)
    expect(called.players[0].melds[0].tiles).toHaveLength(3)
    expect(validateGameState(called)).toEqual([])
  })

  it('allows pending reaction candidates to accumulate during enemy_auto until the player boundary', () => {
    const early = discardTile(
      enemyDiscardState(['5m', '5m', '1p', '2p', '3p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S'], '5m', 1),
      '5m-enemy-1',
    )
    expect(early.phase).toBe('enemy_auto')
    expect(early.pendingReactionEvents).toHaveLength(1)
    expect(validateGameState(early)).toEqual([])
  })

  it('detects phase, drawn tile, and kan-state violations', () => {
    const base = createInitialGame(fixedRandom)
    const invalidPhase: GameState = { ...base, phase: 'player_draw', awaitingDiscard: true }
    const invalidDrawn: GameState = { ...base, drawnTileId: 'missing-tile-id' }
    const kanState: GameState = {
      ...base,
      players: base.players.map((player, index) => index === 0
        ? {
            ...player,
            melds: [{
              type: 'kan',
              tiles: ['1m', '1m', '1m', '1m'].map((code, tileIndex) => createTile(code as TileCode, `kan-${tileIndex}`)),
              calledTile: createTile('1m', 'kan-called'),
              from: 1,
            }],
          }
        : player),
    }

    expect(validateGameState(invalidPhase).map((violation) => violation.ruleId)).toContain('R-DISCARD-001')
    expect(validateGameState(invalidDrawn).map((violation) => violation.ruleId)).toContain('R-DISCARD-002')
    expect(validateGameState(kanState).map((violation) => violation.ruleId)).toContain('R-KAN-001')
  })

  it('detects furiten reaction event inconsistencies', () => {
    const review = discardTile(enemyDiscardState(tenpaiBase, '5m'), '5m-enemy-3')
    const invalidCanRon: GameState = {
      ...review,
      pendingReactionEvents: [{
        ...review.pendingReactionEvents[0],
        canRon: true,
        furitenInfo: {
          isFuriten: true,
          discardFuriten: true,
          temporaryFuriten: false,
          riichiFuriten: false,
          waitTiles: ['5m'],
          discardedWaitTiles: ['5m'],
          reason: 'discard',
        },
      }],
    }
    const unexplainedBlocked: GameState = {
      ...review,
      pendingReactionEvents: [{
        ...review.pendingReactionEvents[0],
        canRon: false,
        rawCanRon: true,
        ronBlockedReason: undefined,
      }],
    }

    expect(validateGameState(invalidCanRon).map((violation) => violation.ruleId)).toContain('R-FURITEN-006')
    expect(validateGameState(unexplainedBlocked).map((violation) => violation.ruleId)).toContain('R-FURITEN-006')
  })
})

describe('rule case behavior', () => {
  it('keeps riichi tsumogiri restrictions and event logs', () => {
    const state = createStateFromFixture({
      players: [{ hand: [...tenpaiBase, 'E'] }],
      currentPlayer: 0,
      phase: 'player_discard',
      awaitingDiscard: true,
      drawnTileIndex: 13,
    })
    const declaring = setRiichiDeclareMode(state, true)
    const riichi = discardHumanTile(declaring, declaring.players[0].hand[13].id)
    expect(riichi.playerRiichi).toBe(true)
    expect(riichi.eventLog.some((event) => event.type === 'DISCARD')).toBe(true)
    expect(riichi.eventLog.some((event) => event.type === 'DECLARE_RIICHI')).toBe(true)

    const drawnCodes: TileCode[] = [...tenpaiBase, 'E']
    const drawnHand = drawnCodes.map((code, index) => createTile(code, `riichi-draw-${index}`))
    const afterDraw: GameState = {
      ...state,
      players: state.players.map((player, index) => index === 0 ? { ...player, hand: drawnHand } : player),
      playerRiichi: true,
      drawnTileId: drawnHand[13].id,
    }
    expect(discardTile(afterDraw, drawnHand[0].id)).toBe(afterDraw)
    const tsumogiri = autoDiscardRiichiDraw(afterDraw)
    expect(tsumogiri.players[0].river.at(-1)?.tile.id).toBe(drawnHand[13].id)
    expect(validateGameState(tsumogiri)).toEqual([])
  })

  it('enters reaction_review for ron, pon, and upper-player chi candidates', () => {
    const ron = discardTile(enemyDiscardState(tenpaiBase, '5m'), '5m-enemy-3')
    expect(ron.phase).toBe('reaction_review')
    expect(ron.pendingReactionEvents[0].canRon).toBe(true)

    const pon = discardTile(
      enemyDiscardState(['5m', '5m', '1p', '2p', '3p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S'], '5m'),
      '5m-enemy-3',
    )
    expect(pon.pendingReactionEvents[0].canPon).toBe(true)

    const chi = discardTile(
      enemyDiscardState(['3m', '4m', '1p', '2p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S', 'W'], '2m'),
      '2m-enemy-3',
    )
    expect(chi.pendingReactionEvents[0].canChi).toBe(true)

    const notKamicha = discardTile(
      enemyDiscardState(['3m', '4m', '1p', '2p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S', 'W'], '2m', 1),
      '2m-enemy-1',
    )
    expect(notKamicha.pendingReactionEvents).toHaveLength(0)
  })

  it('skips reactions and returns to normal player draw flow', () => {
    const review = discardTile(
      enemyDiscardState(['5m', '5m', '1p', '2p', '3p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S'], '5m'),
      '5m-enemy-3',
    )
    const skipped = skipReactionReview(review)
    expect(skipped.phase).toBe('player_draw')
    expect(skipped.pendingReactionEvents).toHaveLength(0)
    expect(validateGameState(skipped)).toEqual([])
  })

  it('returns to player_discard after pon and chi declarations and records eventLog', () => {
    const ponReview = discardTile(
      enemyDiscardState(['5m', '5m', '1p', '2p', '3p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S'], '5m'),
      '5m-enemy-3',
    )
    const pon = declareReaction(startReactionDeclaration(ponReview), 'pon', ponReview.pendingReactionEvents[0].id)
    expect(pon.phase).toBe('player_discard')
    expect(pon.eventLog.at(-1)).toMatchObject({ type: 'DECLARE_CALL', call: 'pon' })

    const chiReview = discardTile(
      enemyDiscardState(['3m', '4m', '1p', '2p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S', 'W'], '2m'),
      '2m-enemy-3',
    )
    const chiEvent = chiReview.pendingReactionEvents[0]
    const chiTiles = chiReview.players[0].hand
      .filter((tile) => tile.code === '3m' || tile.code === '4m')
      .map((tile) => tile.id)
    const chi = declareReaction(startReactionDeclaration(chiReview), 'chi', chiEvent.id, chiTiles)
    expect(chi.phase).toBe('player_discard')
    expect(chi.eventLog.at(-1)).toMatchObject({ type: 'DECLARE_CALL', call: 'chi' })
    expect(validateGameState(chi)).toEqual([])
  })

  it('does not expose kan declaration state or UI actions', () => {
    const review = discardTile(
      enemyDiscardState(['5m', '5m', '5m', '1p', '2p', '3p', '4p', '6p', '8p', '1s', '3s', 'E', 'S'], '5m'),
      '5m-enemy-3',
    )
    expect(review.pendingReactionEvents.some((event) => 'canKan' in event)).toBe(false)
    const html = renderToStaticMarkup(<TableView game={startReactionDeclaration(review)} {...tableHandlers} />)
    expect(html).not.toContain('>カン</button>')
    expect(validateGameState(review)).toEqual([])
  })
})

describe('furiten rules', () => {
  it('blocks ron when any current wait is already in the player river', () => {
    const twoSidedWait: TileCode[] = [
      '1m', '1m',
      '2m', '3m', '4m',
      '2s', '3s', '4s',
      '7s', '8s', '9s',
      '4p', '5p',
    ]
    const beforeDiscard = addHumanRiver(enemyDiscardState(twoSidedWait, '6p'), ['3p'])
    const review = discardTile(beforeDiscard, '6p-enemy-3')
    const event = review.pendingReactionEvents[0]
    const info = getFuritenInfo(review, 0)

    expect(info.waitTiles).toEqual(expect.arrayContaining(['3p', '6p']))
    expect(info.discardedWaitTiles).toEqual(['3p'])
    expect(event.rawCanRon).toBe(true)
    expect(event.canRon).toBe(false)
    expect(event.ronBlockedReason).toBe('furiten')
    expect(event.furitenInfo?.reason).toBe('discard')
    expect(review.pendingRonTile).toBeNull()
    expect(review.eventLog.some((item) => item.type === 'RON_BLOCKED_BY_FURITEN')).toBe(true)

    const declaring = startReactionDeclaration(review)
    const html = renderToStaticMarkup(<TableView game={declaring} {...tableHandlers} />)
    expect(html).toContain('ロン不可')
    expect(html).toContain('自分の捨て牌に待ち牌があります')

    const blocked = declareReaction(declaring, 'ron', event.id)
    expect(blocked.status).toBe('playing')
    expect(blocked.lastFeedback).toBe('フリテンのためロンできません')
  })

  it('starts temporary furiten after skipping a ron and clears it on the next player draw', () => {
    const review = discardTile(enemyDiscardState(tenpaiBase, '5m'), '5m-enemy-3')
    expect(review.pendingReactionEvents[0].canRon).toBe(true)

    const skipped = skipReactionReview(review)
    expect(skipped.temporaryFuriten).toBe(true)
    expect(skipped.eventLog.at(-1)).toMatchObject({ type: 'TEMP_FURITEN_START', player: 0 })

    const blockedReview = discardTile(
      { ...enemyDiscardState(tenpaiBase, '5m'), temporaryFuriten: true },
      '5m-enemy-3',
    )
    expect(blockedReview.pendingReactionEvents[0]).toMatchObject({
      rawCanRon: true,
      canRon: false,
      ronBlockedReason: 'furiten',
    })
    expect(blockedReview.pendingReactionEvents[0].furitenInfo?.reason).toBe('temporary')

    const drawn = beginTurn(skipped)
    expect(drawn.temporaryFuriten).toBe(false)
    expect(drawn.eventLog.some((event) => event.type === 'TEMP_FURITEN_CLEAR')).toBe(true)
  })

  it('does not start missed-ron furiten when the skipped ron candidate was already blocked by discard furiten', () => {
    const twoSidedWait: TileCode[] = [
      '1m', '1m',
      '2m', '3m', '4m',
      '2s', '3s', '4s',
      '7s', '8s', '9s',
      '4p', '5p',
    ]
    const review = discardTile(addHumanRiver(enemyDiscardState(twoSidedWait, '6p'), ['3p']), '6p-enemy-3')
    expect(review.pendingReactionEvents[0]).toMatchObject({
      rawCanRon: true,
      canRon: false,
      ronBlockedReason: 'furiten',
    })

    const skipped = skipReactionReview(review)
    expect(skipped.temporaryFuriten).toBe(false)
    expect(skipped.riichiFuriten).toBe(false)
    expect(skipped.eventLog.some((event) => event.type === 'TEMP_FURITEN_START')).toBe(false)
    expect(skipped.eventLog.some((event) => event.type === 'RIICHI_FURITEN_START')).toBe(false)
  })

  it('keeps riichi furiten after skipping a ron until the round ends', () => {
    const review = discardTile({ ...enemyDiscardState(tenpaiBase, '5m'), playerRiichi: true }, '5m-enemy-3')
    expect(review.pendingReactionEvents[0].canRon).toBe(true)

    const skipped = skipReactionReview(review)
    expect(skipped.riichiFuriten).toBe(true)
    expect(skipped.eventLog.at(-1)).toMatchObject({ type: 'RIICHI_FURITEN_START', player: 0 })

    const drawn = beginTurn(skipped)
    expect(drawn.riichiFuriten).toBe(true)

    const blockedReview = discardTile(
      { ...enemyDiscardState(tenpaiBase, '5m'), playerRiichi: true, riichiFuriten: true },
      '5m-enemy-3',
    )
    expect(blockedReview.pendingReactionEvents[0]).toMatchObject({
      rawCanRon: true,
      canRon: false,
      ronBlockedReason: 'furiten',
    })
    expect(blockedReview.pendingReactionEvents[0].furitenInfo?.reason).toBe('riichi')
  })

  it('allows tsumo while furiten', () => {
    const winCodes: TileCode[] = [...tenpaiBase, '5m']
    const hand = winCodes.map((code, index) => createTile(code, `furiten-tsumo-${index}`))
    const state: GameState = {
      ...createInitialGame(fixedRandom),
      players: createInitialGame(fixedRandom).players.map((player, index) => index === 0 ? { ...player, hand } : player),
      currentPlayer: 0,
      phase: 'player_discard',
      awaitingDiscard: true,
      drawnTileId: hand[13].id,
      playerRiichi: true,
      riichiFuriten: true,
    }

    expect(canDeclareTsumo(state)).toBe(true)
    const won = declareWin(state, 'tsumo')
    expect(won.status).toBe('win')
    expect(won.winType).toBe('tsumo')
  })
})
