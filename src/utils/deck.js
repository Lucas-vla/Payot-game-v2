// Couleurs du jeu Papayoo
export const SUITS = {
  SPADE: 'spade',      // Pique
  HEART: 'heart',      // Cœur
  DIAMOND: 'diamond',  // Carreau
  CLUB: 'club',        // Trèfle
  PAYOO: 'payoo'       // Payoo (5ème couleur)
}

// Symboles et couleurs pour l'affichage
export const SUIT_DISPLAY = {
  [SUITS.SPADE]: { symbol: '♠', color: '#5c6bc0', name: 'Pique' },
  [SUITS.HEART]: { symbol: '♥', color: '#e74c3c', name: 'Cœur' },
  [SUITS.DIAMOND]: { symbol: '♦', color: '#e67e22', name: 'Carreau' },
  [SUITS.CLUB]: { symbol: '♣', color: '#27ae60', name: 'Trèfle' },
  [SUITS.PAYOO]: { symbol: '★', color: '#9b59b6', name: 'Payoo' }
}

// Couleurs éligibles pour être le Papayoo (pas le Payoo)
export const PAPAYOO_ELIGIBLE_SUITS = [
  SUITS.SPADE,
  SUITS.HEART,
  SUITS.DIAMOND,
  SUITS.CLUB
]

/**
 * Crée le deck complet du Papayoo (60 cartes)
 * - 4 couleurs classiques: cartes de 1 à 10
 * - Payoo: cartes de 1 à 20
 */
export function createDeck() {
  const deck = []
  let id = 0

  // Cartes classiques (1-10 pour chaque couleur)
  const classicSuits = [SUITS.SPADE, SUITS.HEART, SUITS.DIAMOND, SUITS.CLUB]
  for (const suit of classicSuits) {
    for (let value = 1; value <= 10; value++) {
      deck.push({
        id: id++,
        suit,
        value,
      })
    }
  }

  // Cartes Payoo (1-20)
  for (let value = 1; value <= 20; value++) {
    deck.push({
      id: id++,
      suit: SUITS.PAYOO,
      value,
    })
  }

  return deck
}

/**
 * Mélange un tableau (algorithme Fisher-Yates)
 */
export function shuffleDeck(deck) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Distribue les cartes aux joueurs
 * @param {number} playerCount - Nombre de joueurs (3-8)
 * @returns {Array} Tableau des mains des joueurs
 */
export function dealCards(playerCount) {
  const deck = shuffleDeck(createDeck())
  const hands = Array.from({ length: playerCount }, () => [])

  // Cartes à distribuer selon le nombre de joueurs
  const cardsPerPlayer = getCardsPerPlayer(playerCount)

  for (let i = 0; i < cardsPerPlayer * playerCount; i++) {
    hands[i % playerCount].push(deck[i])
  }

  return hands
}

/**
 * Retourne le nombre de cartes par joueur selon le nombre de joueurs
 */
export function getCardsPerPlayer(playerCount) {
  switch (playerCount) {
    case 3: return 20
    case 4: return 15
    case 5: return 12
    case 6: return 10
    case 7: return 8
    case 8: return 7
    default: return 15
  }
}

/**
 * Retourne le nombre de cartes à passer selon le nombre de joueurs
 */
export function getCardsToPass(playerCount) {
  switch (playerCount) {
    case 3: return 5
    case 4: return 5
    case 5: return 4
    case 6: return 3
    case 7: return 3
    case 8: return 3
    default: return 5
  }
}

/**
 * Lance le dé Papayoo (détermine quelle couleur est le Papayoo)
 */
export function rollPapayooDie() {
  const randomIndex = Math.floor(Math.random() * PAPAYOO_ELIGIBLE_SUITS.length)
  return PAPAYOO_ELIGIBLE_SUITS[randomIndex]
}

/**
 * Trie une main par couleur puis par valeur
 */
export function sortHand(hand) {
  const suitOrder = [SUITS.SPADE, SUITS.HEART, SUITS.DIAMOND, SUITS.CLUB, SUITS.PAYOO]
  return [...hand].sort((a, b) => {
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit)
    if (suitDiff !== 0) return suitDiff
    return a.value - b.value
  })
}

