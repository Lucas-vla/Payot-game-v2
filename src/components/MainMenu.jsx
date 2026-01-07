import React, { useState, useEffect } from 'react'
import Rules from './Rules'
import './MainMenu.css'

function MainMenu({ onPlayVsBot, onCreateMultiplayer, onJoinMultiplayer, apiError, isLoading, inviteCode, onClearInviteCode }) {
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '')
  const [error, setError] = useState('')

  // Si on a un code d'invitation, afficher directement le formulaire avec le code pré-rempli
  useEffect(() => {
    if (inviteCode) {
      setRoomCode(inviteCode)
      setShowJoinForm(true)
    }
  }, [inviteCode])

  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    if (!playerName.trim()) {
      setError('Veuillez entrer un pseudo')
      return
    }
    if (!roomCode.trim() || roomCode.trim().length !== 6) {
      setError('Le code doit contenir 6 caractères')
      return
    }
    setError('')
    // Sauvegarder le nom
    localStorage.setItem('playerName', playerName.trim())
    await onJoinMultiplayer(roomCode.trim().toUpperCase(), playerName.trim())
  }

  const handleBackToMenu = () => {
    setShowJoinForm(false)
    if (onClearInviteCode) onClearInviteCode()
  }

  // Afficher l'erreur locale ou l'erreur de l'API
  const displayError = error || apiError

  return (
    <div className="main-menu">
      {showRules && <Rules onClose={() => setShowRules(false)} />}

      <div className="menu-container">
        {/* Logo */}
        <div className="menu-logo">
          <span className="logo-icon">🎴</span>
          <h1>Papayoo</h1>
          <p className="tagline">Le jeu de cartes où il faut éviter les points!</p>
        </div>

        {!showJoinForm ? (
          <>
            {/* Boutons principaux */}
            <div className="menu-buttons">
              <button className="menu-btn solo-btn" onClick={onPlayVsBot}>
                <span className="btn-emoji">🤖</span>
                <div className="btn-text">
                  <span className="btn-title">Jouer contre l'IA</span>
                  <span className="btn-desc">Partie solo contre des bots</span>
                </div>
              </button>

              <button className="menu-btn multi-btn" onClick={onCreateMultiplayer}>
                <span className="btn-emoji">🎮</span>
                <div className="btn-text">
                  <span className="btn-title">Créer une partie</span>
                  <span className="btn-desc">Invitez vos amis à jouer</span>
                </div>
              </button>

              <button className="menu-btn join-btn" onClick={() => setShowJoinForm(true)}>
                <span className="btn-emoji">🚪</span>
                <div className="btn-text">
                  <span className="btn-title">Rejoindre une partie</span>
                  <span className="btn-desc">Entrez un code d'invitation</span>
                </div>
              </button>
            </div>

            {/* Règles rapides */}
            <div className="menu-rules">
              <h3>📋 Règles rapides</h3>
              <ul>
                <li>⭐ Les cartes <strong>Payoo</strong> valent leur valeur (1-20 pts)</li>
                <li>🎲 Le dé désigne la couleur <strong>Papayoo</strong> dont le 7 vaut 40 pts</li>
                <li>🏆 Le joueur avec le <strong>moins de points</strong> gagne!</li>
              </ul>
              <button className="rules-link-btn" onClick={() => setShowRules(true)}>
                📖 Lire les règles complètes
              </button>
            </div>
          </>
        ) : (
          /* Formulaire pour rejoindre */
          <div className="join-form-container">
            <button className="back-link" onClick={handleBackToMenu}>
              ← Retour au menu
            </button>

            <h2>🚪 Rejoindre une partie</h2>

            <form className="join-form" onSubmit={handleJoinSubmit}>
              <div className="form-group">
                <label htmlFor="playerName">Votre pseudo</label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Entrez votre pseudo..."
                  maxLength={20}
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor="roomCode">Code de la partie</label>
                <input
                  type="text"
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC123"
                  maxLength={6}
                  className="code-input"
                  autoComplete="off"
                />
              </div>

              {displayError && <div className="form-error">{displayError}</div>}

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Connexion...' : 'Rejoindre la partie'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default MainMenu

