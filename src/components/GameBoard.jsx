import React, { useEffect, useCallback, useState } from 'react'
import { useGame, GAME_PHASES } from '../context/GameContext'
import { getCardsToPass, SUIT_DISPLAY } from '../utils/deck'
import { getPlayableCards, canPlayCard } from '../utils/scoring'
import { selectCardToPlay } from '../utils/ai'
import Hand from './Hand'
import TrickArea from './TrickArea'
import ScoreBoard from './ScoreBoard'
import Die from './Die'
import History from './History'
import './GameBoard.css'

function GameBoard({ onBackToMenu }) {
  const { state, actions } = useGame()
  const {
    phase,
    players,
    currentPlayer,
    currentTrick,
    leadSuit,
    papayooSuit,
    playerCount,
    maxRounds,
    roundNumber,
    voidSuits,
    message
  } = state

  const [draggedCard, setDraggedCard] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const humanPlayer = players.find(p => p.isHuman)
  const isPlayerTurn = humanPlayer && currentPlayer === humanPlayer.id

  // Gestion de l'IA avec stratégie avancée
  const playAI = useCallback(() => {
    if (phase !== GAME_PHASES.PLAYING) return

    const currentPlayerData = players[currentPlayer]
    if (!currentPlayerData || currentPlayerData.isHuman) return
    if (currentTrick.length === playerCount) return

    const timer = setTimeout(() => {
      const cardToPlay = selectCardToPlay(
        currentPlayerData.hand,
        currentTrick,
        leadSuit,
        papayooSuit,
        playerCount,
        currentPlayer,
        voidSuits
      )

      if (cardToPlay) {
        actions.playCard(currentPlayer, cardToPlay.id)
      }
    }, 600 + Math.random() * 400)

    return () => clearTimeout(timer)
  }, [phase, currentPlayer, players, leadSuit, papayooSuit, currentTrick, playerCount, voidSuits, actions])

  useEffect(() => {
    playAI()
  }, [playAI])

  // Collecter le pli quand il est complet
  useEffect(() => {
    if (currentTrick.length === playerCount && phase === GAME_PHASES.PLAYING) {
      const timer = setTimeout(() => {
        actions.collectTrick()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [currentTrick.length, playerCount, phase, actions])

  const handleCardClick = (card) => {
    if (!humanPlayer) return

    if (phase === GAME_PHASES.PASSING) {
      actions.selectCardToPass(humanPlayer.id, card.id)
    } else if (phase === GAME_PHASES.PLAYING && isPlayerTurn) {
      if (canPlayCard(card, humanPlayer.hand, leadSuit)) {
        actions.playCard(humanPlayer.id, card.id)
      }
    }
  }

  const handleDragStart = (card) => {
    setDraggedCard(card)
  }

  const handleDragEnd = () => {
    setDraggedCard(null)
  }

  const handleCardDrop = (cardId) => {
    if (!humanPlayer || !isPlayerTurn) return

    const card = humanPlayer.hand.find(c => c.id === cardId)
    if (card && canPlayCard(card, humanPlayer.hand, leadSuit)) {
      actions.playCard(humanPlayer.id, cardId)
    }
  }

  // Phase de configuration
  if (phase === GAME_PHASES.SETUP) {
    return (
      <div className="game-board setup">
        {showHistory && <History onClose={() => setShowHistory(false)} />}

        {onBackToMenu && (
          <button className="back-to-menu-link" onClick={onBackToMenu}>
            ← Retour au menu
          </button>
        )}

        <div className="setup-container">
          <div className="logo">
            <span className="logo-icon">🎴</span>
            <h1>Papayoo</h1>
          </div>
          <p className="subtitle">Le jeu de cartes où il faut éviter les points!</p>

          <div className="setup-options">
            <label>Nombre de joueurs</label>
            <div className="player-count-selector">
              {[3, 4, 5, 6, 7, 8].map(count => (
                <button
                  key={count}
                  className={playerCount === count ? 'selected' : ''}
                  onClick={() => actions.setPlayerCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-options">
            <label>Nombre de manches</label>
            <div className="rounds-selector">
              {[1, 5, 10, 'infinite'].map(rounds => (
                <button
                  key={rounds}
                  className={maxRounds === rounds ? 'selected' : ''}
                  onClick={() => actions.setMaxRounds(rounds)}
                >
                  {rounds === 'infinite' ? '∞' : rounds}
                </button>
              ))}
            </div>
            <span className="rounds-hint">
              {maxRounds === 'infinite'
                ? 'Mode infini: jusqu\'à 250 points'
                : maxRounds === 1
                  ? 'Partie rapide: une seule manche'
                  : `La partie se termine après ${maxRounds} manches`}
            </span>
          </div>

          <button className="start-btn" onClick={actions.startGame}>
            <span>Commencer la partie</span>
            <span className="btn-icon">→</span>
          </button>

          <button className="history-btn" onClick={() => setShowHistory(true)}>
            <span>📊</span>
            <span>Historique & Stats</span>
          </button>

          <div className="rules-summary">
            <h3>📋 Règles du jeu</h3>
            <div className="rules-grid">
              <div className="rule-item">
                <span className="rule-icon">★</span>
                <p>Les cartes <strong>Payoo</strong> valent leur valeur (1-20 pts)</p>
              </div>
              <div className="rule-item">
                <span className="rule-icon">🎲</span>
                <p>Le dé désigne la couleur <strong>Papayoo</strong></p>
              </div>
              <div className="rule-item">
                <span className="rule-icon">7️⃣</span>
                <p>Le <strong>7 Papayoo</strong> vaut 40 points!</p>
              </div>
              <div className="rule-item">
                <span className="rule-icon">🏆</span>
                <p>Le moins de points gagne</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Phase de lancer du dé
  if (phase === GAME_PHASES.ROLLING_DIE) {
    return (
      <div className="game-board die-phase">
        <div className="die-container">
          <h2>Lancer le dé Papayoo</h2>
          <p className="die-instruction">Cliquez sur le dé pour déterminer la couleur Papayoo</p>
          <Die onRoll={actions.rollDie} result={null} />
        </div>
      </div>
    )
  }

  // Fin de manche
  if (phase === GAME_PHASES.ROUND_END) {
    return (
      <div className="game-board round-end">
        <div className="end-container">
          <h2>🏁 Fin de la manche {roundNumber}</h2>
          <ScoreBoard
            players={players}
            papayooSuit={papayooSuit}
            roundNumber={roundNumber}
          />
          <button className="continue-btn" onClick={actions.newRound}>
            <span>Manche suivante</span>
            <span className="btn-icon">→</span>
          </button>
        </div>
      </div>
    )
  }

  // Fin de partie
  if (phase === GAME_PHASES.GAME_END) {
    const winner = [...players].sort((a, b) => a.score - b.score)[0]
    return (
      <div className="game-board game-end">
        <div className="end-container">
          <div className="winner-announcement">
            <span className="trophy">🏆</span>
            <h2>Partie terminée!</h2>
            <p className="winner-name">{winner.name} gagne!</p>
            <p className="winner-score">{winner.score} points</p>
          </div>
          <ScoreBoard
            players={players}
            papayooSuit={papayooSuit}
            roundNumber={roundNumber}
          />
          <button className="restart-btn" onClick={actions.resetGame}>
            <span>Nouvelle partie</span>
            <span className="btn-icon">↺</span>
          </button>
        </div>
      </div>
    )
  }

  const papayooInfo = papayooSuit ? SUIT_DISPLAY[papayooSuit] : null
  const roundDisplay = maxRounds === 'infinite'
    ? `Manche ${roundNumber}`
    : `Manche ${roundNumber}/${maxRounds}`

  // Fonction pour retourner à l'accueil avec confirmation
  const handleBackToMenuClick = () => {
    if (window.confirm('Êtes-vous sûr de vouloir quitter la partie en cours ? Votre progression sera perdue.')) {
      if (onBackToMenu) {
        onBackToMenu()
      } else {
        actions.resetGame()
      }
    }
  }

  // Phase de jeu principale
  return (
    <div className="game-board playing">
      {/* Header */}
      <header className="game-header">
        <div className="header-left">
          <button className="back-btn" onClick={handleBackToMenuClick} title="Retour à l'accueil">
            ←
          </button>
          <span className="round-badge">{roundDisplay}</span>
        </div>
        <div className="header-center">
          {papayooInfo && (
            <div className="papayoo-badge" style={{ '--suit-color': papayooInfo.color }}>
              <span className="papayoo-label">Papayoo</span>
              <span className="papayoo-suit">{papayooInfo.symbol} 7 = 40pts</span>
            </div>
          )}
        </div>
        <div className="header-right">
          {message && <span className="game-message">{message}</span>}
        </div>
      </header>

      {/* Zone de jeu principale */}
      <div className="game-content">
        {/* Panneau gauche - Scores et Adversaires */}
        <aside className="side-panel left">
          <ScoreBoard
            players={players}
            papayooSuit={papayooSuit}
            roundNumber={roundNumber}
          />

          {/* Adversaires */}
          <div className="opponents-section">
            <h4 className="opponents-title">Joueurs</h4>
            <div className="opponents-list">
              {players.filter(p => !p.isHuman).map(player => (
                <div
                  key={player.id}
                  className={`opponent-slot ${currentPlayer === player.id ? 'active' : ''}`}
                >
                  <div className="opponent-cards">
                    {[...Array(Math.min(player.hand.length, 6))].map((_, i) => (
                      <div key={i} className="mini-card" style={{ '--i': i }} />
                    ))}
                  </div>
                  <div className="opponent-info">
                    <span className="opponent-name">{player.name}</span>
                    <span className="opponent-card-count">{player.hand.length} cartes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Zone centrale */}
        <main className="main-area">
          {/* Plateau de jeu */}
          {phase === GAME_PHASES.PLAYING && (
            <TrickArea
              currentTrick={currentTrick}
              playerCount={playerCount}
              papayooSuit={papayooSuit}
              leadSuit={leadSuit}
              onCardDrop={handleCardDrop}
              isPlayerTurn={isPlayerTurn && currentTrick.length < playerCount}
            />
          )}

          {/* Phase de passage */}
          {phase === GAME_PHASES.PASSING && humanPlayer && (
            <div className="pass-area">
              <div className="pass-card">
                <h3>Passage des cartes</h3>
                <p>Sélectionnez {getCardsToPass(playerCount)} cartes à passer à votre voisin</p>
                <div className="pass-progress">
                  <div
                    className="pass-progress-bar"
                    style={{ '--progress': humanPlayer.selectedCards.length / getCardsToPass(playerCount) }}
                  />
                  <span>{humanPlayer.selectedCards.length} / {getCardsToPass(playerCount)}</span>
                </div>
                <button
                  className="pass-btn"
                  onClick={actions.confirmPass}
                  disabled={humanPlayer.selectedCards.length !== getCardsToPass(playerCount)}
                >
                  Confirmer le passage →
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Panneau droit - Info du tour */}
        <aside className="side-panel right">
          {phase === GAME_PHASES.PLAYING && (
            <div className="turn-info">
              <h4>Tour en cours</h4>
              <div className={`current-player ${isPlayerTurn ? 'is-you' : ''}`}>
                <span className="player-indicator" />
                <span>{players[currentPlayer]?.name}</span>
              </div>
              {leadSuit && (
                <div className="lead-suit-info">
                  <span>Couleur demandée:</span>
                  <span className="lead-suit" style={{ color: SUIT_DISPLAY[leadSuit]?.color }}>
                    {SUIT_DISPLAY[leadSuit]?.symbol} {SUIT_DISPLAY[leadSuit]?.name}
                  </span>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Main du joueur */}
      {humanPlayer && (
        <footer className="player-area">
          <div className="player-info">
            <span className="your-turn-indicator">{isPlayerTurn ? "C'est à vous!" : ''}</span>
          </div>
          <Hand
            cards={humanPlayer.hand}
            onCardClick={handleCardClick}
            selectedCards={humanPlayer.selectedCards}
            leadSuit={phase === GAME_PHASES.PLAYING ? leadSuit : null}
            isActive={isPlayerTurn}
            showCards={true}
            draggable={phase === GAME_PHASES.PLAYING}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </footer>
      )}
    </div>
  )
}

export default GameBoard
