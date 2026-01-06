import { SUITS } from './deck'
import { getCardPoints, getPlayableCards, determineTrickWinner } from './scoring'

/**
 * IA avancée pour le jeu Papayoo
 * Stratégies implémentées:
 * - Éviter de prendre des plis contenant des points
 * - Se débarrasser des cartes dangereuses quand possible
 * - Analyser qui va gagner le pli
 * - Jouer stratégiquement en fonction de la position
 * - Mémoriser les couleurs que les adversaires n'ont plus
 */

/**
 * Analyse les plis précédents pour déterminer quelles couleurs chaque joueur n'a plus
 * Retourne un objet { playerId: Set<suit> } des couleurs vides par joueur
 */
export function analyzeVoidSuits(trickHistory, playerCount) {
  const voidSuits = {}

  // Initialiser pour chaque joueur
  for (let i = 0; i < playerCount; i++) {
    voidSuits[i] = new Set()
  }

  // Analyser chaque pli de l'historique
  for (const trick of trickHistory) {
    if (trick.length === 0) continue

    const leadSuit = trick[0].card.suit

    // Pour chaque carte jouée après la première
    for (let i = 1; i < trick.length; i++) {
      const play = trick[i]
      // Si le joueur n'a pas suivi la couleur demandée, il n'en a plus
      if (play.card.suit !== leadSuit) {
        voidSuits[play.playerId].add(leadSuit)
      }
    }
  }

  return voidSuits
}

/**
 * Analyse le pli en cours pour détecter les nouvelles défausses
 */
export function analyzeCurrentTrickVoids(currentTrick) {
  const voids = {}

  if (currentTrick.length <= 1) return voids

  const leadSuit = currentTrick[0].card.suit

  for (let i = 1; i < currentTrick.length; i++) {
    const play = currentTrick[i]
    if (play.card.suit !== leadSuit) {
      if (!voids[play.playerId]) {
        voids[play.playerId] = new Set()
      }
      voids[play.playerId].add(leadSuit)
    }
  }

  return voids
}

/**
 * Compte combien de joueurs n'ont plus une couleur donnée
 */
function countPlayersVoidInSuit(suit, voidSuits, excludePlayerId) {
  let count = 0
  for (const [playerId, voids] of Object.entries(voidSuits)) {
    if (parseInt(playerId) !== excludePlayerId && voids.has(suit)) {
      count++
    }
  }
  return count
}

/**
 * Analyse le pli en cours et détermine qui gagne actuellement
 */
function analyzeCurrentTrick(currentTrick, leadSuit) {
  if (currentTrick.length === 0) return null

  let currentWinner = currentTrick[0]

  for (const play of currentTrick) {
    if (play.card.suit === leadSuit &&
        (currentWinner.card.suit !== leadSuit || play.card.value > currentWinner.card.value)) {
      currentWinner = play
    }
  }

  return currentWinner
}

/**
 * Calcule le total des points dans le pli actuel
 */
function getTrickTotalPoints(currentTrick, papayooSuit) {
  return currentTrick.reduce((sum, play) => sum + getCardPoints(play.card, papayooSuit), 0)
}

/**
 * Vérifie si une carte peut gagner le pli
 */
function canWinTrick(card, currentTrick, leadSuit) {
  if (currentTrick.length === 0) return true
  if (card.suit !== leadSuit) return false

  const currentWinner = analyzeCurrentTrick(currentTrick, leadSuit)
  return card.value > currentWinner.card.value
}

/**
 * Trouve la carte la plus haute qui ne gagne pas le pli
 */
function findHighestLosingCard(playableCards, currentTrick, leadSuit) {
  const currentWinner = analyzeCurrentTrick(currentTrick, leadSuit)
  if (!currentWinner) return null

  const losingCards = playableCards.filter(card => {
    if (card.suit !== leadSuit) return true // Défausse, ne gagne pas
    return card.value < currentWinner.card.value
  })

  if (losingCards.length === 0) return null

  // Retourner la plus haute carte perdante
  return losingCards.reduce((highest, card) =>
    card.value > highest.value ? card : highest
  )
}

