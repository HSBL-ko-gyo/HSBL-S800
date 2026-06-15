import { useEffect, useState } from 'react'
import { TableView } from './components/TableView'
import {
  autoDiscardRiichiDraw,
  beginTurn,
  canDeclareTsumo,
  createInitialGame,
  declareWin,
  discardHumanTile,
  playAutomaticTurn,
  setRiichiDeclareMode,
  type GameState,
  type Tile,
} from './gameEngine'

function newGame(): GameState {
  return beginTurn(createInitialGame())
}

export default function App() {
  const [game, setGame] = useState<GameState>(newGame)

  useEffect(() => {
    if (game.status !== 'playing' || game.pendingRonTile) return

    if (game.currentPlayer === 0) {
      if (!game.awaitingDiscard) {
        setGame((current) => beginTurn(current))
      } else if (game.playerRiichi && !canDeclareTsumo(game)) {
        const timer = window.setTimeout(() => {
          setGame((current) => autoDiscardRiichiDraw(current))
        }, 60)
        return () => window.clearTimeout(timer)
      }
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
      return discardHumanTile(current, tile.id)
    })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">SOLO SPEED MAHJONG</p>
          <div className="title-row">
            <h1>爆速麻雀</h1>
            <div className="mobile-round-summary" aria-label={`東一局 山残り${game.wall.length}枚`}>
              <b>東一局</b>
              <span>山 {game.wall.length}枚</span>
            </div>
          </div>
          <p className="subtitle">待つのは、自分の番だけ。</p>
        </div>
      </header>

      <TableView
        game={game}
        onDiscard={handleDiscard}
        onRiichiMode={(enabled) => setGame((current) => setRiichiDeclareMode(current, enabled))}
        onTsumo={() => setGame((current) => declareWin(current, 'tsumo'))}
        onRon={() => setGame((current) => declareWin(current, 'ron'))}
        onRestart={() => setGame(newGame())}
      />

      <footer className="app-footer">
        <span>鳴き・点数計算なし / クリックまたはタップで打牌</span>
        <span className="footer-links">
          <a href="https://hsbl-ko-gyo.github.io/mahjong-bootcamp/" target="_blank" rel="noreferrer">個別練習は麻雀ブートキャンプへ</a>
          <span aria-hidden="true">・</span>
          <a href="https://hsbl-ko-gyo.github.io/mahjong-bootcamp/" target="_blank" rel="noreferrer">制作：ハシビロ工業</a>
        </span>
      </footer>
    </div>
  )
}
