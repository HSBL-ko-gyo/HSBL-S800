import { describe, expect, it } from 'vitest'
import {
  beginTurn,
  chooseAutomaticDiscard,
  createInitialGame,
  createTileSet,
  discardTile,
  playAutomaticTurn,
} from './gameEngine'

const fixedRandom = () => 0.42

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
