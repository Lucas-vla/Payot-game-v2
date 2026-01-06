import { SUITS } from './deck'

/**
 * Calcule les points d'une carte
 * @param {Object} card - La carte
 * @param {string} papayooSuit - La couleur Papayoo actuelle
 * @returns {number} Points de la carte
 */
export function getCardPoints(card, papayooSuit) {
  // Les cartes Payoo (★) valent leur valeur (1-20 points)
  if (card.suit === SUITS.PAYOO) {
    return card.value
  }

  // Le 7 de la couleur Papayoo vaut 40 points (c'est LE Papayoo)
  if (card.suit === papayooSuit && card.value === 7) {
    return 40
  }

  // Les autres cartes ne valent rien (même celles de la couleur Papayoo)
  return 0
}

/**
 * Calcule le total des points d'un ensemble de cartes
 * @param {Array} cards - Les cartes
 * @param {string} papayooSuit - La couleur Papayoo actuelle
 * @returns {number} Total des points
 */
export function calculateTrickPoints(cards, papayooSuit) {
  return cards.reduce((total, card) => total + getCardPoints(card, papayooSuit), 0)
}

/**
 * Détermine le gagnant d'un pli
 * @param {Array} playedCards - Cartes jouées [{playerId, card}]
 * @param {string} leadSuit - La couleur demandée (première carte jouée)
 * @returns {number} L'index du joueur gagnant
 */
export function determineTrickWinner(playedCards, leadSuit) {
  let winnerIndex = 0
  let highestValue = 0

  playedCards.forEach((play, index) => {
    // Seules les cartes de la couleur demandée peuvent gagner
    if (play.card.suit === leadSuit) {
      if (play.card.value > highestValue) {
        highestValue = play.card.value
        winnerIndex = index
      }
    }
  })

  return playedCards[winnerIndex].playerId
}

/**
 * Vérifie si un joueur peut jouer une carte
 * @param {Object} card - La carte à jouer
 * @param {Array} hand - La main du joueur
 * @param {string|null} leadSuit - La couleur demandée (null si première carte)
 * @returns {boolean} Vrai si le joueur peut jouer cette carte
 */
export function canPlayCard(card, hand, leadSuit) {
  // Si c'est la première carte du pli, tout est permis
  if (!leadSuit) {
    return true
  }

  // Si le joueur a la couleur demandée, il doit la jouer
  const hasLeadSuit = hand.some(c => c.suit === leadSuit)

  if (hasLeadSuit) {
    return card.suit === leadSuit
  }

  // Sinon, il peut jouer n'importe quelle carte
  return true
}

/**
 * Retourne les cartes jouables d'une main
 */
export function getPlayableCards(hand, leadSuit) {
  if (!leadSuit) {
    return hand
  }

  const cardsOfLeadSuit = hand.filter(c => c.suit === leadSuit)

  if (cardsOfLeadSuit.length > 0) {
    return cardsOfLeadSuit
  }

  return hand
}

