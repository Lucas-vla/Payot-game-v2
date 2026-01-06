import React, { useState, useEffect } from 'react'
import { SUIT_DISPLAY, PAPAYOO_ELIGIBLE_SUITS } from '../utils/deck'
import './Die.css'

function Die({ onRoll, result }) {
  const [isRolling, setIsRolling] = useState(false)
  const [displaySuit, setDisplaySuit] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [finalSuit, setFinalSuit] = useState(null)

  const handleClick = () => {
    if (isRolling || result || showResult) return

    setIsRolling(true)
    setShowResult(false)

    // Déterminer le résultat final à l'avance
    const resultSuit = PAPAYOO_ELIGIBLE_SUITS[
      Math.floor(Math.random() * PAPAYOO_ELIGIBLE_SUITS.length)
    ]
    setFinalSuit(resultSuit)

    // Animation de roulement avec ralentissement progressif
    let rollCount = 0
    let delay = 50

    const rollStep = () => {
      const randomSuit = PAPAYOO_ELIGIBLE_SUITS[
        Math.floor(Math.random() * PAPAYOO_ELIGIBLE_SUITS.length)
      ]
      setDisplaySuit(randomSuit)
      rollCount++

      // Ralentir progressivement
      if (rollCount < 10) {
        delay = 50
      } else if (rollCount < 15) {
        delay = 100
      } else if (rollCount < 18) {
        delay = 150
      } else if (rollCount < 20) {
        delay = 250
      } else {
        delay = 400
      }

      if (rollCount >= 22) {
        // Arrêt final sur le résultat
        setDisplaySuit(resultSuit)
        setIsRolling(false)

        // Petit délai avant de montrer le résultat complet
        setTimeout(() => {
          setShowResult(true)
          // Appeler onRoll après l'animation
          setTimeout(() => {
            onRoll()
          }, 800)
        }, 500)
      } else {
        setTimeout(rollStep, delay)
      }
    }

    rollStep()
  }

  useEffect(() => {
    if (result) {
      setDisplaySuit(result)
      setShowResult(true)
    }
  }, [result])

  const currentSuit = displaySuit || PAPAYOO_ELIGIBLE_SUITS[0]
  const suitInfo = SUIT_DISPLAY[currentSuit]

  return (
    <div className="die-wrapper">
      {/* Les 4 couleurs possibles */}
      <div className="die-options">
        {PAPAYOO_ELIGIBLE_SUITS.map(suit => {
          const info = SUIT_DISPLAY[suit]
          const isSelected = showResult && currentSuit === suit
          return (
            <div
              key={suit}
              className={`die-option ${isSelected ? 'selected' : ''} ${isRolling ? 'rolling' : ''}`}
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
        className={`die ${isRolling ? 'rolling' : ''} ${showResult ? 'revealed' : ''}`}
        onClick={handleClick}
      >
        <div className="die-face" style={{ '--suit-color': suitInfo.color }}>
          <span className="die-symbol">{suitInfo.symbol}</span>
        </div>

        {!isRolling && !showResult && !result && (
          <div className="die-hint">Cliquez!</div>
        )}
      </div>

      {/* Résultat final */}
      {showResult && (
        <div className="die-result" style={{ '--suit-color': suitInfo.color }}>
          <div className="result-header">
            <span className="result-icon">🎯</span>
            <span className="result-label">Le Papayoo est</span>
          </div>
          <div className="result-main">
            <span className="result-symbol">{suitInfo.symbol}</span>
            <span className="result-name">{suitInfo.name}</span>
          </div>
          <div className="result-warning">
            <span className="warning-icon">⚠️</span>
            <span>Le 7{suitInfo.symbol} vaut <strong>40 points</strong>!</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Die
