import React, { useState, useEffect } from 'react'
import Chat from './Chat'
import './Lobby.css'

function Lobby({
  roomCode,
  players,
  isHost,
  playerCount,
  currentPlayerId,
  onLeave,
  onStartGame,
  onToggleReady,
  onAddBot,
  error
}) {
  const [copied, setCopied] = useState(false)
  const currentPlayer = players.find(p => p.id === currentPlayerId)
  const isReady = currentPlayer?.isReady || false
  const allReady = players.length >= 3 && players.every(p => p.isReady)
  const canStart = isHost && allReady
  const spotsLeft = playerCount - players.length

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback pour les navigateurs sans clipboard API
      const input = document.createElement('input')
      input.value = roomCode
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareLink = async () => {
    // Utiliser l'URL de production ou l'origine actuelle
    // En production Vercel, on préfère l'URL de production fixe
    const productionUrl = 'https://payot-game-v2.vercel.app'
    const currentOrigin = window.location.origin

    // Utiliser l'URL de production si on est sur Vercel, sinon l'origine actuelle (dev local)
    const baseUrl = currentOrigin.includes('vercel.app') ? productionUrl : currentOrigin
    const inviteUrl = `${baseUrl}?join=${roomCode}`

    console.log('Sharing URL:', inviteUrl) // Debug

    // Copier dans le presse-papier
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      // Fallback si clipboard ne marche pas
      const input = document.createElement('input')
      input.value = inviteUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  // URL affichée pour l'utilisateur
  const getDisplayUrl = () => {
    const productionUrl = 'https://payot-game-v2.vercel.app'
    const currentOrigin = window.location.origin
    const baseUrl = currentOrigin.includes('vercel.app') ? productionUrl : currentOrigin
    return `${baseUrl}?join=${roomCode}`
  }

  return (
    <div className="lobby">
      <div className="lobby-container">
        <button className="leave-btn" onClick={onLeave}>
          ← Quitter le salon
        </button>

        {/* Code de la partie */}
        <div className="room-code-section">
          <span className="room-code-label">Code de la partie</span>
          <div className="room-code-display">
            <span className="room-code">{roomCode}</span>
            <button className="copy-btn" onClick={copyCode}>
              {copied ? '✓ Copié!' : '📋 Copier'}
            </button>
          </div>
          <button className="share-btn" onClick={shareLink}>
            {copied ? '✓ Lien copié!' : '🔗 Partager le lien'}
          </button>
          <p className="invite-hint" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
            Lien: {getDisplayUrl()}
          </p>
        </div>

        {/* Liste des joueurs */}
        <div className="players-section">
          <h3>Joueurs ({players.length}/{playerCount})</h3>

          <div className="players-list">
            {players.map((player, index) => (
              <div
                key={player.id}
                className={`player-item ${player.id === currentPlayerId ? 'is-you' : ''} ${player.isReady ? 'ready' : ''}`}
              >
                <div className="player-avatar">
                  {player.isHost ? '👑' : '🎴'}
                </div>
                <div className="player-info">
                  <span className="player-name">
                    {player.name}
                    {player.id === currentPlayerId && <span className="you-badge">(vous)</span>}
                  </span>
                  <span className="player-status">
                    {player.isHost ? 'Hôte' : player.isReady ? 'Prêt' : 'En attente'}
                  </span>
                </div>
                <div className={`ready-indicator ${player.isReady ? 'ready' : ''}`}>
                  {player.isReady ? '✓' : '○'}
                </div>
              </div>
            ))}

            {/* Places vides */}
            {[...Array(spotsLeft)].map((_, index) => (
              <div key={`empty-${index}`} className="player-item empty">
                <div className="player-avatar">👤</div>
                <div className="player-info">
                  <span className="player-name">En attente...</span>
                  <span className="player-status">Place disponible</span>
                </div>
                {isHost && (
                  <button className="add-bot-btn" onClick={onAddBot}>
                    +🤖
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="lobby-actions">
          {error && (
            <div className="lobby-error">{error}</div>
          )}

          {!isHost && (
            <button
              className={`ready-btn ${isReady ? 'is-ready' : ''}`}
              onClick={() => onToggleReady(!isReady)}
            >
              {isReady ? '✓ Prêt!' : 'Je suis prêt'}
            </button>
          )}

          {isHost && (
            <button
              className={`start-btn ${canStart ? '' : 'disabled'}`}
              onClick={onStartGame}
              disabled={!canStart}
            >
              {players.length < 3
                ? `Minimum 3 joueurs requis`
                : !allReady
                  ? 'En attente des joueurs...'
                  : '🎮 Lancer la partie'}
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="lobby-tips">
          <p>💡 Partagez le code ou le lien avec vos amis pour qu'ils puissent rejoindre</p>
          {isHost && spotsLeft > 0 && (
            <p>🤖 Vous pouvez ajouter des bots pour remplir les places vides</p>
          )}
        </div>
      </div>

      {/* Chat */}
      <Chat
        roomCode={roomCode}
        playerId={currentPlayerId}
        playerName={currentPlayer?.name || 'Joueur'}
      />
    </div>
  )
}

export default Lobby

