import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TableView } from './components/TableView'
import {
  analyzeDiscardOptions,
  autoDiscardRiichiDraw,
  buildDiscardExplanation,
  calculateShanten,
  canDeclareTsumo,
  canRiichiAfterDiscard,
  createInitialGame,
  createTile,
  discardHumanTile,
  discardTile,
  getYakuHints,
  isTenpai,
  setRiichiDeclareMode,
  type GameState,
  type Tile,
  type TileCode,
} from './gameEngine'

const codesToTiles = (codes: TileCode[]): Tile[] =>
  codes.map((code, index) => createTile(code, `feature-${index}`))

const tenpaiBase: TileCode[] = [
  '1m', '2m', '3m',
  '1p', '2p', '3p',
  '1s', '2s', '3s',
  '7s', '8s', '9s',
  '5m',
]

function gameWithHand(codes: TileCode[], drawnIndex = codes.length - 1): GameState {
  const game = createInitialGame(() => 0.42)
  const hand = codesToTiles(codes)
  return {
    ...game,
    players: game.players.map((player, index) => index === 0 ? { ...player, hand, river: [] } : player),
    currentPlayer: 0,
    awaitingDiscard: true,
    drawnTileId: hand[drawnIndex]?.id ?? null,
  }
}

describe('riichi learning flow', () => {
  it('recognizes tenpai only after a valid discard', () => {
    const hand = codesToTiles([...tenpaiBase, 'E'])
    expect(isTenpai(hand.slice(0, 13))).toBe(true)
    expect(canRiichiAfterDiscard(hand, hand[13])).toBe(true)
    expect(canRiichiAfterDiscard(hand, hand[0])).toBe(false)
  })

  it('declares riichi and discards when the selected tile is valid', () => {
    const state = setRiichiDeclareMode(gameWithHand([...tenpaiBase, 'E']), true)
    const result = discardHumanTile(state, state.players[0].hand[13].id)
    expect(result.playerRiichi).toBe(true)
    expect(result.players[0].river).toHaveLength(1)
    expect(result.discardLogs[0].declaredRiichi).toBe(true)
  })

  it('does not discard and exits declaration mode when the tile is invalid', () => {
    const state = setRiichiDeclareMode(gameWithHand([...tenpaiBase, 'E']), true)
    const result = discardHumanTile(state, state.players[0].hand[0].id)
    expect(result.playerRiichi).toBe(false)
    expect(result.players[0].river).toHaveLength(0)
    expect(result.riichiDeclareMode).toBe(false)
    expect(result.lastFeedback).toBe('その牌ではリーチできません')
  })

  it('prevents free discards after riichi', () => {
    const state = { ...gameWithHand([...tenpaiBase, 'E']), playerRiichi: true }
    const result = discardTile(state, state.players[0].hand[0].id)
    expect(result).toBe(state)
    expect(result.players[0].river).toHaveLength(0)
  })

  it('automatically tsumogiris a non-winning draw after riichi', () => {
    const state = { ...gameWithHand([...tenpaiBase, 'E']), playerRiichi: true }
    const drawn = state.players[0].hand[13]
    const result = autoDiscardRiichiDraw(state)
    expect(result.players[0].river.at(-1)?.id).toBe(drawn.id)
    expect(result.currentPlayer).toBe(1)
  })

  it('stops for tsumo or ron only when a winning tile is available', () => {
    const tsumoState = { ...gameWithHand([...tenpaiBase, '5m']), playerRiichi: true }
    expect(canDeclareTsumo(tsumoState)).toBe(true)

    const game = createInitialGame(() => 0.42)
    const humanHand = codesToTiles(tenpaiBase)
    const winningDiscard = createTile('5m', 'ron')
    const ronState: GameState = {
      ...game,
      players: game.players.map((player, index) => {
        if (index === 0) return { ...player, hand: humanHand, river: [] }
        if (index === 1) return { ...player, hand: [winningDiscard], river: [] }
        return player
      }),
      currentPlayer: 1,
      awaitingDiscard: true,
      drawnTileId: winningDiscard.id,
      playerRiichi: true,
    }
    expect(discardTile(ronState, winningDiscard.id).pendingRonTile?.code).toBe('5m')
  })

  it('shows post-discard feedback when a normal discard could have declared riichi', () => {
    const state = gameWithHand([...tenpaiBase, 'E'])
    const result = discardHumanTile(state, state.players[0].hand[13].id)
    expect(result.playerRiichi).toBe(false)
    expect(result.lastFeedback).toBe('今の打牌、リーチできたよ')
    expect(result.discardLogs[0].wasRiichiPossible).toBe(true)
  })

  it('does not expose riichi-capable tiles before discard in the UI', () => {
    const state = gameWithHand([...tenpaiBase, 'E'])
    const html = renderToStaticMarkup(
      <TableView
        game={state}
        onDiscard={() => undefined}
        onRiichiMode={() => undefined}
        onTsumo={() => undefined}
        onRon={() => undefined}
        onRestart={() => undefined}
      />,
    )
    expect(html).not.toContain('リーチできたよ')
    expect(html).not.toContain('リーチ可能')
    expect(html).not.toContain('riichi-available')
    expect(html).toContain('リーチ宣言')
  })
})

