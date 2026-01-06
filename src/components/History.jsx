import React, { useState, useEffect } from 'react'
import { getGameHistory, getStats, clearHistory } from '../utils/history'
import './History.css'

function History({ onClose }) {
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [activeTab, setActiveTab] = useState('history') // 'history' ou 'stats'

  useEffect(() => {
    setHistory(getGameHistory())
    setStats(getStats())
  }, [])

  const handleClearHistory = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer tout l\'historique ?')) {
      clearHistory()
      setHistory([])
      setStats(getStats())
    }
  }

  const formatDate = (isoDate) => {
    const date = new Date(isoDate)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRankEmoji = (rank) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `${rank}e`
    }
  }

  return (
    <div className="history-overlay">
      <div className="history-modal">
        <div className="history-header">
          <h2>📊 Historique & Statistiques</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="history-tabs">
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📜 Historique
          </button>
          <button
            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📈 Statistiques
          </button>
        </div>

        <div className="history-content">
          {activeTab === 'stats' && stats && (
            <div className="stats-container">
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-value">{stats.totalGames}</span>
                  <span className="stat-label">Parties jouées</span>
                </div>
                <div className="stat-card highlight">
                  <span className="stat-value">{stats.wins}</span>
                  <span className="stat-label">Victoires</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{stats.winRate}%</span>
                  <span className="stat-label">Taux de victoire</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{stats.averageRank}</span>
                  <span className="stat-label">Classement moyen</span>
                </div>
                {stats.bestScore !== null && (
                  <>
                    <div className="stat-card success">
                      <span className="stat-value">{stats.bestScore}</span>
                      <span className="stat-label">Meilleur score</span>
                    </div>
                    <div className="stat-card danger">
                      <span className="stat-value">{stats.worstScore}</span>
                      <span className="stat-label">Pire score</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-list">
              {history.length === 0 ? (
                <div className="no-history">
                  <span className="no-history-icon">🎴</span>
                  <p>Aucune partie enregistrée</p>
                  <p className="no-history-sub">Jouez votre première partie!</p>
                </div>
              ) : (
                <>
                  {history.map(game => (
                    <div key={game.id} className="history-item">
                      <div className="history-item-header">
                        <span className="history-date">{formatDate(game.date)}</span>
                        <span className={`history-rank rank-${game.humanRank}`}>
                          {getRankEmoji(game.humanRank)}
                        </span>
                      </div>
                      <div className="history-item-details">
                        <span className="history-info">
                          {game.playerCount} joueurs • {game.rounds} manche{game.rounds > 1 ? 's' : ''}
                          {game.maxRounds !== 'infinite' && ` / ${game.maxRounds}`}
                        </span>
                      </div>
                      <div className="history-players">
                        {game.players
                          .sort((a, b) => a.score - b.score)
                          .map((player, idx) => (
                            <div
                              key={idx}
                              className={`history-player ${player.isHuman ? 'is-human' : ''}`}
                            >
                              <span className="player-rank">{idx + 1}.</span>
                              <span className="player-name">{player.name}</span>
                              <span className="player-score">{player.score} pts</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  ))}

                  <button className="clear-history-btn" onClick={handleClearHistory}>
                    🗑️ Effacer l'historique
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default History

