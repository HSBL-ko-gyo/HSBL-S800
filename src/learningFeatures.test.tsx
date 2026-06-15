import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TableView } from './components/TableView'
import { TileView } from './components/TileView'
import { YakuInfoPanel } from './components/YakuInfoPanel'
import {
  analyzeDiscardOptions,
  autoDiscardRiichiDraw,
  buildDiscardEvaluation,
  calculateShanten,
  canDeclareTsumo,
  canRiichiAfterDiscard,
  createInitialGame,
  createTile,
  discardHumanTile,
  discardTile,
  getYakuHints,
  getRiichiWaitTiles,
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
    expect(result.discardLogs[0].riichiEstablished).toBe(true)
    expect(result.lastFeedback).toBe('リーチ成立！')
    expect(result.lastEvaluation?.detail).not.toContain('リーチできたよ')
    expect(result.lastEvaluation?.missedRiichiOpportunity).toBe(false)
    expect(getRiichiWaitTiles(result)).toEqual([{ code: '5m', remaining: 3 }])
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
    expect(result.discardLogs.at(-1)?.wasRiichiPossible).toBe(false)
    expect(result.lastEvaluation?.missedRiichiOpportunity).toBe(false)
    expect(result.lastEvaluation?.detail).not.toContain('リーチできたよ')
  })

  it('stops for tsumo or ron only when a winning tile is available', () => {
    const tsumoState = { ...gameWithHand([...tenpaiBase, '5m']), playerRiichi: true }
    expect(canDeclareTsumo(tsumoState)).toBe(true)

    const tsumoHtml = renderToStaticMarkup(
      <TableView
        game={tsumoState}
        onDiscard={() => undefined}
        onRiichiMode={() => undefined}
        onTsumo={() => undefined}
        onRon={() => undefined}
        onRestart={() => undefined}
      />,
    )
    const tsumoHandStart = tsumoHtml.indexOf('<section class="hand-zone"')
    const tsumoHandEnd = tsumoHtml.indexOf('</section>', tsumoHandStart)
    const tsumoHandHtml = tsumoHtml.slice(tsumoHandStart, tsumoHandEnd)
    expect(tsumoHandHtml).toContain('>ツモ</button>')
    expect(tsumoHtml.match(/>ツモ<\/button>/g)).toHaveLength(1)

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
    const pendingRon = discardTile(ronState, winningDiscard.id)
    expect(pendingRon.pendingRonTile?.code).toBe('5m')

    const html = renderToStaticMarkup(
      <TableView
        game={pendingRon}
        onDiscard={() => undefined}
        onRiichiMode={() => undefined}
        onTsumo={() => undefined}
        onRon={() => undefined}
        onRestart={() => undefined}
      />,
    )
    const ronHandStart = html.indexOf('<section class="hand-zone"')
    const ronHandEnd = html.indexOf('</section>', ronHandStart)
    const ronHandHtml = html.slice(ronHandStart, ronHandEnd)
    expect(ronHandHtml).toContain('>ロン</button>')
    expect(html.match(/>ロン<\/button>/g)).toHaveLength(1)
  })

  it('shows post-discard feedback when a normal discard could have declared riichi', () => {
    const state = gameWithHand([...tenpaiBase, 'E'])
    const result = discardHumanTile(state, state.players[0].hand[13].id)
    expect(result.playerRiichi).toBe(false)
    expect(result.lastFeedback).toBe('今の打牌、リーチできたよ')
    expect(result.discardLogs[0].wasRiichiPossible).toBe(true)
    expect(result.discardLogs[0].declaredRiichi).toBe(false)
    expect(result.discardLogs[0].riichiEstablished).toBe(false)
    expect(result.lastEvaluation?.missedRiichiOpportunity).toBe(true)
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
    expect(html).not.toContain('最善候補')
    expect(html).not.toContain('待ち牌答え合わせ')
    expect(html).toContain('リーチ宣言')
  })

  it('renders a static 14-tile overview and a connected 14-tile mobile control rail', () => {
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
    const overviewStart = html.indexOf('<div class="mobile-hand-overview"')
    const railStart = html.indexOf('<div class="hand mobile-hand-rail', overviewStart)
    const desktopStart = html.indexOf('<div class="hand desktop-hand', railStart)
    const overviewHtml = html.slice(overviewStart, railStart)
    const railHtml = html.slice(railStart, desktopStart)

    expect(html).toContain('全体表示・見るだけ')
    expect(html).toContain('拡大操作・ここを横スライド')
    expect(overviewHtml.match(/mobile-overview-slot/g)).toHaveLength(14)
    expect(overviewHtml).not.toContain('<button')
    expect(railHtml.match(/hand-tile-slot/g)).toHaveLength(14)
  })

  it('shows waits after riichi without showing a duplicated missed-riichi message', () => {
    const declaring = setRiichiDeclareMode(gameWithHand([...tenpaiBase, 'E']), true)
    const established = discardHumanTile(declaring, declaring.players[0].hand[13].id)
    const html = renderToStaticMarkup(
      <TableView
        game={established}
        onDiscard={() => undefined}
        onRiichiMode={() => undefined}
        onTsumo={() => undefined}
        onRon={() => undefined}
        onRestart={() => undefined}
      />,
    )
    expect(html).toContain('待ち牌答え合わせ')
    expect(html).toContain('残り')
    expect(html).toContain('リーチ宣言')
    expect(html).not.toContain('リーチ可能だった')
    expect(html).not.toContain('今の打牌、リーチできたよ')
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

describe('discard evaluations', () => {
  it('updates with grade, rank, shanten change, and acceptance gap after a discard', () => {
    const hand = codesToTiles([...tenpaiBase, 'E'])
    const analysis = analyzeDiscardOptions(hand)
    const evaluation = buildDiscardEvaluation(hand[13], analysis, hand)
    expect(evaluation.gradeLabel).toMatch(/[◎○△×]/)
    expect(evaluation.rank).toBeGreaterThan(0)
    expect(evaluation.optionCount).toBeGreaterThan(0)
    expect(evaluation.improvementTileDifference).not.toBeNull()
    expect(evaluation.detail).toContain('リーチできたよ')

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
    expect(html).toContain('打牌評価')
    expect(html).toContain('候補内')
    expect(html).toContain('最善候補:')
    expect(html).toContain('受け入れ差')
  })

  it('only mentions riichi for a riichi-capable discard', () => {
    const hand = codesToTiles([...tenpaiBase, 'E'])
    const analysis = analyzeDiscardOptions(hand)
    const invalid = buildDiscardEvaluation(hand[0], analysis, hand)
    expect(invalid.detail).not.toContain('リーチできたよ')
    expect(calculateShanten(invalid.discard.code === '1m' ? hand.filter((tile) => tile.id !== invalid.discard.id) : hand)).toBeGreaterThan(0)
  })

  it('grades acceptance gaps and shanten regression by the requested thresholds', () => {
    const hand = codesToTiles([...tenpaiBase, 'E'])
    const base = analyzeDiscardOptions(hand)
    const best = { ...base[0], shanten: 2, improvementTileCount: 20, improvementTypeCount: 10, evaluationScore: 300, goodShapeCount: 3, structureScore: 12, yakuHints: [], rank: 1, optionCount: 2 }
    const selectedBase = { ...base[1], shanten: 2, improvementTypeCount: 9, evaluationScore: 280, goodShapeCount: 3, structureScore: 12, yakuHints: [], rank: 2, optionCount: 2 }

    expect(buildDiscardEvaluation(selectedBase.discard, [best, { ...selectedBase, improvementTileCount: 18 }], hand).grade).toBe('best')
    expect(buildDiscardEvaluation(selectedBase.discard, [best, { ...selectedBase, improvementTileCount: 16 }], hand).grade).toBe('good')
    expect(buildDiscardEvaluation(selectedBase.discard, [best, { ...selectedBase, improvementTileCount: 12 }], hand).grade).toBe('compromise')
    const regressed = buildDiscardEvaluation(selectedBase.discard, [best, { ...selectedBase, shanten: 3, improvementTileCount: 20 }], hand)
    expect(regressed.grade).toBe('bad')
    expect(regressed.improvementTileDifference).toBeNull()
  })

  it('keeps the evaluated tile identical to the actual latest discard', () => {
    const state = gameWithHand(['2m', '2m', '3m', '4m', '5m', '2p', '3p', '4p', '5p', '6p', '7s', '8s', '9s', 'E'])
    const selectedTile = state.players[0].hand[1]
    const result = discardHumanTile(state, selectedTile.id)
    expect(result.lastDiscard?.tileId).toBe(selectedTile.id)
    expect(result.players[0].river.at(-1)?.id).toBe(selectedTile.id)
    expect(result.lastEvaluation?.discard.id).toBe(selectedTile.id)
    expect(state.players[0].hand.some((tile) => tile.id === result.lastEvaluation?.discard.id)).toBe(true)
  })
})

describe('yaku memo cards', () => {
  it('renders matching yaku information after the evaluation section with tiny TileView examples', () => {
    const state = gameWithHand(['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '6m', '6m', '7p', '8p', 'E'])
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
    expect(html).toContain('役メモ')
    expect(html).toContain('断么九候補')
    expect(html).toContain('tile tiny')
    expect(html.indexOf('打牌評価')).toBeLessThan(html.indexOf('役メモ'))
  })

  it('maps getYakuHints results to cards and never includes riichi', () => {
    const hand = codesToTiles(['E', 'E', '2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7p', '8p'])
    const hints = getYakuHints(hand)
    const html = renderToStaticMarkup(<YakuInfoPanel hints={hints} hand={hand} />)
    expect(html).toContain('役牌候補')
    expect(html).not.toContain('リーチ')
  })
})

describe('tile usage classes', () => {
  it('assigns explicit hand, river, and tiny classes without mixing variants', () => {
    const tile = createTile('5m', 'usage')
    const handHtml = renderToStaticMarkup(<TileView tile={tile} usage="hand" onClick={() => undefined} />)
    const riverHtml = renderToStaticMarkup(<TileView tile={tile} usage="river" />)
    const tinyHtml = renderToStaticMarkup(<TileView tile={tile} usage="tiny" />)
    expect(handHtml).toContain('tile man hand')
    expect(riverHtml).toContain('tile man river')
    expect(riverHtml).not.toContain(' mini')
    expect(tinyHtml).toContain('tile man tiny')
  })
})