/**
 * Vérifie si une carte est le Papayoo (7 de la couleur Papayoo = 40 points)
 */
function isPapayooCard(card, papayooSuit) {
  return card.suit === papayooSuit && card.value === 7
}

/**
 * Filtre les cartes pour éviter de jouer le Papayoo si d'autres options existent
 * Retourne les cartes sans le Papayoo si possible, sinon toutes les cartes
 */
function filterOutPapayooIfPossible(cards, papayooSuit) {
  const nonPapayooCards = cards.filter(c => !isPapayooCard(c.card || c, papayooSuit))
  // Si on a d'autres cartes, éviter le Papayoo
  if (nonPapayooCards.length > 0) {
    return nonPapayooCards
  }
  // Sinon on est obligé de jouer le Papayoo
  return cards
}

/**
 * Filtre les cartes de la couleur demandée en évitant le Papayoo si possible
 */
function getSafeCardsInSuit(analysis, suit, papayooSuit) {
  const cardsInSuit = analysis.filter(a => a.card.suit === suit)
  if (cardsInSuit.length === 0) return []

  // Si on a plusieurs cartes de cette couleur, éviter le Papayoo
  const safeSuitCards = cardsInSuit.filter(a => !isPapayooCard(a.card, papayooSuit))
  if (safeSuitCards.length > 0) {
    return safeSuitCards
  }
  // On n'a que le Papayoo dans cette couleur, on est obligé de le jouer
  return cardsInSuit
}

/**
 * Sélectionne les cartes à passer au début de la manche
 * Stratégie: se débarrasser des cartes dangereuses
 */
export function selectCardsToPass(hand, cardsToPass, papayooSuit = null) {
  // Compter les cartes par couleur (hors Payoo)
  const suitCounts = {}
  hand.forEach(card => {
    if (card.suit !== SUITS.PAYOO) {
      suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1
    }
  })

  // Calculer un score de danger pour chaque carte
  const cardsWithDanger = hand.map(card => {
    let danger = 0

    // Les Payoo sont dangereux (valent leur valeur)
    if (card.suit === SUITS.PAYOO) {
      // Les gros Payoo (15-20) sont très dangereux
      if (card.value >= 15) {
        danger = card.value * 2.5
      } else if (card.value >= 10) {
        danger = card.value * 2
      } else {
        // Les petits Payoo (1-5) sont utiles pour forcer les autres, on les garde!
        danger = card.value * 0.5
      }
    } else {
      // Cartes de couleur normale

      // Les 7 sont potentiellement très dangereux (peuvent devenir Papayoo = 40 pts)
      if (card.value === 7) {
        danger += 35
      }

      // Les cartes hautes (8, 9, 10) sont dangereuses car on risque de prendre des plis
      if (card.value === 10) {
        danger += 25
      } else if (card.value === 9) {
        danger += 20
      } else if (card.value === 8) {
        danger += 15
      }

      // BONUS: Si on a peu de cartes dans une couleur, les hautes sont encore plus dangereuses
      // Car on ne pourra pas se défausser facilement
      const count = suitCounts[card.suit] || 0
      if (count <= 2 && card.value >= 8) {
        danger += 15 // Couleur courte avec carte haute = très dangereux
      }

      // Les cartes moyennes-hautes (5, 6) sont un peu risquées aussi
      if (card.value === 6) {
        danger += 5
      } else if (card.value === 5) {
        danger += 3
      }
    }

    return { card, danger }
  })

  // Trier par danger décroissant et prendre les plus dangereuses
  cardsWithDanger.sort((a, b) => b.danger - a.danger)

  return cardsWithDanger.slice(0, cardsToPass).map(c => c.card.id)
}

