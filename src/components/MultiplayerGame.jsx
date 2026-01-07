import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useMultiplayer } from '../context/MultiplayerContext'
import Card from './Card'
import Die from './Die'
import ScoreBoard from './ScoreBoard'
import './GameBoard.css'

const API_BASE = '/api/game'
const SUIT_DISPLAY = {
  spade: { symbol: '♠', name: 'Pique', color: '#2c3e50' },
  heart: { symbol: '♥', name: 'Cœur', color: '#e74c3c' },
  diamond: { symbol: '♦', name: 'Carreau', color: '#f39c12' },
  club: { symbol: '♣', name: 'Trèfle', color: '#27ae60' },
  payoo: { symbol: '★', name: 'Payoo', color: '#9b59b6' }
}

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
        // Jeu pas encore créé, l'initialiser
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

  // Démarrer le polling
  useEffect(() => {
    fetchGameState()

    pollingRef.current = setInterval(fetchGameState, 1500)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [fetchGameState])

  // Trouver le joueur actuel
  const currentPlayer = game?.players?.find(p => p.id === playerId)
  const currentPlayerIndex = game?.players?.findIndex(p => p.id === playerId) ?? -1
  const isMyTurn = game?.currentPlayer === currentPlayerIndex

  // Sélectionner une carte à passer
  const handleSelectCardToPass = (cardId) => {
    if (game?.phase !== 'passing') return

    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId)
      }
      if (prev.length >= game.cardsToPass) {
        return prev
      }
      return [...prev, cardId]
    })
  }

  // Confirmer le passage des cartes
  const handleConfirmPass = async () => {
    if (selectedCards.length !== game?.cardsToPass) return

    try {
      // D'abord envoyer la sélection
      await fetch(`${API_BASE}?action=selectCards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: currentRoom,
          playerId,
          cardIds: selectedCards
        })
      })

      // Puis confirmer
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
      if (data.success) {
        setGame(data.game)
      }
    } catch (err) {
      setError('Erreur lors du lancer de dé')
    }
  }

  // Jouer une carte
  const handlePlayCard = async (cardId) => {
    if (!isMyTurn || game?.phase !== 'playing') return

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

  // Collecter le pli
  const handleCollectTrick = async () => {
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
      setError('Erreur')
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
      if (data.success) {
        setGame(data.game)
      }
    } catch (err) {
      setError('Erreur')
    }
  }

  // Vérifier si une carte peut être jouée
  const canPlayCard = (card) => {
    if (!isMyTurn || game?.phase !== 'playing') return false
    if (!game.leadSuit) return true

    const hasLeadSuit = currentPlayer?.hand?.some(c => c.suit === game.leadSuit)
    if (!hasLeadSuit) return true
    return card.suit === game.leadSuit
  }

  // Confirmer la sortie
  const handleExitClick = () => {
    setShowConfirmExit(true)
  }

  const handleConfirmExit = () => {
    setShowConfirmExit(false)
    onBackToMenu()
  }

  // Loading
  if (loading) {
    return (
      <div className="game-board loading">
        <div className="loading-spinner">Chargement...</div>
      </div>
    )
  }

  // Pas de jeu
  if (!game) {
    return (
      <div className="game-board error">
        <p>Impossible de charger la partie</p>
        <button onClick={onBackToMenu}>Retour au menu</button>
      </div>
    )
  }

  // Phase de passage des cartes
  if (game.phase === 'passing') {
    const hasConfirmed = currentPlayer?.cardsToPass?.length === game.cardsToPass

    return (
      <div className="game-board passing-phase">
        <button className="exit-btn" onClick={handleExitClick}>✕</button>

        {showConfirmExit && (
          <div className="confirm-exit-overlay">
            <div className="confirm-exit-modal">
              <h3>Quitter la partie ?</h3>
              <p>Êtes-vous sûr de vouloir quitter ?</p>
              <div className="confirm-buttons">
                <button onClick={() => setShowConfirmExit(false)}>Annuler</button>
                <button className="danger" onClick={handleConfirmExit}>Quitter</button>
              </div>
            </div>
          </div>
        )}

        <div className="phase-header">
          <h2>Phase de passage</h2>
          <p>Sélectionnez {game.cardsToPass} cartes à passer au joueur suivant</p>
          <p className="selection-count">{selectedCards.length} / {game.cardsToPass} sélectionnées</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="player-hand passing-hand">
          {currentPlayer?.hand?.map(card => (
            <div
              key={card.id}
              className={`card-wrapper ${selectedCards.includes(card.id) ? 'selected' : ''}`}
              onClick={() => !hasConfirmed && handleSelectCardToPass(card.id)}
            >
              <Card card={card} />
            </div>
          ))}
        </div>

        {!hasConfirmed && (
          <button
            className="confirm-pass-btn"
            onClick={handleConfirmPass}
            disabled={selectedCards.length !== game.cardsToPass}
          >
            Confirmer le passage
          </button>
        )}

        {hasConfirmed && (
          <div className="waiting-message">
            En attente des autres joueurs...
          </div>
        )}

        <div className="other-players-status">
          {game.players.map((p, idx) => (
            <div key={p.id} className={`player-status ${p.cardsToPass?.length === game.cardsToPass ? 'ready' : ''}`}>
              <span>{p.name}</span>
              <span>{p.cardsToPass?.length === game.cardsToPass ? '✓' : '...'}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Phase de lancer de dé
  if (game.phase === 'rolling_die') {
    return (
      <div className="game-board rolling-phase">
        <button className="exit-btn" onClick={handleExitClick}>✕</button>

        {showConfirmExit && (
          <div className="confirm-exit-overlay">
            <div className="confirm-exit-modal">
              <h3>Quitter la partie ?</h3>
              <p>Êtes-vous sûr de vouloir quitter ?</p>
              <div className="confirm-buttons">
                <button onClick={() => setShowConfirmExit(false)}>Annuler</button>
                <button className="danger" onClick={handleConfirmExit}>Quitter</button>
              </div>
            </div>
          </div>
        )}

        <div className="phase-header">
          <h2>Lancez le dé</h2>
          <p>Cliquez sur le dé pour déterminer la couleur Papayoo</p>
        </div>

        <Die onRoll={handleRollDie} result={null} />
      </div>
    )
  }

  // Phase de jeu / fin de pli / fin de manche / fin de partie
  const suitInfo = game.papayooSuit ? SUIT_DISPLAY[game.papayooSuit] : null

  return (
    <div className="game-board playing-phase">
      <button className="exit-btn" onClick={handleExitClick}>✕</button>

      {showConfirmExit && (
        <div className="confirm-exit-overlay">
          <div className="confirm-exit-modal">
            <h3>Quitter la partie ?</h3>
            <p>Êtes-vous sûr de vouloir quitter ?</p>
            <div className="confirm-buttons">
              <button onClick={() => setShowConfirmExit(false)}>Annuler</button>
              <button className="danger" onClick={handleConfirmExit}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      {/* Header avec info Papayoo */}
      <div className="game-header">
        <div className="round-info">Manche {game.roundNumber}</div>
        {suitInfo && (
          <div className="papayoo-info" style={{ color: suitInfo.color }}>
            Papayoo: {suitInfo.symbol} {suitInfo.name}
          </div>
        )}
        {game.leadSuit && (
          <div className="lead-suit-info" style={{ color: SUIT_DISPLAY[game.leadSuit]?.color }}>
            Couleur demandée: {SUIT_DISPLAY[game.leadSuit]?.symbol}
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Message du jeu */}
      <div className="game-message">
        {game.message}
        {isMyTurn && game.phase === 'playing' && <span className="your-turn"> - C'est votre tour!</span>}
      </div>

      {/* Plateau avec les cartes jouées */}
      <div className="play-area">
        <div className="trick-area">
          {game.currentTrick?.map((play, idx) => {
            const player = game.players.find(p => p.id === play.playerId)
            return (
              <div key={idx} className="played-card">
                <span className="player-label">{player?.name}</span>
                <Card card={play.card} />
              </div>
            )
          })}
        </div>

        {/* Bouton pour collecter le pli */}
        {game.phase === 'trick_end' && (
          <button className="collect-btn" onClick={handleCollectTrick}>
            Continuer
          </button>
        )}
      </div>

      {/* Scores des joueurs */}
      <div className="players-scores">
        {game.players.map((p, idx) => (
          <div
            key={p.id}
            className={`player-score ${idx === game.currentPlayer ? 'current' : ''} ${p.id === playerId ? 'is-me' : ''}`}
          >
            <span className="name">{p.name} {p.id === playerId && '(vous)'}</span>
            <span className="score">{p.score} pts</span>
            <span className="cards-count">{p.hand?.length || 0} cartes</span>
          </div>
        ))}
      </div>

      {/* Main du joueur */}
      {game.phase === 'playing' && currentPlayer?.hand?.length > 0 && (
        <div className="player-hand">
          {currentPlayer.hand.map(card => (
            <div
              key={card.id}
              className={`card-wrapper ${canPlayCard(card) ? 'playable' : 'disabled'} ${isMyTurn ? 'my-turn' : ''}`}
              onClick={() => canPlayCard(card) && handlePlayCard(card.id)}
            >
              <Card card={card} />
            </div>
          ))}
        </div>
      )}

      {/* Fin de manche */}
      {game.phase === 'round_end' && (
        <div className="round-end-overlay">
          <div className="round-end-modal">
            <h2>Manche {game.roundNumber} terminée!</h2>
            <ScoreBoard
              players={game.players}
              papayooSuit={game.papayooSuit}
              roundNumber={game.roundNumber}
            />
            <button onClick={handleNewRound}>Manche suivante</button>
          </div>
        </div>
      )}

      {/* Fin de partie */}
      {game.phase === 'game_end' && (
        <div className="game-end-overlay">
          <div className="game-end-modal">
            <h2>🏆 Partie terminée!</h2>
            <div className="winner">
              {(() => {
                const winner = [...game.players].sort((a, b) => a.score - b.score)[0]
                return (
                  <>
                    <span className="trophy">🥇</span>
                    <span>{winner.name} gagne avec {winner.score} points!</span>
                  </>
                )
              })()}
            </div>
            <ScoreBoard
              players={game.players}
              papayooSuit={game.papayooSuit}
              roundNumber={game.roundNumber}
            />
            <button onClick={onBackToMenu}>Retour au menu</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiplayerGame

