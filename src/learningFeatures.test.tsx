import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TableView } from './components/TableView'
import { TileView } from './components/TileView'
import { YakuInfoPanel } from './components/YakuInfoPanel'
import {
  analyzeDiscardOptions,
  autoDiscardRiichiDraw,
  buildDiscardEvaluation,
  buildHandPlanAdvice,
  calculateShanten,
  calculateWinningScore,
  canDeclareTsumo,
  canRiichiAfterDiscard,
  createInitialGame,
  createTile,
  declareReaction,
  discardHumanTile,
  discardTile,
  getVisibleTiles,
  getYakuHints,
  getRiichiWaitTiles,
  isTenpai,
  skipReactionReview,
  startReactionDeclaration,
  setRiichiDeclareMode,
  type GameState,
  type PlayerId,
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
    currentPlayer: 0 as PlayerId,
    phase: 'player_discard',
    awaitingDiscard: true,
    drawnTileId: hand[drawnIndex]?.id ?? null,
  }
}

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

function renderTable(game: GameState): string {
  return renderToStaticMarkup(<TableView game={game} {...tableHandlers} />)
}

function stateBeforeEnemyDiscard(humanCodes: TileCode[], discardCode: TileCode, actor: PlayerId = 3): GameState {
  const game = createInitialGame(() => 0.42)
  const humanHand = codesToTiles(humanCodes)
  const discarded = createTile(discardCode, `enemy-${actor}`)
  return {
    ...game,
    players: game.players.map((player, index) => {
      if (index === 0) return { ...player, hand: humanHand, river: [], melds: [] }
      if (index === actor) return { ...player, hand: [discarded], river: [], melds: [] }
      return { ...player, river: [], melds: [] }
    }),
    currentPlayer: actor,
    phase: 'enemy_auto',
    awaitingDiscard: true,
    drawnTileId: discarded.id,
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
    expect(result.players[0].river.at(-1)?.tile.id).toBe(drawn.id)
    expect(result.currentPlayer).toBe(1)
    expect(result.discardLogs.at(-1)?.wasRiichiPossible).toBe(false)
    expect(result.lastEvaluation?.missedRiichiOpportunity).toBe(false)
    expect(result.lastEvaluation?.detail).not.toContain('リーチできたよ')
  })

  it('stops for tsumo or ron only when a winning tile is available', () => {
    const tsumoState = { ...gameWithHand([...tenpaiBase, '5m']), playerRiichi: true }
    expect(canDeclareTsumo(tsumoState)).toBe(true)

    const tsumoHtml = renderTable(tsumoState)
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
        if (index === 3) return { ...player, hand: [winningDiscard], river: [] }
        return player
      }),
      currentPlayer: 3 as PlayerId,
      phase: 'enemy_auto',
      awaitingDiscard: true,
      drawnTileId: winningDiscard.id,
      playerRiichi: true,
    }
    const pendingRon = discardTile(ronState, winningDiscard.id)
    expect(pendingRon.pendingRonTile?.code).toBe('5m')
    expect(pendingRon.phase).toBe('reaction_review')

    const html = renderTable(pendingRon)
    const ronHandStart = html.indexOf('<section class="hand-zone"')
    const ronHandEnd = html.indexOf('</section>', ronHandStart)
    const ronHandHtml = html.slice(ronHandStart, ronHandEnd)
    expect(ronHandHtml).not.toContain('>ロン</button>')
    expect(html).toContain('ロン確認')
    expect(html).toContain('>ロン確認</button>')
    expect(html).toContain('>見送る</button>')
    expect(html).not.toContain('>ツモる</button>')

    const declaring = startReactionDeclaration(pendingRon)
    expect(declaring.phase).toBe('declare_reaction')
    const declareHtml = renderTable(declaring)
    expect(declareHtml).toContain('>ロン</button>')
    const won = declareReaction(declaring, 'ron', declaring.pendingReactionEvents[0].id)
    expect(won.status).toBe('win')
    expect(won.winType).toBe('ron')
    expect(won.winningHand).toHaveLength(14)
    expect(won.winningHand?.filter((tile) => tile.code === '5m')).toHaveLength(2)
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
    const html = renderTable(state)
    expect(html).not.toContain('リーチできたよ')
    expect(html).not.toContain('リーチ可能')
    expect(html).not.toContain('riichi-available')
    expect(html).not.toContain('最善候補')
    expect(html).not.toContain('待ち牌答え合わせ')
    expect(html).toContain('リーチ宣言')
  })

  it('keeps disabled riichi button slots during opponent turns', () => {
    const state: GameState = {
      ...gameWithHand([...tenpaiBase, 'E']),
      currentPlayer: 1 as PlayerId,
      phase: 'enemy_auto',
      awaitingDiscard: true,
    }
    const html = renderTable(state)

    expect(html.match(/class="riichi-button[^"]*"[^>]*disabled/g)).toHaveLength(2)
  })

  it('renders a static 14-tile overview and a connected 14-tile mobile control rail', () => {
    const state = gameWithHand([...tenpaiBase, 'E'])
    const html = renderTable(state)
    const overviewStart = html.indexOf('<div class="mobile-hand-overview"')
    const railStart = html.indexOf('<div class="hand mobile-hand-rail', overviewStart)
    const desktopStart = html.indexOf('<div class="hand desktop-hand', railStart)
    const overviewHtml = html.slice(overviewStart, railStart)
    const railHtml = html.slice(railStart, desktopStart)

    expect(html).toContain('全体表示・ドラッグで移動')
    expect(html).toContain('拡大操作・ここを横スライド')
    expect(html).toContain('ブロック補助')
    expect(html).toContain('5ブロック打法')
    expect(html).toContain('ブロック</strong><em>不足')
    expect(html).not.toContain('5ブロック打法</b><span>3ブロック不足')
    expect(html).toContain('mobile-block-guide')
    expect(html).toContain('desktop-block-guide')
    expect(html).toContain('desktop-call-toggle')
    expect(html).not.toContain('mobile-call-toggle')
    expect(html).toContain('metric-privacy-toggle')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toMatch(/block-guide-item-(meld|pair|ryanmen|kanchan|penchan|floating)/)
    expect(overviewHtml.match(/mobile-overview-slot/g)).toHaveLength(14)
    expect(overviewHtml).not.toContain('<button')
    expect(railHtml.match(/hand-tile-slot/g)).toHaveLength(14)
  })

  it('shows unobtrusive affiliate links in the round result dialog', () => {
    const state: GameState = {
      ...gameWithHand([...tenpaiBase, 'E']),
      status: 'draw',
      phase: 'draw',
      awaitingDiscard: false,
    }
    const html = renderTable(state)

    expect(html).toContain('result-affiliate')
    expect(html).toContain('affiliate-book-card')
    expect(html).toContain('https://amzn.to/4vRaF2p')
    expect(html).toContain('https://amzn.to/3Q6xwrD')
    expect(html).toContain('https://amzn.to/4ouAjr3')
    expect(html).toContain('https://m.media-amazon.com/images/I/51nbs2kF08L.jpg')
    expect(html).toContain('rel="sponsored noreferrer"')
  })

  it('shows the score result when the round ends in a win', () => {
    const state: GameState = {
      ...gameWithHand([
        '2m', '3m', '4m',
        '6m', '7m', '8m',
        '3p', '4p', '5p',
        '4s', '5s', '6s',
        '2s', '2s',
      ]),
      status: 'win',
      phase: 'win',
      winType: 'tsumo',
      awaitingDiscard: false,
      playerRiichi: true,
      roundScore: calculateWinningScore([
        '2m', '3m', '4m',
        '2p', '3p', '4p',
        '2s', '3s', '4s',
        '6m', '7m', '8m',
        '5s', '5s',
      ], 'tsumo', { riichi: true }),
    }
    const html = renderTable(state)

    expect(html).toContain('win-celebration')
    expect(html).toContain('result-hand')
    expect(html).toContain('score-result')
    expect(html).toContain('score-limit-banner')
    expect(html).toContain('score-section-label')
    expect(html).toContain('跳満')
    expect(html).toContain('親ツモ 6000点オール')
    expect(html).toContain('18,000点')
    expect(html).toContain('6飜')
    expect(html).toContain('20符')
  })

  it('shows waits after riichi without showing a duplicated missed-riichi message', () => {
    const declaring = setRiichiDeclareMode(gameWithHand([...tenpaiBase, 'E']), true)
    const established = discardHumanTile(declaring, declaring.players[0].hand[13].id)
    const html = renderTable(established)
    expect(html).toContain('待ち牌答え合わせ')
    expect(html).toContain('残り')
    expect(html).toContain('リーチ宣言')
    expect(html).not.toContain('リーチ可能だった')
    expect(html).not.toContain('今の打牌、リーチできたよ')
  })
})

describe('reaction declaration MVP', () => {
  it('collects enemy calls without stopping until the player draw boundary', () => {
    const early = stateBeforeEnemyDiscard(
      ['5m', '5m', '1p', '2p', '3p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S'],
      '5m',
      1,
    )
    const afterEarlyDiscard = discardTile(early, early.players[1].hand[0].id)
    expect(afterEarlyDiscard.pendingReactionEvents).toHaveLength(1)
    expect(afterEarlyDiscard.phase).toBe('enemy_auto')

    const beforeDraw = stateBeforeEnemyDiscard(
      ['5m', '5m', '1p', '2p', '3p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S'],
      '5m',
      3,
    )
    const review = discardTile(beforeDraw, beforeDraw.players[3].hand[0].id)
    expect(review.pendingReactionEvents).toHaveLength(1)
    expect(review.phase).toBe('reaction_review')
    expect(skipReactionReview(review).phase).toBe('player_draw')
  })

  it('shows the pre-draw confirmation even when no declaration is available', () => {
    const beforeDraw = stateBeforeEnemyDiscard(
      ['1m', '4m', '7m', '1p', '4p', '7p', '1s', '4s', '7s', 'E', 'S', 'W', 'N'],
      '2m',
    )
    const review = discardTile(beforeDraw, beforeDraw.players[3].hand[0].id)
    expect(review.phase).toBe('reaction_review')
    expect(review.pendingReactionEvents).toHaveLength(0)

    const reviewHtml = renderTable(review)
    expect(reviewHtml).toContain('ツモ前確認')
    expect(reviewHtml).toContain('>宣言する</button>')
    expect(reviewHtml).toContain('>ツモる</button>')
    expect(reviewHtml).not.toContain('敵の打牌中…')
    expect(reviewHtml).not.toContain('宣言できる捨て牌はありません')

    const declaring = startReactionDeclaration(review)
    expect(declaring.phase).toBe('declare_reaction')
    expect(renderTable(declaring)).toContain('宣言できる捨て牌はありません')
  })

  it('skips pon and chi prompts when calls are disabled but still allows ron', () => {
    const ponOnly = {
      ...stateBeforeEnemyDiscard(
        ['5m', '5m', '1p', '2p', '3p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S'],
        '5m',
      ),
      callsDisabled: true,
    }
    const afterPonDiscard = discardTile(ponOnly, ponOnly.players[3].hand[0].id)
    expect(afterPonDiscard.phase).toBe('player_draw')
    expect(afterPonDiscard.pendingReactionEvents).toHaveLength(0)

    const ronState = {
      ...stateBeforeEnemyDiscard(tenpaiBase, '5m'),
      callsDisabled: true,
    }
    const afterRonDiscard = discardTile(ronState, ronState.players[3].hand[0].id)
    expect(afterRonDiscard.phase).toBe('reaction_review')
    expect(afterRonDiscard.pendingReactionEvents[0].canRon).toBe(true)
    expect(afterRonDiscard.pendingReactionEvents[0].canPon).toBe(false)
    expect(afterRonDiscard.pendingReactionEvents[0].canChi).toBe(false)

    const ronHtml = renderTable(afterRonDiscard)
    expect(ronHtml).toContain('ロン確認')
    expect(ronHtml).toContain('ロンする？')
    expect(ronHtml).toContain('>見送る</button>')
    expect(ronHtml).not.toContain('>ツモる</button>')
  })

  it('does not show the pre-draw confirmation after riichi unless ron is available', () => {
    const noRon = {
      ...stateBeforeEnemyDiscard(tenpaiBase, 'E'),
      playerRiichi: true,
    }
    const afterNoRonDiscard = discardTile(noRon, noRon.players[3].hand[0].id)
    expect(afterNoRonDiscard.phase).toBe('player_draw')
    expect(afterNoRonDiscard.pendingReactionEvents).toHaveLength(0)

    const ron = {
      ...stateBeforeEnemyDiscard(tenpaiBase, '5m'),
      playerRiichi: true,
    }
    const afterRonDiscard = discardTile(ron, ron.players[3].hand[0].id)
    expect(afterRonDiscard.phase).toBe('reaction_review')
    expect(afterRonDiscard.pendingReactionEvents[0].canRon).toBe(true)
  })

  it('declares pon, moves two hand tiles into a meld, and hides the called river tile', () => {
    const beforeDraw = stateBeforeEnemyDiscard(
      ['5m', '5m', '1p', '2p', '3p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S'],
      '5m',
    )
    const review = discardTile(beforeDraw, beforeDraw.players[3].hand[0].id)
    const declaring = startReactionDeclaration(review)
    const called = declareReaction(declaring, 'pon', declaring.pendingReactionEvents[0].id)

    expect(called.phase).toBe('player_discard')
    expect(called.currentPlayer).toBe(0)
    expect(called.players[0].hand).toHaveLength(11)
    expect(called.players[0].melds[0].type).toBe('pon')
    expect(called.players[3].river[0].calledBy).toBe(0)
    expect(called.players[3].river[0].callType).toBe('pon')
    expect(getVisibleTiles(called).filter((tile) => tile.code === '5m')).toHaveLength(3)

    const html = renderTable(called)
    expect(html).toContain('called-tile from-left')
    expect(html).toContain('--block-tile-count:11')
  })

  it('declares chi only from kamicha and keeps riichi unavailable after calling', () => {
    const beforeDraw = stateBeforeEnemyDiscard(
      ['3m', '4m', '1p', '2p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S', 'W'],
      '2m',
    )
    const review = discardTile(beforeDraw, beforeDraw.players[3].hand[0].id)
    const declaring = startReactionDeclaration(review)
    const event = declaring.pendingReactionEvents[0]
    const called = declareReaction(declaring, 'chi', event.id, declaring.players[0].hand
      .filter((tile) => tile.code === '3m' || tile.code === '4m')
      .map((tile) => tile.id))

    expect(called.phase).toBe('player_discard')
    expect(called.players[0].hand).toHaveLength(11)
    expect(called.players[0].melds[0].type).toBe('chi')
    expect(called.players[3].river[0].callType).toBe('chi')
    expect(setRiichiDeclareMode(called, true).riichiDeclareMode).toBe(false)

    const notKamicha = stateBeforeEnemyDiscard(
      ['3m', '4m', '1p', '2p', '4p', '6p', '8p', '1s', '3s', '5s', 'E', 'S', 'W'],
      '2m',
      1,
    )
    const afterDiscard = discardTile(notKamicha, notKamicha.players[1].hand[0].id)
    expect(afterDiscard.pendingReactionEvents).toHaveLength(0)
  })
})

