/**
 * Service de gestion de l'historique des parties
 * Stocke les données dans le localStorage
 */

const STORAGE_KEY = 'papayoo_game_history'

/**
 * Récupère l'historique des parties
 */
export function getGameHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Erreur lors de la lecture de l\'historique:', error)
    return []
  }
}

/**
 * Sauvegarde une partie dans l'historique
 */
export function saveGameToHistory(gameData) {
  try {
    const history = getGameHistory()

    // Vérifier si une partie très similaire existe déjà (éviter les doublons)
    // Une partie est considérée comme doublon si elle a le même nombre de joueurs,
    // les mêmes scores et a été enregistrée dans les 5 dernières secondes
    const now = Date.now()
    const recentDuplicate = history.find(game => {
      const timeDiff = now - game.id
      if (timeDiff > 5000) return false // Plus de 5 secondes de différence

      if (game.playerCount !== gameData.playerCount) return false
      if (game.rounds !== gameData.roundNumber) return false

      // Vérifier si les scores sont identiques
      const existingScores = game.players.map(p => p.score).sort((a, b) => a - b).join(',')
      const newScores = gameData.players.map(p => p.score).sort((a, b) => a - b).join(',')

      return existingScores === newScores
    })

    if (recentDuplicate) {
      console.log('Partie doublon détectée, sauvegarde ignorée')
      return recentDuplicate
    }

    const gameEntry = {
      id: now,
      date: new Date().toISOString(),
      playerCount: gameData.playerCount,
      rounds: gameData.roundNumber,
      maxRounds: gameData.maxRounds,
      players: gameData.players.map(p => ({
        name: p.name,
        score: p.score,
        isHuman: p.isHuman
      })),
      winner: getWinner(gameData.players),
      humanRank: getHumanRank(gameData.players)
    }

    history.unshift(gameEntry) // Ajouter au début

    // Garder seulement les 50 dernières parties
    const trimmedHistory = history.slice(0, 50)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory))

    return gameEntry
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    return null
  }
}

/**
 * Supprime tout l'historique
 */
export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    return false
  }
}

/**
 * Récupère les statistiques globales
 */
export function getStats() {
  const history = getGameHistory()

  if (history.length === 0) {
    return {
      totalGames: 0,
      wins: 0,
      winRate: 0,
      averageRank: 0,
      bestScore: null,
      worstScore: null
    }
  }

  const wins = history.filter(g => g.humanRank === 1).length
  const totalRanks = history.reduce((sum, g) => sum + g.humanRank, 0)
  const humanScores = history.map(g => {
    const human = g.players.find(p => p.isHuman)
    return human ? human.score : 0
  })

  return {
    totalGames: history.length,
    wins,
    winRate: Math.round((wins / history.length) * 100),
    averageRank: (totalRanks / history.length).toFixed(1),
    bestScore: Math.min(...humanScores),
    worstScore: Math.max(...humanScores)
  }
}

function getWinner(players) {
  const sorted = [...players].sort((a, b) => a.score - b.score)
  return sorted[0]
}

function getHumanRank(players) {
  const sorted = [...players].sort((a, b) => a.score - b.score)
  const humanIndex = sorted.findIndex(p => p.isHuman)
  return humanIndex + 1
}