describe('yaku hints', () => {
  it('suggests tanyao for a middle-tile-heavy hand', () => {
    expect(getYakuHints(['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '6m', '6m', '7p', '8p'])).toContain('断么九')
  })

  it('suggests yakuhai when an honor pair exists', () => {
    expect(getYakuHints(['E', 'E', '2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7p', '8p'])).toContain('役牌候補')
  })

  it('suggests seven pairs when four pairs exist', () => {
    expect(getYakuHints(['2m', '2m', '4m', '4m', '3p', '3p', '5s', '5s', '6s', '7s', '8s', 'E', 'F'])).toContain('七対子候補')
  })

  it('suggests honitsu when the hand strongly favors one suit plus honors', () => {
    expect(getYakuHints(['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', 'E', 'E', 'F', 'C'])).toContain('混一色気味')
  })

  it('never includes riichi as a yaku hint', () => {
    expect(getYakuHints(tenpaiBase).join('')).not.toContain('リーチ')
  })
})

describe('discard explanations', () => {
  it('updates with shanten and acceptance counts after a discard', () => {
    const hand = codesToTiles([...tenpaiBase, 'E'])
    const analysis = analyzeDiscardOptions(hand)
    const explanation = buildDiscardExplanation(hand[13], analysis, hand)
    expect(explanation.summary).toContain('テンパイ')
    expect(explanation.summary).toMatch(/受け入れ\d+種\d+枚/)
    expect(explanation.detail).toContain('リーチできたよ')

    const state = gameWithHand([...tenpaiBase, 'E'])
    const updated = discardHumanTile(state, state.players[0].hand[13].id)
    const html = renderToStaticMarkup(
      <TableView
        game={updated}
        onDiscard={() => undefined}
        onRiichiMode={() => undefined}
        onTsumo={() => undefined}
        onRon={() => undefined}
        onRestart={() => undefined}
      />,
    )
    expect(html).toContain('何切る解説')
    expect(html).toContain('受け入れ')
  })

  it('only mentions riichi for a riichi-capable discard', () => {
    const hand = codesToTiles([...tenpaiBase, 'E'])
    const analysis = analyzeDiscardOptions(hand)
    const invalid = buildDiscardExplanation(hand[0], analysis, hand)
    expect(invalid.detail).not.toContain('リーチできたよ')
    expect(calculateShanten(invalid.discard.code === '1m' ? hand.filter((tile) => tile.id !== invalid.discard.id) : hand)).toBeGreaterThan(0)
  })
})
