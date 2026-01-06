import React, { useState } from 'react'
import Card from './Card'
import { calculateTrickPoints } from '../utils/scoring'
import { SUIT_DISPLAY } from '../utils/deck'
import './TrickArea.css'

function TrickArea({
  currentTrick,
  playerCount,
  papayooSuit,
  onCardDrop,
  isPlayerTurn,
  leadSuit
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e) => {
    if (!isPlayerTurn) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const cardId = parseInt(e.dataTransfer.getData('cardId'))
    if (onCardDrop && !isNaN(cardId)) {
      onCardDrop(cardId)
    }
  }

  const trickCards = currentTrick.map(t => t.card)
  const trickPoints = calculateTrickPoints(trickCards, papayooSuit)
  const suitInfo = leadSuit ? SUIT_DISPLAY[leadSuit] : null

  // Positions des cartes sur le plateau
  const getCardPosition = (index, total) => {
    const positions = [
      { x: 0, y: 35, rotation: 0 },       // Bas (joueur)
      { x: -55, y: 0, rotation: -8 },     // Gauche
      { x: 0, y: -35, rotation: 180 },    // Haut
      { x: 55, y: 0, rotation: 8 },       // Droite
    ]

    // Pour plus de joueurs, répartir en cercle
    if (total > 4) {
      const angle = (index / total) * 2 * Math.PI - Math.PI / 2
      const radius = 45
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rotation: (angle * 180 / Math.PI) + 90
      }
    }

    return positions[index] || positions[0]
  }

  return (
    <div
      className={`trick-area ${isDragOver ? 'drag-over' : ''} ${isPlayerTurn ? 'accepting' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Plateau de jeu central */}
      <div className="game-table">
        <div className="table-felt">
          {/* Indicateur de couleur demandée - bien visible */}
          {suitInfo && currentTrick.length > 0 && (
            <div className="lead-suit-banner" style={{ '--suit-color': suitInfo.color }}>
              <span className="lead-suit-label">Couleur demandée</span>
              <div className="lead-suit-display">
                <span className="lead-suit-symbol">{suitInfo.symbol}</span>
                <span className="lead-suit-name">{suitInfo.name}</span>
              </div>
            </div>
          )}

          {/* Zone de drop */}
          {currentTrick.length === 0 && isPlayerTurn && (
            <div className="drop-zone">
              <div className="drop-zone-inner">
                <span className="drop-icon">🎴</span>
                <span className="drop-text">Glissez une carte ici</span>
              </div>
            </div>
          )}

          {/* Cartes jouées */}
          <div className="played-cards">
            {currentTrick.map((play, index) => {
              const pos = getCardPosition(play.playerId, playerCount)
              return (
                <div
                  key={play.card.id}
                  className="played-card"
                  style={{
                    '--x': `${pos.x}px`,
                    '--y': `${pos.y}px`,
                    '--rotation': `${pos.rotation}deg`,
                    '--delay': `${index * 0.1}s`
                  }}
                >
                  <Card card={play.card} small />
                </div>
              )
            })}
          </div>

          {/* Points du pli */}
          {trickPoints > 0 && currentTrick.length > 0 && (
            <div className="trick-points-display">
              <span className="points-value">{trickPoints}</span>
              <span className="points-label">points</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrickArea

