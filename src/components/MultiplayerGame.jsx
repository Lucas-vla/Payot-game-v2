import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useMultiplayer } from '../context/MultiplayerContext'
import Card from './Card'
import Die from './Die'
import ScoreBoard from './ScoreBoard'
import './MultiplayerGame.css'

const API_BASE = '/api/game'
const SUIT_DISPLAY = {
  spade: { symbol: '♠', name: 'Pique', color: '#4a5568' },
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

  const currentPlayer = game?.players?.find(p => p.id === playerId)
  const currentPlayerIndex = game?.players?.findIndex(p => p.id === playerId) ?? -1
  const isMyTurn = game?.currentPlayer === currentPlayerIndex

  const handleSelectCardToPass = (cardId) => {
    if (game?.phase !== 'passing') return
    setSelectedCards(prev => {
      if (prev.includes(cardId)) return prev.filter(id => id !== cardId)
      if (prev.length >= game.cardsToPass) return prev
      return [...prev, cardId]
    })
  }

  const handleConfirmPass = async () => {
    if (selectedCards.length !== game?.cardsToPass) return
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

  const handleCollectTrick = async () => {
    try {
      const response = await fetch(`${API_BASE}?action=collectTrick`, {
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

  const canPlayCard = (card) => {
    if (!isMyTurn || game?.phase !== 'playing') return false
    if (!game.leadSuit) return true
    const hasLeadSuit = currentPlayer?.hand?.some(c => c.suit === game.leadSuit)
    if (!hasLeadSuit) return true
    return card.suit === game.leadSuit
  }

  // Loading
  if (loading) {
    return (
      <div className="multiplayer-game mp-loading">
        <div>⏳ Chargement...</div>
      </div>
    )
  }

  // Pas de jeu
  if (!game) {
    return (
      <div className="multiplayer-game mp-loading">
        <div>
          <p>Impossible de charger la partie</p>
          <button className="mp-action-btn" onClick={onBackToMenu}>Retour au menu</button>
        </div>
      </div>
    )
  }

  // Modal de confirmation de sortie
  const ConfirmExitModal = () => showConfirmExit && (
    <div className="mp-overlay mp-confirm-exit">
      <div className="mp-modal">
        <h3>Quitter la partie ?</h3>
        <p>Êtes-vous sûr de vouloir quitter ?</p>
        <div className="mp-confirm-buttons">
          <button onClick={() => setShowConfirmExit(false)}>Annuler</button>
          <button className="danger" onClick={() => { setShowConfirmExit(false); onBackToMenu(); }}>Quitter</button>
        </div>
      </div>
    </div>
  )

  // Phase de passage des cartes
  if (game.phase === 'passing') {
    const hasConfirmed = currentPlayer?.cardsToPass?.length === game.cardsToPass

    return (
      <div className="multiplayer-game mp-passing-phase">
        <button className="exit-btn" onClick={() => setShowConfirmExit(true)}>✕</button>
        <ConfirmExitModal />

        <div className="mp-phase-header">
          <h2>📤 Phase de passage</h2>
          <p>Sélectionnez {game.cardsToPass} cartes à passer au joueur suivant</p>
          <p className="mp-selection-count">{selectedCards.length} / {game.cardsToPass} sélectionnées</p>
        </div>

        {error && <div className="mp-error-message">{error}</div>}

        <div className="mp-passing-hand">
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

        {!hasConfirmed ? (
          <button
            className="mp-confirm-pass-btn"
            onClick={handleConfirmPass}
            disabled={selectedCards.length !== game.cardsToPass}
          >
            ✓ Confirmer le passage
          </button>
        ) : (
          <div className="mp-waiting-message">
            ⏳ En attente des autres joueurs...
          </div>
        )}

        <div className="mp-players-status">
          {game.players.map((p) => (
            <div key={p.id} className={`mp-player-status ${p.cardsToPass?.length === game.cardsToPass ? 'ready' : ''}`}>
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
      <div className="multiplayer-game mp-rolling-phase">
        <button className="exit-btn" onClick={() => setShowConfirmExit(true)}>✕</button>
        <ConfirmExitModal />

        <div className="mp-phase-header">
          <h2>🎲 Lancez le dé</h2>
          <p>Cliquez sur le dé pour déterminer la couleur Papayoo</p>
        </div>

        <Die onRoll={handleRollDie} result={null} />
      </div>
    )
  }

  // Phase de jeu
  const suitInfo = game.papayooSuit ? SUIT_DISPLAY[game.papayooSuit] : null

  return (
    <div className="multiplayer-game">
      <button className="exit-btn" onClick={() => setShowConfirmExit(true)}>✕</button>
      <ConfirmExitModal />

      {/* Header */}
      <div className="mp-game-header">
        <div className="mp-round-info">Manche {game.roundNumber}</div>
        {suitInfo && (
          <div className="mp-papayoo-info" style={{ color: suitInfo.color }}>
            🎯 Papayoo: {suitInfo.symbol} {suitInfo.name}
          </div>
        )}
        {game.leadSuit && (
          <div className="mp-lead-suit-info" style={{ color: SUIT_DISPLAY[game.leadSuit]?.color }}>
            Couleur: {SUIT_DISPLAY[game.leadSuit]?.symbol} {SUIT_DISPLAY[game.leadSuit]?.name}
          </div>
        )}
      </div>

      {error && <div className="mp-error-message">{error}</div>}

      {/* Message */}
      <div className="mp-game-message">
        {game.message}
        {isMyTurn && game.phase === 'playing' && <span className="your-turn"> - C'est votre tour!</span>}
      </div>

      {/* Scores */}
      <div className="mp-players-scores">
        {game.players.map((p, idx) => (
          <div key={p.id} className={`mp-player-score ${idx === game.currentPlayer ? 'current' : ''} ${p.id === playerId ? 'is-me' : ''}`}>
            <span className="name">{p.name} {p.id === playerId && '(vous)'}</span>
            <span className="score">{p.score} pts</span>
            <span className="cards-count">{p.hand?.filter(c => !c.hidden)?.length || '?'} cartes</span>
          </div>
        ))}
      </div>

      {/* Zone de jeu */}
      <div className="mp-play-area">
        <div className="mp-trick-area">
          {game.currentTrick?.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.5)' }}>
              {isMyTurn ? 'Jouez une carte pour commencer' : 'En attente...'}
            </div>
          )}
          {game.currentTrick?.map((play, idx) => {
            const player = game.players.find(p => p.id === play.playerId)
            return (
              <div key={idx} className="mp-played-card">
                <span className="mp-player-label">{player?.name}</span>
                <Card card={play.card} />
              </div>
            )
          })}
        </div>

        {game.phase === 'trick_end' && (
          <button className="mp-collect-btn" onClick={handleCollectTrick}>
            Continuer →
          </button>
        )}
      </div>

      {/* Main du joueur */}
      {game.phase === 'playing' && currentPlayer?.hand?.length > 0 && (
        <div className="mp-player-hand">
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
        <div className="mp-overlay">
          <div className="mp-modal">
            <h2>🏁 Manche {game.roundNumber} terminée!</h2>
            <ScoreBoard players={game.players} papayooSuit={game.papayooSuit} roundNumber={game.roundNumber} />
            <button onClick={handleNewRound}>Manche suivante →</button>
          </div>
        </div>
      )}

      {/* Fin de partie */}
      {game.phase === 'game_end' && (
        <div className="mp-overlay">
          <div className="mp-modal">
            <h2>🏆 Partie terminée!</h2>
            <div className="winner">
              <span className="trophy">🥇</span>
              <span>
                {(() => {
                  const winner = [...game.players].sort((a, b) => a.score - b.score)[0]
                  return `${winner.name} gagne avec ${winner.score} points!`
                })()}
              </span>
            </div>
            <ScoreBoard players={game.players} papayooSuit={game.papayooSuit} roundNumber={game.roundNumber} />
            <button onClick={onBackToMenu}>Retour au menu</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiplayerGame

