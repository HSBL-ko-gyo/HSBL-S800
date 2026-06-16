import { useState } from 'react'
import {
  buildHandPlanAdvice,
  calculateShanten,
  canDeclareTsumo,
  getChiOptions,
  getVisibleTiles,
  getRiichiWaitTiles,
  getWaitTiles,
  getYakuHints,
  tileName,
  type CallType,
  type GameState,
  type Meld,
  type Tile,
} from '../gameEngine'
import { DiscardHistory } from './DiscardHistory'
import { HandView } from './HandView'
import { LearningPanel } from './LearningPanel'
import { RiverView } from './RiverView'
import { TileView } from './TileView'
import { useMediaQuery } from '../useMediaQuery'

interface TableViewProps {
  game: GameState
  onDiscard: (tile: Tile) => void
  onRiichiMode: (enabled: boolean) => void
  onCallsDisabledMode: (enabled: boolean) => void
  onTsumo: () => void
  onRon: () => void
  onStartReaction: () => void
  onSkipReactions: () => void
  onDeclareReaction: (type: Exclude<CallType, 'kan'>, eventId: string, chiTileIds?: string[]) => void
  onRestart: () => void
}

const SEATS = ['south', 'east', 'north', 'west'] as const
const AFFILIATE_BOOKS = [
  {
    title: 'アカギ',
    href: 'https://amzn.to/4vRaF2p',
    image: 'https://m.media-amazon.com/images/I/51nbs2kF08L.jpg',
  },
  {
    title: '天',
    href: 'https://amzn.to/3Q6xwrD',
    image: 'https://m.media-amazon.com/images/I/51jGDt+mJkL.jpg',
  },
  {
    title: '咲',
    href: 'https://amzn.to/4ouAjr3',
    image: 'https://m.media-amazon.com/images/I/516u8E7Ey+L.jpg',
  },
]

function calledTileDirection(from: Meld['from']) {
  if (from === 3) return 'from-left'
  if (from === 2) return 'from-across'
  if (from === 1) return 'from-right'
  return 'from-self'
}

