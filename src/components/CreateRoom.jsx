import React, { useState, useEffect } from 'react'
import './CreateRoom.css'

function CreateRoom({ onCreateRoom, onBack, playerName: initialName }) {
  const [playerName, setPlayerName] = useState(initialName || '')
  const [playerCount, setPlayerCount] = useState(4)
  const [maxRounds, setMaxRounds] = useState(5)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!playerName.trim()) {
      setError('Veuillez entrer un pseudo')
      return
    }
    setError('')
    onCreateRoom(playerName.trim(), playerCount, maxRounds)
  }

  return (
    <div className="create-room">
      <div className="create-room-container">
        <button className="back-link" onClick={onBack}>
          ← Retour au menu
        </button>

        <div className="create-room-header">
          <span className="header-emoji">🎮</span>
          <h2>Créer une partie</h2>
          <p>Configurez votre partie et invitez vos amis</p>
        </div>

        <form className="create-room-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="hostName">Votre pseudo</label>
            <input
              type="text"
              id="hostName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Entrez votre pseudo..."
              maxLength={20}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label>Nombre de joueurs</label>
            <div className="player-count-selector">
              {[3, 4, 5, 6, 7, 8].map(count => (
                <button
                  key={count}
                  type="button"
                  className={playerCount === count ? 'selected' : ''}
                  onClick={() => setPlayerCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
            <span className="form-hint">
              Les places restantes seront remplies par des bots si nécessaire
            </span>
          </div>

          <div className="form-group">
            <label>Nombre de manches</label>
            <div className="player-count-selector">
              {[1, 3, 5, 10].map(rounds => (
                <button
                  key={rounds}
                  type="button"
                  className={maxRounds === rounds ? 'selected' : ''}
                  onClick={() => setMaxRounds(rounds)}
                >
                  {rounds}
                </button>
              ))}
              <button
                type="button"
                className={maxRounds === 'infinite' ? 'selected' : ''}
                onClick={() => setMaxRounds('infinite')}
              >
                ∞
              </button>
            </div>
            <span className="form-hint">
              {maxRounds === 'infinite'
                ? 'Partie sans fin - jouez autant que vous voulez!'
                : `La partie se terminera après ${maxRounds} manche${maxRounds > 1 ? 's' : ''}`}
            </span>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="create-btn">
            <span>🚀</span>
            <span>Créer la partie</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateRoom

