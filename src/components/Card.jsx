import React from 'react'
import { SUIT_DISPLAY, SUITS } from '../utils/deck'
import './Card.css'

function Card({
  card,
  onClick,
  isSelected,
  isPlayable,
  faceDown,
  small,
  draggable = false,
  onDragStart,
  onDragEnd
}) {
  const suitInfo = SUIT_DISPLAY[card.suit]
  const isPayoo = card.suit === SUITS.PAYOO

  const handleClick = () => {
    if (onClick && isPlayable !== false) {
      onClick(card)
    }
  }

  const handleDragStart = (e) => {
    if (!draggable || isPlayable === false) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('cardId', card.id.toString())
    e.dataTransfer.effectAllowed = 'move'
    if (onDragStart) onDragStart(card)
  }

  const handleDragEnd = (e) => {
    if (onDragEnd) onDragEnd(card)
  }

  if (faceDown) {
    return (
      <div className={`card card-back ${small ? 'card-small' : ''}`}>
        <div className="card-back-design">
          <div className="card-back-inner">
            <span>★</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`card ${isSelected ? 'selected' : ''} ${isPlayable === false ? 'not-playable' : ''} ${small ? 'card-small' : ''} ${isPayoo ? 'is-payoo' : ''} ${draggable && isPlayable !== false ? 'draggable' : ''}`}
      onClick={handleClick}
      draggable={draggable && isPlayable !== false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ '--suit-color': suitInfo.color }}
    >
      <div className="card-inner">
        <div className="card-corner top-left">
          <span className="card-value">{card.value}</span>
          <span className="card-suit">{suitInfo.symbol}</span>
        </div>

        <div className="card-center">
          <span className="card-suit-large">{suitInfo.symbol}</span>
        </div>

        <div className="card-corner bottom-right">
          <span className="card-value">{card.value}</span>
          <span className="card-suit">{suitInfo.symbol}</span>
        </div>
      </div>
    </div>
  )
}

export default Card