function MeldView({ melds }: { melds: Meld[] }) {
  if (melds.length === 0) return null
  return (
    <div className="meld-area" aria-label="副露">
      {melds.map((meld, index) => (
        <div className={`meld meld-${meld.type}`} key={`${meld.type}-${index}-${meld.calledTile.id}`}>
          <span>{meld.type === 'pon' ? 'ポン' : meld.type === 'chi' ? 'チー' : 'カン'}</span>
          <div className="meld-tiles">
            {meld.tiles.map((tile) => (
              <TileView
                key={tile.id}
                tile={tile}
                usage="mini"
                className={tile.id === meld.calledTile.id
                  ? `called-tile ${calledTileDirection(meld.from)}`
                  : ''}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ResultHandView({ hand, melds }: { hand: Tile[]; melds: Meld[] }) {
  return (
    <section className="result-hand" aria-label="和了形">
      <span className="result-hand-label">和了形</span>
      <div className="result-hand-tiles">
        {hand.map((tile) => (
          <TileView key={tile.id} tile={tile} usage="mini" />
        ))}
      </div>
      {melds.length > 0 && (
        <div className="result-melds" aria-label="副露">
          {melds.map((meld, index) => (
            <div className="result-meld" key={`${meld.type}-${index}-${meld.calledTile.id}`}>
              <span>{meld.type === 'pon' ? 'ポン' : meld.type === 'chi' ? 'チー' : 'カン'}</span>
              <div>
                {meld.tiles.map((tile) => (
                  <TileView
                    key={tile.id}
                    tile={tile}
                    usage="tiny"
                    className={tile.id === meld.calledTile.id
                      ? `called-tile ${calledTileDirection(meld.from)}`
                      : ''}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CallDisableSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <label className="side-call-toggle desktop-call-toggle" aria-label="鳴き無し">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span>鳴き無し</span>
    </label>
  )
}

export function TableView({
  game,
  onDiscard,
  onRiichiMode,
  onCallsDisabledMode,
  onTsumo,
  onRon,
  onStartReaction,
  onSkipReactions,
  onDeclareReaction,
  onRestart,
}: TableViewProps) {
  const [learningHintsHidden, setLearningHintsHidden] = useState(false)
  const humanTurn = game.status === 'playing'
    && game.phase === 'player_discard'
    && game.currentPlayer === 0
    && game.awaitingDiscard
  const freeDiscard = humanTurn && !game.playerRiichi
  const showRiichiButton = game.status === 'playing'
  const currentPlayer = game.players[game.currentPlayer]
  const canTsumo = canDeclareTsumo(game)
  const riichiButtonEnabled = humanTurn && !game.playerRiichi && !canTsumo && game.players[0].melds.length === 0
  const baselineHand = game.players[0].hand.filter((tile) => tile.id !== game.drawnTileId)
  const humanMeldCount = game.players[0].melds.length
  const visibleTiles = getVisibleTiles(game)
  const baselineShanten = calculateShanten(baselineHand, humanMeldCount)
  const drawnTile = game.players[0].hand.find((tile) => tile.id === game.drawnTileId)
  const baselineWaits = getWaitTiles(
    baselineHand,
    [...visibleTiles, ...(drawnTile ? [drawnTile] : [])],
    humanMeldCount,
  )
  const handPlan = buildHandPlanAdvice(
    game.players[0].hand,
    visibleTiles,
    humanMeldCount,
    game.players[0].river.length + (humanTurn ? 1 : 0),
  )
  const yakuHints = getYakuHints(game.players[0].hand)
  const riichiWaits = getRiichiWaitTiles(game)
  const hasFourRowRiver = game.players.some((player) => player.river.length >= 19)
  const isMobileLayout = useMediaQuery('(max-width: 480px)')
  const hasRonReaction = game.pendingReactionEvents.some((event) => event.canRon)
  const hasOpenReaction = game.pendingReactionEvents.some((event) => event.canPon || event.canChi)
  const isRonOnlyReaction = hasRonReaction && !hasOpenReaction
  const reactionReviewLabel = isRonOnlyReaction ? 'ロン確認' : 'ツモ前確認'
  const reactionReviewQuestion = isRonOnlyReaction ? 'ロンする？' : '宣言する？'
  const reactionReviewActionLabel = isRonOnlyReaction ? 'ロン確認' : '宣言する'
  const reactionReviewSkipLabel = isRonOnlyReaction ? '見送る' : 'ツモる'
  const isReactionDialogOpen = game.phase === 'reaction_review' || game.phase === 'declare_reaction'
  const statusText = game.status === 'draw'
    ? '流局'
    : game.status === 'win'
      ? game.winType === 'tsumo' ? 'ツモ和了' : 'ロン和了'
      : game.phase === 'reaction_review'
        ? reactionReviewLabel
        : game.phase === 'declare_reaction'
          ? '宣言選択'
        : canTsumo
          ? 'ツモできます'
          : humanTurn
            ? game.playerRiichi ? 'リーチ中' : 'あなたの番'
            : `${currentPlayer.name} 打牌中`
  const handHint = game.pendingRonTile
    ? game.phase === 'declare_reaction' ? 'ロンするか選んでください' : 'ロンできる牌があります'
    : canTsumo
      ? 'ツモできます'
      : game.riichiDeclareMode
        ? 'リーチ宣言中：切る牌を選んでください'
        : game.lastFeedback
          ?? (freeDiscard
            ? '切る牌を選んでください'
            : game.playerRiichi
              ? 'リーチ後は自動ツモ切り'
              : isReactionDialogOpen ? '' : '敵の打牌中…')

  return (
    <>
      <div className="game-layout">
        <div className="play-column">
          {!isMobileLayout && <CallDisableSwitch enabled={game.callsDisabled} onChange={onCallsDisabledMode} />}
          <main className={`table-board ${hasFourRowRiver ? 'is-late-round' : ''}`}>
            {[2, 3, 1, 0].map((playerIndex) => {
              const player = game.players[playerIndex]
              const lastDiscardId = game.lastDiscard?.playerIndex === playerIndex
                ? game.lastDiscard.tileId
                : undefined
              return (
                <RiverView
                  key={player.wind}
                  player={player}
                  seat={SEATS[playerIndex]}
                  active={game.status === 'playing' && game.currentPlayer === playerIndex}
                  lastDiscardId={lastDiscardId}
                />
              )
            })}

            <section className="table-center" aria-live="polite">
              <span className="round-label">東一局</span>
              <strong>{statusText}</strong>
              {game.playerRiichi && <span className="riichi-status">立直</span>}
              <div className="wall-counter">
                <span>山</span>
                <b>{game.wall.length}</b>
                <span>枚</span>
              </div>
              <small>{game.turnNumber} 打牌</small>
            </section>
          </main>

          <HandView
            tiles={game.players[0].hand}
            drawnTileId={game.drawnTileId}
            canDiscard={freeDiscard}
            canRon={false}
            canTsumo={canTsumo}
            showRiichiButton={showRiichiButton}
            riichiButtonEnabled={riichiButtonEnabled}
            playerRiichi={game.playerRiichi}
            riichiDeclareMode={game.riichiDeclareMode}
            callsDisabled={game.callsDisabled}
            blockGuidesHidden={learningHintsHidden}
            hint={handHint}
            onDiscard={onDiscard}
            onRon={onRon}
            onTsumo={onTsumo}
            onRiichiMode={onRiichiMode}
            onCallsDisabledMode={onCallsDisabledMode}
          />
          <MeldView melds={game.players[0].melds} />
          {game.phase === 'reaction_review' && (
            <section className="reaction-panel" role="dialog" aria-label={reactionReviewLabel}>
              <div>
                <span className="reaction-kicker">{reactionReviewLabel}</span>
                <strong>{reactionReviewQuestion}</strong>
              </div>
              <div className="reaction-actions">
                <button className="reaction-secondary" type="button" onClick={onStartReaction}>{reactionReviewActionLabel}</button>
                <button className="reaction-primary" type="button" onClick={onSkipReactions}>{reactionReviewSkipLabel}</button>
              </div>
            </section>
          )}
          {game.phase === 'declare_reaction' && (
            <section className="reaction-panel declare-panel" role="dialog" aria-label="宣言選択">
              <div>
                <span className="reaction-kicker">宣言選択</span>
                <strong>対象の捨て牌を選択</strong>
              </div>
              <div className="reaction-event-list">
                {game.pendingReactionEvents.length === 0 && (
                  <p className="reaction-empty">宣言できる捨て牌はありません</p>
                )}
                {game.pendingReactionEvents.map((event) => {
                  const chiOptions = event.canChi ? getChiOptions(game.players[0].hand, event.tile) : []
                  return (
                    <div className="reaction-event" key={event.id}>
                      <div className="reaction-target">
                        <TileView tile={event.tile} usage="mini" />
                        <span>{game.players[event.actor].name}の{tileName(event.tile.code)}</span>
                      </div>
                      <div className="reaction-actions">
                        {event.canRon && (
                          <button type="button" onClick={() => onDeclareReaction('ron', event.id)}>ロン</button>
                        )}
                        {event.canPon && (
                          <button type="button" onClick={() => onDeclareReaction('pon', event.id)}>ポン</button>
                        )}
                        {chiOptions.map((option, index) => (
                          <button
                            type="button"
                            key={`${event.id}-chi-${index}`}
                            onClick={() => onDeclareReaction('chi', event.id, option.map((tile) => tile.id))}
                          >
                            チー {option.map((tile) => tileName(tile.code)).join('-')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <button className="reaction-secondary" type="button" onClick={onSkipReactions}>宣言しない</button>
            </section>
          )}
        </div>

        <LearningPanel
          shanten={baselineShanten}
          improvementTypeCount={baselineWaits.length}
          improvementTileCount={baselineWaits.reduce((sum, tile) => sum + tile.remaining, 0)}
          yakuHints={yakuHints}
          handPlan={handPlan}
          hand={game.players[0].hand}
          evaluation={game.lastEvaluation}
          riichiWaits={riichiWaits}
          feedback={game.lastFeedback}
          showRiichiButton={showRiichiButton}
          riichiButtonEnabled={riichiButtonEnabled}
          playerRiichi={game.playerRiichi}
          riichiDeclareMode={game.riichiDeclareMode}
          metricsHidden={learningHintsHidden}
          onMetricsHiddenChange={setLearningHintsHidden}
          onRiichiMode={onRiichiMode}
        />
      </div>

      {game.status === 'win' && (
        <div className="win-celebration" aria-hidden="true">
          {Array.from({ length: 32 }, (_, index) => <span key={index} />)}
        </div>
      )}

      {game.status !== 'playing' && (
        <section
          className={`round-result ${game.status === 'win' ? 'is-win-result' : 'is-draw-result'}`}
          role="dialog"
          aria-label={game.status === 'draw' ? '流局' : '和了'}
        >
          <span className="result-kicker">{game.status === 'draw' ? '牌山終了' : '練習結果'}</span>
          <h2>{game.status === 'draw' ? '流局' : game.winType === 'tsumo' ? 'ツモ' : 'ロン'}</h2>
          <p>{game.status === 'draw' ? '最後まで打ち切りました。打牌を振り返りましょう。' : '和了しました。打牌を振り返りましょう。'}</p>
          {game.status === 'win' && (
            <ResultHandView hand={game.winningHand ?? game.players[0].hand} melds={game.players[0].melds} />
          )}
          {game.status === 'win' && game.roundScore && (
            <section className="score-result" aria-label="点数計算">
              {game.roundScore.limitName && (
                <div className="score-limit-banner">
                  <span>{game.roundScore.limitName}</span>
                  <small>{game.roundScore.han}飜 {game.roundScore.fu}符</small>
                </div>
              )}
              <div className="score-main">
                <span>{game.roundScore.paymentText}</span>
                <strong>{game.roundScore.totalPoints.toLocaleString()}点</strong>
              </div>
              <div className="score-breakdown">
                <span><b>{game.roundScore.han}飜</b></span>
                <span><b>{game.roundScore.fu}符</b></span>
                {game.roundScore.limitName && <span><b>{game.roundScore.limitName}</b></span>}
              </div>
              <span className="score-section-label">得点のもと</span>
              <div className="score-yaku-list">
                {game.roundScore.yaku.length === 0 && <span>役なし候補</span>}
                {game.roundScore.yaku.map((yaku) => (
                  <span key={yaku.name}>{yaku.name} <b>{yaku.han}飜</b></span>
                ))}
              </div>
              <p className="score-note">{game.roundScore.note}</p>
            </section>
          )}
          <DiscardHistory logs={game.discardLogs} />
          <button className="restart-button" type="button" onClick={onRestart}>もう一局</button>
          <aside className="result-affiliate" aria-label="おすすめ麻雀漫画">
            <span>息抜きに麻雀漫画</span>
            <div className="affiliate-book-list">
              {AFFILIATE_BOOKS.map((book) => (
                <a className="affiliate-book-card" key={book.title} href={book.href} target="_blank" rel="sponsored noreferrer">
                  <span className="affiliate-cover">
                    <img src={book.image} alt="" loading="lazy" />
                  </span>
                  <b>{book.title}</b>
                </a>
              ))}
            </div>
            <small>Amazonアソシエイトリンクです</small>
          </aside>
        </section>
      )}
    </>
  )
}
