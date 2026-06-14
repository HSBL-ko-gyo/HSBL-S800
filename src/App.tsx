import { useEffect, useState } from 'react'
import { TableView } from './components/TableView'
import {
  beginTurn,
  createInitialGame,
  discardTile,
  playAutomaticTurn,
  type GameState,
  type Tile,
} from './gameEngine'

function newGame(): GameState {
  return beginTurn(createInitialGame())
}

export default function App() {
  const [game, setGame] = useState<GameState>(newGame)

  useEffect(() => {
    if (game.status !== 'playing') return

    if (game.currentPlayer === 0) {
      if (!game.awaitingDiscard) setGame((current) => beginTurn(current))
      return
    }

    const delay = 50 + Math.floor(Math.random() * 101)
    const timer = window.setTimeout(() => {
      setGame((current) => playAutomaticTurn(current))
    }, delay)

    return () => window.clearTimeout(timer)
  }, [game])

  const handleDiscard = (tile: Tile) => {
    setGame((current) => {
      if (current.currentPlayer !== 0) return current
      return discardTile(current, tile.id)
    })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">SOLO SPEED MAHJONG</p>
          <h1>爆速麻雀</h1>
          <p className="subtitle">待つのは、自分の番だけ。</p>
        </div>
        <div className="speed-chip">
          <span className="pulse-dot" />
          敵 50–150ms
        </div>
      </header>

      <TableView game={game} onDiscard={handleDiscard} onRestart={() => setGame(newGame())} />

      <footer>
        鳴き・リーチ・点数計算なし / クリックまたはタップで打牌
      </footer>
    </div>
  )
}