/**
 * Stratégie principale de l'IA pour choisir une carte à jouer
 * @param {Array} hand - Main du joueur
 * @param {Array} currentTrick - Pli en cours
 * @param {string} leadSuit - Couleur demandée
 * @param {string} papayooSuit - Couleur Papayoo
 * @param {number} playerCount - Nombre de joueurs
 * @param {number} playerId - ID du joueur
 * @param {Object} voidSuits - Couleurs vides connues par joueur { playerId: Set<suit> }
 */
export function selectCardToPlay(hand, currentTrick, leadSuit, papayooSuit, playerCount, playerId, voidSuits = {}) {
  let playableCards = getPlayableCards(hand, leadSuit)

  if (playableCards.length === 0) return null
  if (playableCards.length === 1) return playableCards[0]

  // === PROTECTION DU PAPAYOO ===
  // Si on doit suivre une couleur et qu'on a le Papayoo + d'autres cartes de cette couleur,
  // NE PAS jouer le Papayoo sauf si c'est la seule carte de cette couleur
  if (leadSuit && leadSuit === papayooSuit) {
    const papayooCard = playableCards.find(c => isPapayooCard(c, papayooSuit))
    const otherCardsInSuit = playableCards.filter(c => c.suit === papayooSuit && !isPapayooCard(c, papayooSuit))

    if (papayooCard && otherCardsInSuit.length > 0) {
      // On a le Papayoo ET d'autres cartes de la même couleur
      // Retirer le Papayoo des cartes jouables pour le protéger
      playableCards = otherCardsInSuit
    }
  }

  // Si après filtrage on n'a plus qu'une carte, la jouer
  if (playableCards.length === 1) return playableCards[0]

  const isFirstPlayer = currentTrick.length === 0
  const isLastPlayer = currentTrick.length === playerCount - 1
  const trickPoints = getTrickTotalPoints(currentTrick, papayooSuit)

  // Déterminer la phase de la partie (début, milieu, fin)
  // Plus on a de cartes, plus on est au début
  const cardsRemaining = hand.length
  const isEarlyGame = cardsRemaining >= 10
  const isLateGame = cardsRemaining <= 4

  // Analyser chaque carte jouable
  const analysis = playableCards.map(card => {
    const points = getCardPoints(card, papayooSuit)
    const wouldWin = canWinTrick(card, currentTrick, leadSuit || card.suit)
    const canFollow = card.suit === leadSuit
    const isPapayoo = isPapayooCard(card, papayooSuit)

    // Calculer combien de joueurs n'ont plus cette couleur
    const playersVoid = countPlayersVoidInSuit(card.suit, voidSuits, playerId)

    return {
      card,
      points,
      wouldWin,
      canFollow,
      playersVoid,
      isPapayoo,
      totalRisk: wouldWin ? (trickPoints + points) : 0
    }
  })

  // === STRATÉGIE 1: Premier joueur ===
  if (isFirstPlayer) {
    return selectCardAsFirstPlayer(analysis, hand, papayooSuit, isEarlyGame, isLateGame, voidSuits, playerId, playerCount)
  }

  // === STRATÉGIE 2: Dernier joueur ===
  if (isLastPlayer) {
    return selectCardAsLastPlayer(analysis, currentTrick, leadSuit, papayooSuit, trickPoints, isEarlyGame)
  }

  // === STRATÉGIE 3: Joueur intermédiaire ===
  return selectCardAsMiddlePlayer(analysis, currentTrick, leadSuit, papayooSuit, trickPoints, isEarlyGame)
}

/**
 * Stratégie quand on joue en premier
 */
