import React from 'react'
import { calculateTrickPoints } from '../utils/scoring'
import './ScoreBoard.css'

function ScoreBoard({ players, papayooSuit, roundNumber, showRoundBreakdown = true }) {
  // Utiliser lastRoundPoints si disponible, sinon calculer (pour compatibilité)
  const playersWithRoundPoints = players.map(player => {
    // Si lastRoundPoints existe, l'utiliser (les points sont déjà dans le score)
    // Sinon, calculer à partir des collectedCards (pendant la manche en cours)
    const hasLastRoundPoints = player.lastRoundPoints !== undefined
    const roundPoints = hasLastRoundPoints
      ? player.lastRoundPoints
      : calculateTrickPoints(player.collectedCards || [], papayooSuit)

    return {
      ...player,
      roundPoints,
      // Le score total est déjà correct si lastRoundPoints existe
      displayScore: hasLastRoundPoints ? player.score : player.score + roundPoints,
      previousScore: hasLastRoundPoints ? player.score - player.lastRoundPoints : player.score
    }
  })

  const sortedPlayers = [...playersWithRoundPoints].sort((a, b) =>
    a.displayScore - b.displayScore
  )

  return (
    <div className="scoreboard">
      <div className="scoreboard-header">
        <h3>Classement</h3>
        <span className="round-indicator">Manche {roundNumber}</span>
      </div>

      <div className="score-list">
        {sortedPlayers.map((player, index) => {
          const isLeader = index === 0

          return (
            <div
              key={player.id}
              className={`score-item ${player.isHuman ? 'is-human' : ''} ${isLeader ? 'is-leader' : ''}`}
            >
              <div className="score-rank">
                {isLeader ? '👑' : index + 1}
              </div>
              <div className="score-details">
                <span className="score-name">{player.name}</span>
                {showRoundBreakdown && player.roundPoints > 0 && (
                  <span className="score-breakdown">
                    {player.previousScore} + {player.roundPoints}
                  </span>
                )}
              </div>
              <div className="score-value">
                {player.displayScore}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ScoreBoard
