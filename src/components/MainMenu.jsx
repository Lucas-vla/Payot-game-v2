import React, { useState } from 'react'
import './MainMenu.css'

function MainMenu({ onPlayVsBot, onCreateMultiplayer, onJoinMultiplayer }) {
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '')
  const [error, setError] = useState('')

  const handleJoinSubmit = (e) => {
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
    onJoinMultiplayer(roomCode.trim().toUpperCase(), playerName.trim())
  }

  return (
    <div className="main-menu">
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
            </div>
          </>
        ) : (
          /* Formulaire pour rejoindre */
          <div className="join-form-container">
            <button className="back-link" onClick={() => setShowJoinForm(false)}>
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

              {error && <div className="form-error">{error}</div>}

              <button type="submit" className="submit-btn">
                Rejoindre la partie
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default MainMenu

