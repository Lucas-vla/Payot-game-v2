import React from 'react'
import { SUIT_DISPLAY } from '../utils/deck'
import { calculateTrickPoints } from '../utils/scoring'
import './ScoreBoard.css'

function ScoreBoard({ players, papayooSuit, roundNumber }) {
  const playersWithRoundPoints = players.map(player => ({
    ...player,
    roundPoints: calculateTrickPoints(player.collectedCards || [], papayooSuit)
  }))

  const sortedPlayers = [...playersWithRoundPoints].sort((a, b) =>
    (a.score + a.roundPoints) - (b.score + b.roundPoints)
  )

  return (
    <div className="scoreboard">
      <div className="scoreboard-header">
        <h3>Classement</h3>
        <span className="round-indicator">Manche {roundNumber}</span>
      </div>

      <div className="score-list">
        {sortedPlayers.map((player, index) => {
          const totalWithRound = player.score + player.roundPoints
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
                {player.roundPoints > 0 && (
                  <span className="score-breakdown">
                    {player.score} + {player.roundPoints}
                  </span>
                )}
              </div>
              <div className="score-value">
                {totalWithRound}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ScoreBoard