describe('yaku hints', () => {
  it('suggests tanyao for a middle-tile-heavy hand', () => {
    expect(getYakuHints(['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '6m', '6m', '7p', '8p'])).toContain('断么九')
  })

  it('suggests yakuhai when an honor pair exists', () => {
    expect(getYakuHints(['E', 'E', '2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7p', '8p'])).toContain('役牌候補')
  })

  it('waits until five pairs before suggesting seven pairs', () => {
    expect(getYakuHints(['2m', '2m', '4m', '4m', '3p', '3p', '5s', '5s', '6s', '7s', '8s', 'E', 'F'])).not.toContain('七対子候補')
    expect(getYakuHints(['2m', '2m', '4m', '4m', '3p', '3p', '5s', '5s', '6s', '6s', '8s', 'E', 'F'])).toContain('七対子候補')
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
    const html = renderTable(updated)
    expect(html).toContain('打牌評価')
    expect(html).toContain('候補内')
    expect(html).toContain('最善候補:')
    expect(html).toContain('受け入れ差')
    expect(html.indexOf('打牌評価')).toBeLessThan(html.indexOf('打牌前の注意点'))
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
    expect(result.players[0].river.at(-1)?.tile.id).toBe(selectedTile.id)
    expect(result.lastEvaluation?.discard.id).toBe(selectedTile.id)
    expect(state.players[0].hand.some((tile) => tile.id === result.lastEvaluation?.discard.id)).toBe(true)
  })
})

describe('hand plan advice', () => {
  it('shows a light fast plan when an open route is available', () => {
    const hand = codesToTiles(['2m', '3m', '4m', '6m', '7m', '2p', '4p', '7p', '8p', '3s', '5s', 'E', 'E', '9s'])
    const advice = buildHandPlanAdvice(hand, [], 0, 1)

    expect(advice.kind).toBe('fast')
    expect(advice.label).toBe('高望みしすぎない')
    expect(advice.reason).toContain('1巡目(序盤)')
    expect(advice.reason).toContain('受け入れ')
    expect(advice.action).toContain('序盤は形と役の種')
  })

  it('warns against forcing a slow cheap hand after the early window', () => {
    const hand = codesToTiles(['1m', '4m', '7m', '1p', '4p', '7p', '1s', '4s', '7s', 'E', 'S', 'W', 'N', 'C'])
    const advice = buildHandPlanAdvice(hand, [], 0, 7)

    expect(advice.kind).toBe('patient')
    expect(advice.label).toBe('無理押し注意')
    expect(advice.reason).toContain('7巡目(中盤)')
    expect(advice.action).toContain('中盤はテンパイ速度と安全牌')
  })

  it('does not overvalue loose yaku hints when the hand shape is still rough', () => {
    const hand = codesToTiles(['1p', '2p', '3p', '3p', '6p', '8p', '2s', '3s', '3s', '9s', 'E', 'S', 'C', '8s'])
    const advice = buildHandPlanAdvice(hand, [], 0, 1)

    expect(advice.label).toBe('決め打ちしすぎ注意')
    expect(advice.label).not.toBe('打点を見るなら形も確認')
  })

  it('mentions the late-round defensive priority inside the same advice text', () => {
    const hand = codesToTiles(['1m', '4m', '7m', '1p', '4p', '7p', '1s', '4s', '7s', 'E', 'S', 'W', 'N', 'C'])
    const advice = buildHandPlanAdvice(hand, [], 0, 13)

    expect(advice.reason).toContain('13巡目(終盤)')
    expect(advice.action).toContain('終盤は無理な手作りより放銃回避')
  })

  it('warns that four pairs are heavy rather than easy seven pairs', () => {
    const hand = codesToTiles(['2m', '2m', '4m', '4m', '3p', '3p', '5s', '5s', '6s', '7s', '8s', 'E', 'F', '9m'])
    const advice = buildHandPlanAdvice(hand, [], 0, 3)

    expect(advice.yakuHints).not.toContain('七対子候補')
    expect(advice.action).toContain('対子が多い')
    expect(advice.action).toContain('七対子決め打ちより')
  })
})

describe('yaku memo cards', () => {
  it('renders matching yaku information after the evaluation section with tiny TileView examples', () => {
    const state = gameWithHand(['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '6m', '6m', '7p', '8p', 'E'])
    const updated = discardHumanTile(state, state.players[0].hand[13].id)
    const html = renderTable(updated)
    expect(html).toContain('役メモ')
    expect(html).toContain('断么九')
    expect(html).toContain('(タンヤオ)')
    expect(html).toContain('tile tiny')
    expect(html.indexOf('打牌評価')).toBeLessThan(html.indexOf('役メモ'))
  })

  it('maps getYakuHints results to cards and never includes riichi', () => {
    const hand = codesToTiles(['E', 'E', '2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7p', '8p'])
    const hints = getYakuHints(hand)
    const html = renderToStaticMarkup(<YakuInfoPanel hints={hints} hand={hand} />)
    expect(html).toContain('役牌')
    expect(html).toContain('(ヤクハイ)')
    expect(html).not.toContain('リーチ')
  })
})

describe('tile usage classes', () => {
  it('assigns explicit hand, river, and tiny classes without mixing variants', () => {
    const tile = createTile('5m', 'usage')
    const handHtml = renderToStaticMarkup(<TileView tile={tile} usage="hand" onClick={() => undefined} />)
    const honorHtml = renderToStaticMarkup(<TileView tile={createTile('E', 'usage-honor')} usage="hand" />)
    const riverHtml = renderToStaticMarkup(<TileView tile={tile} usage="river" />)
    const tinyHtml = renderToStaticMarkup(<TileView tile={tile} usage="tiny" />)
    expect(handHtml).toContain('tile man hand')
    expect(handHtml).toContain('tile-reading')
    expect(handHtml).toContain('tile-suit-reading')
    expect(handHtml).toContain('ウー')
    expect(handHtml).toContain('マン')
    expect(honorHtml).toContain('トン')
    expect(riverHtml).toContain('tile man river')
    expect(riverHtml).not.toContain(' mini')
    expect(tinyHtml).toContain('tile man tiny')
  })
})
