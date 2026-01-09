import React from 'react'
import { SUIT_DISPLAY, PAPAYOO_ELIGIBLE_SUITS } from '../utils/deck'
import './Die.css'

function Die({ onRoll, result }) {
  const handleClick = () => {
    if (result) return
    // Appeler directement onRoll - l'animation est gérée par le serveur (phase die_rolling)
    onRoll()
  }

  const currentSuit = result || PAPAYOO_ELIGIBLE_SUITS[0]
  const suitInfo = SUIT_DISPLAY[currentSuit]

  return (
    <div className="die-wrapper">
      {/* Les 4 couleurs possibles */}
      <div className="die-options">
        {PAPAYOO_ELIGIBLE_SUITS.map(suit => {
          const info = SUIT_DISPLAY[suit]
          const isSelected = result && currentSuit === suit
          return (
            <div
              key={suit}
              className={`die-option ${isSelected ? 'selected' : ''}`}
              style={{ '--suit-color': info.color }}
            >
              <span className="option-symbol">{info.symbol}</span>
              <span className="option-name">{info.name}</span>
            </div>
          )
        })}
      </div>

      {/* Le dé principal */}
      <div
        className={`die ${result ? 'revealed' : ''}`}
        onClick={handleClick}
      >
        <div className="die-face" style={{ '--suit-color': suitInfo.color }}>
          <span className="die-symbol">{result ? suitInfo.symbol : '🎲'}</span>
        </div>

        {!result && (
          <div className="die-hint">Cliquez!</div>
        )}
      </div>
    </div>
  )
}

export default Die