function selectCardAsFirstPlayer(analysis, hand, papayooSuit, isEarlyGame, isLateGame, voidSuits, playerId, playerCount) {

  // === PROTECTION ABSOLUE DU PAPAYOO ===
  // Ne JAMAIS ouvrir avec le 7 de la couleur Papayoo (40 points!)
  // Filtrer le Papayoo des cartes possibles
  let workingAnalysis = analysis.filter(a => !a.isPapayoo)

  // Si on n'a que le Papayoo, on est obligé de le jouer (ne devrait pas arriver)
  if (workingAnalysis.length === 0) {
    workingAnalysis = analysis
  }

  // === ÉVITER LA COULEUR PAPAYOO ===
  // Quand on ouvre, éviter de jouer la couleur du Papayoo si on a d'autres couleurs
  // Car on risque de devoir jouer le Papayoo plus tard dans ce pli
  const nonPapayooSuitCards = workingAnalysis.filter(a => a.card.suit !== papayooSuit)
  if (nonPapayooSuitCards.length > 0) {
    workingAnalysis = nonPapayooSuitCards
  }

  // === FILTRER LES COULEURS DANGEREUSES ===
  // Éviter les couleurs où des adversaires n'ont plus de cartes (ils vont défausser leurs points!)
  const safeSuitCards = workingAnalysis.filter(a => a.playersVoid === 0)

  // Si on a des cartes dans des couleurs "sûres", les privilégier
  if (safeSuitCards.length > 0) {
    workingAnalysis = safeSuitCards
  }

  // === STRATÉGIE DÉBUT DE PARTIE ===
  // En début de partie, jouer les cartes hautes pour s'en débarrasser
  // car il y a moins de risque de récupérer des points
  if (isEarlyGame) {
    const safeHighCards = workingAnalysis.filter(a => a.points === 0 && a.card.value >= 8)
    if (safeHighCards.length > 0) {
      // Jouer la plus haute carte sans points, en évitant les couleurs vides
      return safeHighCards.reduce((best, a) => {
        // Pénaliser fortement les couleurs où des joueurs sont vides
        const voidPenalty = a.playersVoid * 100
        const currentScore = a.card.value - voidPenalty
        const bestScore = best.card.value - (best.playersVoid * 100)
        return currentScore > bestScore ? a : best
      }).card
    }
  }

  // === STRATÉGIE PAYOO ===
  // Si on a des petits Payoo, on peut forcer les autres à jouer leurs gros Payoo!
  // MAIS seulement si peu de joueurs sont vides en Payoo
  const payooCards = workingAnalysis.filter(a => a.card.suit === SUITS.PAYOO)
  const nonPayooCards = workingAnalysis.filter(a => a.card.suit !== SUITS.PAYOO)
  const playersVoidInPayoo = countPlayersVoidInSuit(SUITS.PAYOO, voidSuits, playerId)

  if (payooCards.length > 0 && playersVoidInPayoo < playerCount - 2) {
    // Calculer si c'est avantageux de jouer Payoo
    const smallPayoo = payooCards.filter(a => a.card.value <= 5)
    const mediumPayoo = payooCards.filter(a => a.card.value >= 6 && a.card.value <= 10)

    // Si on a des petits Payoo (1-5), c'est très avantageux de les jouer!
    // On force les autres à jouer leurs gros Payoo
    if (smallPayoo.length > 0) {
      // Jouer le plus petit Payoo pour minimiser nos propres points si on gagne
      return smallPayoo.reduce((lowest, a) =>
        a.card.value < lowest.card.value ? a : lowest
      ).card
    }

    // Si on a beaucoup de Payoo moyens et peu d'autres cartes,
    // on peut jouer un Payoo moyen pour se débarrasser de la couleur
    if (mediumPayoo.length >= 2 && nonPayooCards.length <= 3) {
      // Jouer le plus petit des moyens
      return mediumPayoo.reduce((lowest, a) =>
        a.card.value < lowest.card.value ? a : lowest
      ).card
    }
  }

  // === STRATÉGIE STANDARD ===
  // Éviter de jouer des cartes à points (gros Payoo, 7 du Papayoo)
  const safeCards = workingAnalysis.filter(a => a.points === 0)

  if (safeCards.length > 0) {
    // Jouer une carte haute dans une couleur où on a beaucoup de cartes
    // ET où les adversaires ont encore des cartes
    const suitCounts = {}
    hand.forEach(card => {
      if (card.suit !== SUITS.PAYOO) {
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1
      }
    })

    // Trouver la meilleure carte en tenant compte des voids
    let bestCard = safeCards[0].card
    let bestScore = -Infinity

    for (const a of safeCards) {
      const suitLength = suitCounts[a.card.suit] || 0
      // En début de partie, favoriser encore plus les cartes hautes
      const valueBonus = isEarlyGame ? a.card.value * 2 : a.card.value
      // IMPORTANT: Pénaliser fortement les couleurs où des joueurs sont vides
      const voidPenalty = a.playersVoid * 50
      // Favoriser les cartes hautes dans les couleurs longues ET sûres
      const score = suitLength * 10 + valueBonus - voidPenalty
      if (score > bestScore) {
        bestScore = score
        bestCard = a.card
      }
    }

    return bestCard
  }

  // Si toutes les cartes ont des points, jouer la moins dangereuse
  // MAIS JAMAIS LE PAPAYOO si on peut l'éviter
  const nonPapayooAnalysis = workingAnalysis.filter(a => !a.isPapayoo)
  const finalAnalysis = nonPapayooAnalysis.length > 0 ? nonPapayooAnalysis : workingAnalysis

  finalAnalysis.sort((a, b) => {
    // Priorité aux petits Payoo (on peut gagner avec peu de points)
    if (a.card.suit === SUITS.PAYOO && b.card.suit === SUITS.PAYOO) {
      return a.card.value - b.card.value
    }
    return a.points - b.points
  })
  return finalAnalysis[0].card
}

