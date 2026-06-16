import { describe, expect, it } from 'vitest'
import {
  beginTurn,
  calculateWinningScore,
  chooseAutomaticDiscard,
  createInitialGame,
  createTile,
  createTileSet,
  declareWin,
  discardTile,
  playAutomaticTurn,
  skipReactionReview,
  type TileCode,
} from './gameEngine'

const fixedRandom = () => 0.42
const simplePinfuTsumo: TileCode[] = [
  '2m', '3m', '4m',
  '6m', '7m', '8m',
  '3p', '4p', '5p',
  '4s', '5s', '6s',
  '2s', '2s',
]
const manganTsumo: TileCode[] = [
  '2m', '3m', '4m',
  '2p', '3p', '4p',
  '2s', '3s', '4s',
  '6m', '7m', '8m',
  '5s', '5s',
]

describe('game engine', () => {
  it('creates four copies of every tile', () => {
    const tiles = createTileSet()
    expect(tiles).toHaveLength(136)
    expect(tiles.filter((tile) => tile.code === '1m')).toHaveLength(4)
    expect(new Set(tiles.map((tile) => tile.id)).size).toBe(136)
  })

  it('deals 13 tiles to each player and leaves 70 drawable tiles', () => {
    const game = createInitialGame(fixedRandom)
    expect(game.players.map((player) => player.hand.length)).toEqual([13, 13, 13, 13])
    expect(game.wall).toHaveLength(70)
  })

  it('calculates a simple dealer riichi pinfu tsumo score', () => {
    const score = calculateWinningScore(simplePinfuTsumo, 'tsumo', { riichi: true })
    expect(score.han).toBe(4)
    expect(score.fu).toBe(20)
    expect(score.totalPoints).toBe(7800)
    expect(score.paymentText).toBe('親ツモ 2600点オール')
    expect(score.yaku.map((yaku) => yaku.name)).toEqual(['立直', '門前清自摸和', '断么九', '平和'])
    expect(score.yaku.find((yaku) => yaku.name === '立直')?.tileNote).toBe('宣言でついた役')
    expect(score.yaku.find((yaku) => yaku.name === '断么九')?.tileGroups?.[0]).toMatchObject({
      label: '2〜8のみ',
      tiles: expect.arrayContaining(['2m', '8m', '3p', '6s', '2s']),
    })
    const pinfuGroups = score.yaku.find((yaku) => yaku.name === '平和')?.tileGroups
    expect(pinfuGroups).toHaveLength(5)
    expect(pinfuGroups?.slice(0, 4).every((group) => group.label === '順子' && group.tiles.length === 3)).toBe(true)
    expect(pinfuGroups?.at(-1)).toMatchObject({ label: '雀頭', tiles: ['2s', '2s'] })
  })

  it('labels limit hands such as mangan', () => {
    const score = calculateWinningScore(manganTsumo, 'tsumo')
    expect(score.han).toBe(5)
    expect(score.fu).toBe(20)
    expect(score.limitName).toBe('満貫')
    expect(score.paymentText).toBe('親ツモ 4000点オール')
  })

  it('stores the calculated score when declaring tsumo', () => {
    const game = createInitialGame(fixedRandom)
    const hand = simplePinfuTsumo.map((code, index) => createTile(code, `win-${index}`))
    const ready = {
      ...game,
      players: game.players.map((player, index) => index === 0 ? { ...player, hand } : player),
      phase: 'player_discard' as const,
      awaitingDiscard: true,
      drawnTileId: hand.at(-1)?.id ?? null,
      playerRiichi: true,
    }
    const won = declareWin(ready, 'tsumo')
    expect(won.status).toBe('win')
    expect(won.roundScore?.paymentText).toBe('親ツモ 2600点オール')
  })

  it('draws, discards, and passes the turn', () => {
    const drawn = beginTurn(createInitialGame(fixedRandom))
    expect(drawn.players[0].hand).toHaveLength(14)
    expect(drawn.wall).toHaveLength(69)

    const discarded = discardTile(drawn, drawn.players[0].hand[0].id)
    expect(discarded.players[0].hand).toHaveLength(13)
    expect(discarded.players[0].river).toHaveLength(1)
    expect(discarded.currentPlayer).toBe(1)
  })

  it('plays a complete automatic opponent turn', () => {
    const humanDraw = beginTurn(createInitialGame(fixedRandom))
    const afterHuman = discardTile(humanDraw, humanDraw.players[0].hand[0].id)
    const afterOpponent = playAutomaticTurn(afterHuman, fixedRandom)
    expect(afterOpponent.currentPlayer).toBe(2)
    expect(afterOpponent.players[1].hand).toHaveLength(13)
    expect(afterOpponent.players[1].river).toHaveLength(1)
  })

  it('runs through the full wall and ends in a draw', () => {
    let game = createInitialGame(fixedRandom)

    while (game.status === 'playing') {
      if (game.phase === 'reaction_review' || game.phase === 'declare_reaction') {
        game = skipReactionReview(game)
        continue
      }
      if (game.currentPlayer === 0) {
        const drawn = beginTurn(game)
        if (drawn.status === 'draw') {
          game = drawn
        } else {
          const discard = chooseAutomaticDiscard(drawn.players[0].hand, fixedRandom)
          game = discardTile(drawn, discard.id)
        }
      } else {
        game = playAutomaticTurn(game, fixedRandom)
      }
    }

    expect(game.wall).toHaveLength(0)
    expect(game.turnNumber).toBe(70)
    expect(game.players.reduce((total, player) => total + player.river.length, 0)).toBe(70)
  })
})
