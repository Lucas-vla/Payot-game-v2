import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useMultiplayer } from '../context/MultiplayerContext'
import { SUIT_DISPLAY } from '../utils/deck'
import Hand from './Hand'
import TrickArea from './TrickArea'
import ScoreBoard from './ScoreBoard'
import Die from './Die'
import './GameBoard.css'  // Utiliser le même CSS que GameBoard

const API_BASE = '/api/game'

function MultiplayerGame({ onBackToMenu }) {
  const { currentRoom, playerId, roomData } = useMultiplayer()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCards, setSelectedCards] = useState([])
  const [showConfirmExit, setShowConfirmExit] = useState(false)
  const pollingRef = useRef(null)

  // Initialiser ou récupérer le jeu
  const fetchGameState = useCallback(async () => {
    if (!currentRoom || !playerId) return

    try {
      const response = await fetch(`${API_BASE}?action=state&roomCode=${currentRoom}&playerId=${playerId}`)
      const data = await response.json()

      if (data.success && data.game) {
        setGame(data.game)
        setError(null)
      } else if (response.status === 404) {
        if (roomData) {
          const initResponse = await fetch(`${API_BASE}?action=init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room: roomData })
          })
          const initData = await initResponse.json()
          if (initData.success) {
            setGame(initData.game)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching game state:', err)
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [currentRoom, playerId, roomData])

  useEffect(() => {
    fetchGameState()
    pollingRef.current = setInterval(fetchGameState, 1500)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [fetchGameState])

  // Collecter le pli automatiquement après un délai
  const collectTrick = useCallback(async () => {
    if (game?.phase !== 'trick_end') return

    try {
      const response = await fetch(`${API_BASE}?action=collectTrick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: currentRoom })
      })
      const data = await response.json()
      if (data.success) {
        setGame(data.game)
      }
    } catch (err) {
      console.error('CollectTrick error:', err)
    }
  }, [game?.phase, currentRoom])

  // Auto-collecter le pli après 2 secondes quand on est en trick_end
  useEffect(() => {
    if (game?.phase === 'trick_end') {
      const timer = setTimeout(() => {
        collectTrick()
      }, 2000) // 2 secondes pour voir qui a gagné
      return () => clearTimeout(timer)
    }
  }, [game?.phase, collectTrick])

  // Trouver le joueur actuel
  const currentPlayerData = game?.players?.find(p => p.id === playerId)
  const currentPlayerIndex = game?.players?.findIndex(p => p.id === playerId) ?? -1
  const isMyTurn = game?.currentPlayer === currentPlayerIndex

  // Obtenir le nombre de cartes à passer
  const getCardsToPassCount = (playerCount) => {
    if (playerCount <= 4) return 5
    if (playerCount === 5) return 4
    return 3
  }

  // Sélectionner une carte pour le passage
  const handleCardClick = (card) => {
    if (game?.phase === 'passing') {
      const cardsToPass = getCardsToPassCount(game.playerCount)
      setSelectedCards(prev => {
        if (prev.includes(card.id)) return prev.filter(id => id !== card.id)
        if (prev.length >= cardsToPass) return prev
        return [...prev, card.id]
      })
    } else if (game?.phase === 'playing' && isMyTurn) {
      handlePlayCard(card.id)
    }
  }

  // Confirmer le passage des cartes
  const handleConfirmPass = async () => {
    const cardsToPass = getCardsToPassCount(game?.playerCount)
    if (selectedCards.length !== cardsToPass) return

    try {
      await fetch(`${API_BASE}?action=selectCards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: currentRoom, playerId, cardIds: selectedCards })
      })
      const response = await fetch(`${API_BASE}?action=confirmPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: currentRoom, playerId })
      })
      const data = await response.json()
      if (data.success) {
        setGame(data.game)
        setSelectedCards([])
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Erreur lors du passage des cartes')
    }
  }

  // Lancer le dé
  const handleRollDie = async (papayooSuit) => {
    try {
      const response = await fetch(`${API_BASE}?action=rollDie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: currentRoom, papayooSuit })
      })
      const data = await response.json()
      if (data.success) setGame(data.game)
    } catch (err) {
      setError('Erreur lors du lancer de dé')
    }
  }

  // Jouer une carte
  const handlePlayCard = async (cardId) => {
    if (!isMyTurn || game?.phase !== 'playing') return

    // Vérifier si la carte peut être jouée
    const card = currentPlayerData?.hand?.find(c => c.id === cardId)
    if (!card) return

    if (game.leadSuit) {
      const hasLeadSuit = currentPlayerData?.hand?.some(c => c.suit === game.leadSuit)
      if (hasLeadSuit && card.suit !== game.leadSuit) {
        setError('Vous devez jouer la couleur demandée!')
        setTimeout(() => setError(null), 2000)
        return
      }
    }

    try {
      const response = await fetch(`${API_BASE}?action=playCard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: currentRoom, playerId, cardId })
      })
      const data = await response.json()
      if (data.success) {
        setGame(data.game)
      } else {
        setError(data.error)
        setTimeout(() => setError(null), 2000)
      }
    } catch (err) {
      setError('Erreur lors du jeu de la carte')
    }
  }

  // Nouvelle manche
  const handleNewRound = async () => {
    try {
      const response = await fetch(`${API_BASE}?action=newRound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: currentRoom })
      })
      const data = await response.json()
      if (data.success) setGame(data.game)
    } catch (err) {
      setError('Erreur')
    }
  }

  // Drop de carte sur le plateau
  const handleCardDrop = (cardId) => {
    if (isMyTurn && game?.phase === 'playing') {
      handlePlayCard(cardId)
    }
  }

  // Retour au menu avec confirmation
  const handleBackToMenuClick = () => {
    setShowConfirmExit(true)
  }

  const confirmExit = () => {
    setShowConfirmExit(false)
    onBackToMenu()
  }

  // Loading
  if (loading) {
    return (
      <div className="game-board setup">
        <div className="setup-container">
          <div className="logo">
            <span className="logo-icon">🎴</span>
            <h1>Chargement...</h1>
          </div>
        </div>
      </div>
    )
  }

  // Pas de jeu
  if (!game) {
    return (
      <div className="game-board setup">
        <div className="setup-container">
          <div className="logo">
            <span className="logo-icon">❌</span>
            <h1>Erreur</h1>
          </div>
          <p>Impossible de charger la partie</p>
          <button className="start-btn" onClick={onBackToMenu}>
            <span>Retour au menu</span>
          </button>
        </div>
      </div>
    )
  }

  // Modal de confirmation de sortie
  const ConfirmExitModal = () => showConfirmExit && (
    <div className="confirm-exit-overlay" onClick={() => setShowConfirmExit(false)}>
      <div className="confirm-exit-modal" onClick={e => e.stopPropagation()}>
        <h3>Quitter la partie ?</h3>
        <p>Êtes-vous sûr de vouloir quitter ?</p>
        <div className="confirm-buttons">
          <button onClick={() => setShowConfirmExit(false)}>Annuler</button>
          <button className="danger" onClick={confirmExit}>Quitter</button>
        </div>
      </div>
    </div>
  )

  // Phase de lancer de dé
  if (game.phase === 'rolling_die') {
    return (
      <div className="game-board die-phase">
        <ConfirmExitModal />
        <div className="die-container">
          <h2>Lancer le dé Papayoo</h2>
          <p className="die-instruction">Cliquez sur le dé pour déterminer la couleur Papayoo</p>
          <Die onRoll={handleRollDie} result={null} />
        </div>
      </div>
    )
  }

  // Fin de manche
  if (game.phase === 'round_end') {
    return (
      <div className="game-board round-end">
        <ConfirmExitModal />
        <div className="end-container">
          <h2>🏁 Fin de la manche {game.roundNumber}</h2>
          <ScoreBoard
            players={game.players}
            papayooSuit={game.papayooSuit}
            roundNumber={game.roundNumber}
          />
          <button className="continue-btn" onClick={handleNewRound}>
            <span>Manche suivante</span>
            <span className="btn-icon">→</span>
          </button>
        </div>
      </div>
    )
  }

  // Fin de partie
  if (game.phase === 'game_end') {
    const winner = [...game.players].sort((a, b) => a.score - b.score)[0]
    return (
      <div className="game-board game-end">
        <ConfirmExitModal />
        <div className="end-container">
          <div className="winner-announcement">
            <span className="trophy">🏆</span>
            <h2>Partie terminée!</h2>
            <p className="winner-name">{winner.name} gagne!</p>
            <p className="winner-score">{winner.score} points</p>
          </div>
          <ScoreBoard
            players={game.players}
            papayooSuit={game.papayooSuit}
            roundNumber={game.roundNumber}
          />
          <button className="restart-btn" onClick={onBackToMenu}>
            <span>Retour au menu</span>
            <span className="btn-icon">↺</span>
          </button>
        </div>
      </div>
    )
  }

  // Transformer currentTrick pour le format attendu par TrickArea
  const formattedTrick = game.currentTrick?.map(play => ({
    playerId: game.players.findIndex(p => p.id === play.playerId),
    card: play.card
  })) || []

  const papayooInfo = game.papayooSuit ? SUIT_DISPLAY[game.papayooSuit] : null
  const roundDisplay = game.maxRounds === 'infinite'
    ? `Manche ${game.roundNumber}`
    : `Manche ${game.roundNumber}/${game.maxRounds}`

  const cardsToPass = getCardsToPassCount(game.playerCount)

  // Phase de passage ou phase de jeu principale
  return (
    <div className="game-board playing">
      <ConfirmExitModal />

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
          {error && <span className="game-message" style={{ color: '#ff6b6b' }}>{error}</span>}
          {!error && game.message && <span className="game-message">{game.message}</span>}
        </div>
      </header>

      {/* Zone de jeu principale */}
      <div className="game-content">
        {/* Panneau gauche - Scores */}
        <aside className="side-panel left">
          <ScoreBoard
            players={game.players}
            papayooSuit={game.papayooSuit}
            roundNumber={game.roundNumber}
          />
        </aside>

        {/* Zone centrale */}
        <main className="main-area">
          {/* Autres joueurs */}
          <div className="opponents-area">
            {game.players.filter(p => p.id !== playerId).map((player, idx) => {
              const playerIdx = game.players.findIndex(p => p.id === player.id)
              return (
                <div
                  key={player.id}
                  className={`opponent-slot ${game.currentPlayer === playerIdx ? 'active' : ''}`}
                >
                  <div className="opponent-cards">
                    {[...Array(Math.min(player.hand?.filter(c => !c.hidden)?.length || 0, 6))].map((_, i) => (
                      <div key={i} className="mini-card" style={{ '--i': i }} />
                    ))}
                  </div>
                  <div className="opponent-info">
                    <span className="opponent-name">{player.name}</span>
                    <span className="opponent-card-count">
                      {player.hand?.filter(c => !c.hidden)?.length || '?'} cartes
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Plateau de jeu - affiché pendant playing ET trick_end */}
          {(game.phase === 'playing' || game.phase === 'trick_end') && (
            <>
              <TrickArea
                currentTrick={formattedTrick}
                playerCount={game.playerCount}
                papayooSuit={game.papayooSuit}
                leadSuit={game.leadSuit}
                onCardDrop={handleCardDrop}
                isPlayerTurn={isMyTurn && game.phase === 'playing' && game.currentTrick.length < game.playerCount}
              />
              {/* Message du gagnant du pli */}
              {game.phase === 'trick_end' && (
                <div className="trick-winner-message" style={{
                  textAlign: 'center',
                  marginTop: '15px',
                  padding: '10px 20px',
                  backgroundColor: 'rgba(76, 175, 80, 0.3)',
                  borderRadius: '10px',
                  color: '#4caf50',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>
                  🏆 {game.message}
                </div>
              )}
            </>
          )}

          {/* Phase de passage */}
          {game.phase === 'passing' && currentPlayerData && (
            <div className="pass-area">
              <div className="pass-card">
                <h3>Passage des cartes</h3>
                <p>Sélectionnez {cardsToPass} cartes à passer à votre voisin</p>
                <div className="pass-progress">
                  <div
                    className="pass-progress-bar"
                    style={{ '--progress': selectedCards.length / cardsToPass }}
                  />
                  <span>{selectedCards.length} / {cardsToPass}</span>
                </div>

                {/* Statut des autres joueurs */}
                <div className="pass-status">
                  {game.players.map(p => (
                    <span key={p.id} className={`status-dot ${p.cardsToPass?.length === cardsToPass ? 'ready' : ''}`}>
                      {p.name}: {p.cardsToPass?.length === cardsToPass ? '✓' : '...'}
                    </span>
                  ))}
                </div>

                <button
                  className="pass-btn"
                  onClick={handleConfirmPass}
                  disabled={selectedCards.length !== cardsToPass || currentPlayerData.cardsToPass?.length === cardsToPass}
                >
                  {currentPlayerData.cardsToPass?.length === cardsToPass
                    ? 'En attente des autres...'
                    : 'Confirmer le passage →'}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Panneau droit - Info du tour */}
        <aside className="side-panel right">
          {(game.phase === 'playing' || game.phase === 'trick_end') && (
            <div className="turn-info">
              <h4>{game.phase === 'trick_end' ? 'Pli terminé' : 'Tour en cours'}</h4>
              <div className={`current-player ${isMyTurn ? 'is-you' : ''}`}>
                <span className="player-indicator" />
                <span>{game.players[game.currentPlayer]?.name}</span>
                {isMyTurn && game.phase === 'playing' && <span style={{ color: '#4caf50', marginLeft: '5px' }}>(vous)</span>}
              </div>
              {game.leadSuit && (
                <div className="lead-suit-info">
                  <span>Couleur demandée:</span>
                  <span className="lead-suit" style={{ color: SUIT_DISPLAY[game.leadSuit]?.color }}>
                    {SUIT_DISPLAY[game.leadSuit]?.symbol} {SUIT_DISPLAY[game.leadSuit]?.name}
                  </span>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Main du joueur */}
      {currentPlayerData && (
        <footer className="player-area">
          <div className="player-info">
            <span className="your-turn-indicator">
              {isMyTurn && game.phase === 'playing' ? "C'est à vous!" : ''}
            </span>
          </div>
          <Hand
            cards={currentPlayerData.hand || []}
            onCardClick={handleCardClick}
            selectedCards={game.phase === 'passing' ? selectedCards : []}
            leadSuit={game.phase === 'playing' ? game.leadSuit : null}
            isActive={isMyTurn && game.phase === 'playing'}
            showCards={true}
            draggable={game.phase === 'playing'}
          />
        </footer>
      )}
    </div>
  )
}

export default MultiplayerGame

