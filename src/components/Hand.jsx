import React from 'react'
import Card from './Card'
import { getPlayableCards } from '../utils/scoring'
import './Hand.css'

function Hand({
  cards,
  onCardClick,
  selectedCards = [],
  leadSuit = null,
  isActive = false,
  showCards = true,
  draggable = false,
  onDragStart,
  onDragEnd
}) {
  const playableCards = leadSuit ? getPlayableCards(cards, leadSuit) : cards
  const playableIds = new Set(playableCards.map(c => c.id))

  return (
    <div className={`hand ${isActive ? 'active' : ''}`}>
      <div className="hand-cards">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="hand-card"
            style={{ '--index': index, '--total': cards.length }}
          >
            <Card
              card={card}
              onClick={onCardClick}
              isSelected={selectedCards.includes(card.id)}
              isPlayable={!leadSuit || playableIds.has(card.id)}
              faceDown={!showCards}
              draggable={draggable && isActive}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Hand