/**
 * Stratégie quand on joue en dernier
 */
function selectCardAsLastPlayer(analysis, currentTrick, leadSuit, papayooSuit, trickPoints, isEarlyGame) {
  const currentWinner = analyzeCurrentTrick(currentTrick, leadSuit)
  const isPayooTrick = leadSuit === SUITS.PAYOO
  const isPapayooSuitTrick = leadSuit === papayooSuit

  // Vérifier si on peut suivre la couleur demandée
  const canFollowSuit = analysis.some(a => a.card.suit === leadSuit)

  // === DÉFAUSSE STRATÉGIQUE (quand on ne peut pas suivre) ===
  if (!canFollowSuit && leadSuit) {
    return selectBestDiscard(analysis, papayooSuit, isEarlyGame)
  }

  // === PROTECTION DU PAPAYOO QUAND ON SUIT LA COULEUR ===
  // Si on joue la couleur du Papayoo, éviter de jouer le 7 si on a d'autres cartes
  if (isPapayooSuitTrick) {
    const cardsInPapayooSuit = analysis.filter(a => a.card.suit === papayooSuit)
    const nonPapayooCards = cardsInPapayooSuit.filter(a => !a.isPapayoo)

    if (nonPapayooCards.length > 0) {
      // On a d'autres cartes que le Papayoo, choisir parmi celles-ci
      const currentHighest = currentWinner ? currentWinner.card.value : 0

      // Si on peut perdre le pli, jouer la carte la plus haute qui perd
      const losingCards = nonPapayooCards.filter(a => a.card.value < currentHighest)
      if (losingCards.length > 0) {
        return losingCards.reduce((highest, a) =>
          a.card.value > highest.card.value ? a : highest
        ).card
      }

      // Sinon jouer la plus petite carte pour minimiser les chances de gagner
      return nonPapayooCards.reduce((lowest, a) =>
        a.card.value < lowest.card.value ? a : lowest
      ).card
    }
    // Si on n'a que le Papayoo, on est obligé de le jouer (géré par le fallback)
  }

  // === STRATÉGIE SPÉCIALE PAYOO ===
  if (isPayooTrick) {
    const payooCards = analysis.filter(a => a.card.suit === SUITS.PAYOO)

    if (payooCards.length > 0) {
      const currentHighest = currentWinner ? currentWinner.card.value : 0

      // Si on peut perdre le pli avec une carte haute, se débarrasser d'un gros Payoo
      const losingPayoo = payooCards.filter(a => a.card.value < currentHighest)
      if (losingPayoo.length > 0) {
        return losingPayoo.reduce((highest, a) =>
          a.card.value > highest.card.value ? a : highest
        ).card
      }

      // Si on doit gagner, jouer le plus petit Payoo
      return payooCards.reduce((lowest, a) =>
        a.card.value < lowest.card.value ? a : lowest
      ).card
    }
  }

  // Si le pli ne vaut rien, on peut le prendre (mais pas avec le Papayoo!)
  if (trickPoints === 0) {
    const winningCards = analysis.filter(a => a.wouldWin && !a.isPapayoo)
    if (winningCards.length > 0) {
      return winningCards.reduce((highest, a) =>
        a.card.value > highest.card.value ? a : highest
      ).card
    }
  }

  // Si le pli vaut des points, essayer de ne pas le prendre
  // Éviter le Papayoo si possible
  const losingCards = analysis.filter(a => !a.wouldWin && !a.isPapayoo)
  if (losingCards.length > 0) {
    losingCards.sort((a, b) => {
      if (a.points !== b.points) return a.points - b.points
      return b.card.value - a.card.value
    })
    return losingCards[0].card
  }

  // Fallback: toutes les cartes perdantes incluant le Papayoo
  const allLosingCards = analysis.filter(a => !a.wouldWin)
  if (allLosingCards.length > 0) {
    allLosingCards.sort((a, b) => {
      if (a.points !== b.points) return a.points - b.points
      return b.card.value - a.card.value
    })
    return allLosingCards[0].card
  }

  // On doit gagner... minimiser les dégâts (éviter le Papayoo)
  const nonPapayooAnalysis = analysis.filter(a => !a.isPapayoo)
  const finalAnalysis = nonPapayooAnalysis.length > 0 ? nonPapayooAnalysis : analysis
  finalAnalysis.sort((a, b) => a.totalRisk - b.totalRisk)
  return finalAnalysis[0].card
}

/**
 * Sélectionne la meilleure carte à défausser quand on ne peut pas suivre
 */
function selectBestDiscard(analysis, papayooSuit, isEarlyGame) {
  // Priorité 1: Se débarrasser des gros Payoo (★)
  const payooCards = analysis.filter(a => a.card.suit === SUITS.PAYOO)
  if (payooCards.length > 0) {
    const biggestPayoo = payooCards.reduce((highest, a) =>
      a.card.value > highest.card.value ? a : highest
    )
    if (biggestPayoo.card.value >= 10) {
      return biggestPayoo.card
    }
  }

  // Priorité 2: Se débarrasser du 7 Papayoo (40 points!)
  const papayooSeven = analysis.find(a => a.card.suit === papayooSuit && a.card.value === 7)
  if (papayooSeven) {
    return papayooSeven.card
  }

  // Priorité 3: Se débarrasser des cartes hautes (10, 9, 8)
  const highCards = analysis.filter(a => a.card.value >= 8 && a.card.suit !== SUITS.PAYOO)
  if (highCards.length > 0) {
    return highCards.reduce((highest, a) =>
      a.card.value > highest.card.value ? a : highest
    ).card
  }

  // Priorité 4: Défausser un Payoo même petit
  if (payooCards.length > 0) {
    return payooCards.reduce((highest, a) =>
      a.card.value > highest.card.value ? a : highest
    ).card
  }

  // Sinon la carte la plus haute
  return analysis.reduce((highest, a) =>
    a.card.value > highest.card.value ? a : highest
  ).card
}

/**
 * Stratégie quand on joue au milieu
 */
function selectCardAsMiddlePlayer(analysis, currentTrick, leadSuit, papayooSuit, trickPoints, isEarlyGame) {
  const currentWinner = analyzeCurrentTrick(currentTrick, leadSuit)
  const isPayooTrick = leadSuit === SUITS.PAYOO
  const isPapayooSuitTrick = leadSuit === papayooSuit

  // Vérifier si on peut suivre
  const canFollowSuit = analysis.some(a => a.card.suit === leadSuit)

  // === DÉFAUSSE STRATÉGIQUE ===
  if (!canFollowSuit && leadSuit) {
    return selectBestDiscard(analysis, papayooSuit, isEarlyGame)
  }

  // === PROTECTION DU PAPAYOO QUAND ON SUIT LA COULEUR ===
  // Si on joue la couleur du Papayoo, éviter de jouer le 7 si on a d'autres cartes
  if (isPapayooSuitTrick) {
    const cardsInPapayooSuit = analysis.filter(a => a.card.suit === papayooSuit)
    const nonPapayooCards = cardsInPapayooSuit.filter(a => !a.isPapayoo)

    if (nonPapayooCards.length > 0) {
      // On a d'autres cartes que le Papayoo, choisir parmi celles-ci
      const currentHighest = currentWinner ? currentWinner.card.value : 0

      // Si on peut perdre le pli, jouer la carte la plus haute qui perd
      const losingCards = nonPapayooCards.filter(a => a.card.value < currentHighest)
      if (losingCards.length > 0) {
        return losingCards.reduce((highest, a) =>
          a.card.value > highest.card.value ? a : highest
        ).card
      }

      // Sinon jouer la plus petite carte pour minimiser les chances de gagner
      return nonPapayooCards.reduce((lowest, a) =>
        a.card.value < lowest.card.value ? a : lowest
      ).card
    }
  }

  // === STRATÉGIE PAYOO ===
  if (isPayooTrick) {
    const payooCards = analysis.filter(a => a.card.suit === SUITS.PAYOO)

    if (payooCards.length > 0) {
      const currentHighest = currentWinner ? currentWinner.card.value : 0

      const losingPayoo = payooCards.filter(a => a.card.value < currentHighest)
      if (losingPayoo.length > 0) {
        return losingPayoo.reduce((highest, a) =>
          a.card.value > highest.card.value ? a : highest
        ).card
      }

      return payooCards.reduce((lowest, a) =>
        a.card.value < lowest.card.value ? a : lowest
      ).card
    }
  }

  // Essayer de ne pas gagner si le pli contient des points
  // Éviter le Papayoo si possible
  if (trickPoints > 0) {
    const losingCards = analysis.filter(a => !a.wouldWin && !a.isPapayoo)

    if (losingCards.length > 0) {
      const safeLosing = losingCards.filter(a => a.points === 0)
      if (safeLosing.length > 0) {
        return safeLosing.reduce((highest, a) =>
          a.card.value > highest.card.value ? a : highest
        ).card
      }

      losingCards.sort((a, b) => a.points - b.points)
      return losingCards[0].card
    }
  }

  // Si quelqu'un d'autre gagne, se défausser de cartes hautes (mais pas le Papayoo!)
  if (currentWinner) {
    const losingCards = analysis.filter(a => !a.wouldWin && !a.isPapayoo)
    if (losingCards.length > 0) {
      losingCards.sort((a, b) => {
        if (isEarlyGame) {
          if (b.card.value !== a.card.value) return b.card.value - a.card.value
        }
        return b.points - a.points
      })
      return losingCards[0].card
    }
  }

  // Fallback: éviter le Papayoo si possible
  const nonPapayooAnalysis = analysis.filter(a => !a.isPapayoo)
  const finalAnalysis = nonPapayooAnalysis.length > 0 ? nonPapayooAnalysis : analysis

  finalAnalysis.sort((a, b) => {
    if (a.totalRisk !== b.totalRisk) return a.totalRisk - b.totalRisk
    return a.card.value - b.card.value
  })

  return finalAnalysis[0].card
}

/**
 * Évalue la qualité d'une main
 */
export function evaluateHand(hand, papayooSuit) {
  let totalDanger = 0

  for (const card of hand) {
    totalDanger += getCardPoints(card, papayooSuit)
    if (card.value >= 8) {
      totalDanger += 2
    }
  }

  return totalDanger
}
