import { createClient } from 'redis'

// Configuration Redis (même que room.js)
let redis = null
let redisType = null

async function getRedisClient() {
  if (redis && redisType === 'vercel') {
    try {
      await redis.ping()
      return redis
    } catch (e) {
      redis = null
    }
  }

  if (process.env.REDIS_URL) {
    try {
      redis = createClient({ url: process.env.REDIS_URL })
      redis.on('error', (err) => console.log('Redis Client Error', err))
      await redis.connect()
      redisType = 'vercel'
      return redis
    } catch (e) {
      console.log('Failed to connect to Vercel Redis:', e.message)
      redis = null
    }
  }

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import('@upstash/redis')
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      redisType = 'upstash'
      return redis
    } catch (e) {
      redis = null
    }
  }

  return null
}

const memoryGames = new Map()

async function getGame(code) {
  const client = await getRedisClient()
  if (client && redisType === 'vercel') {
    const data = await client.get(`game:${code}`)
    return data ? JSON.parse(data) : null
  }
  if (client && redisType === 'upstash') {
    return await client.get(`game:${code}`)
  }
  return memoryGames.get(code)
}

async function setGame(code, game) {
  const client = await getRedisClient()
  if (client && redisType === 'vercel') {
    await client.setEx(`game:${code}`, 86400, JSON.stringify(game))
    return
  }
  if (client && redisType === 'upstash') {
    await client.set(`game:${code}`, game, { ex: 86400 })
    return
  }
  memoryGames.set(code, game)
}

async function deleteGame(code) {
  const client = await getRedisClient()
  if (client && redisType === 'vercel') {
    await client.del(`game:${code}`)
    return
  }
  if (client && redisType === 'upstash') {
    await client.del(`game:${code}`)
    return
  }
  memoryGames.delete(code)
}

async function getRoom(code) {
  const client = await getRedisClient()
  if (client && redisType === 'vercel') {
    const data = await client.get(`room:${code}`)
    return data ? JSON.parse(data) : null
  }
  if (client && redisType === 'upstash') {
    return await client.get(`room:${code}`)
  }
  return null
}

async function setRoom(code, room) {
  const client = await getRedisClient()
  if (client && redisType === 'vercel') {
    await client.setEx(`room:${code}`, 86400, JSON.stringify(room))
    return
  }
  if (client && redisType === 'upstash') {
    await client.set(`room:${code}`, room, { ex: 86400 })
    return
  }
}

// ===== CONSTANTES DU JEU =====
const SUITS = {
  SPADE: 'spade',
  HEART: 'heart',
  DIAMOND: 'diamond',
  CLUB: 'club',
  PAYOO: 'payoo'
}

const PAPAYOO_ELIGIBLE_SUITS = [SUITS.SPADE, SUITS.HEART, SUITS.DIAMOND, SUITS.CLUB]

// ===== FONCTIONS UTILITAIRES =====

function createDeck() {
  const deck = []
  let id = 0

  // Cartes de couleur (1-10 pour chaque couleur)
  for (const suit of [SUITS.SPADE, SUITS.HEART, SUITS.DIAMOND, SUITS.CLUB]) {
    for (let value = 1; value <= 10; value++) {
      deck.push({ id: id++, suit, value })
    }
  }

  // Cartes Payoo (1-20)
  for (let value = 1; value <= 20; value++) {
    deck.push({ id: id++, suit: SUITS.PAYOO, value })
  }

  return deck
}

function shuffleDeck(deck) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function dealCards(deck, playerCount) {
  const hands = Array.from({ length: playerCount }, () => [])
  deck.forEach((card, index) => {
    hands[index % playerCount].push(card)
  })
  return hands.map(hand => sortHand(hand))
}

function sortHand(hand) {
  const suitOrder = [SUITS.SPADE, SUITS.HEART, SUITS.DIAMOND, SUITS.CLUB, SUITS.PAYOO]
  return [...hand].sort((a, b) => {
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit)
    if (suitDiff !== 0) return suitDiff
    return a.value - b.value
  })
}

function getCardsToPass(playerCount) {
  if (playerCount <= 4) return 5
  if (playerCount === 5) return 4
  return 3
}

function rollPapayooDie() {
  return PAPAYOO_ELIGIBLE_SUITS[Math.floor(Math.random() * PAPAYOO_ELIGIBLE_SUITS.length)]
}

function getCardPoints(card, papayooSuit) {
  if (card.suit === SUITS.PAYOO) return card.value
  if (card.suit === papayooSuit && card.value === 7) return 40
  return 0
}

function calculateTrickPoints(cards, papayooSuit) {
  return cards.reduce((sum, card) => sum + getCardPoints(card, papayooSuit), 0)
}

function determineTrickWinner(trick, leadSuit) {
  let winner = trick[0]
  for (const play of trick) {
    if (play.card.suit === leadSuit &&
        (winner.card.suit !== leadSuit || play.card.value > winner.card.value)) {
      winner = play
    }
  }
  return winner.playerId
}

function canPlayCard(card, hand, leadSuit) {
  if (!leadSuit) return true
  const hasLeadSuit = hand.some(c => c.suit === leadSuit)
  if (!hasLeadSuit) return true
  return card.suit === leadSuit
}

// ===== IA SIMPLIFIÉE =====
function selectBotCard(hand, leadSuit, papayooSuit, currentTrick) {
  // Cartes jouables
  let playable = hand
  if (leadSuit) {
    const suitCards = hand.filter(c => c.suit === leadSuit)
    if (suitCards.length > 0) playable = suitCards
  }

  if (playable.length === 1) return playable[0]

  // Si on ouvre, éviter les gros Payoo et le Papayoo
  if (!leadSuit) {
    const safe = playable.filter(c => {
      if (c.suit === SUITS.PAYOO && c.value >= 10) return false
      if (c.suit === papayooSuit && c.value === 7) return false
      return true
    })
    if (safe.length > 0) playable = safe

    // Jouer une carte haute sans points
    const noPoints = playable.filter(c => getCardPoints(c, papayooSuit) === 0)
    if (noPoints.length > 0) {
      return noPoints.reduce((best, c) => c.value > best.value ? c : best)
    }
  }

  // Si on suit, jouer la plus petite carte
  return playable.reduce((lowest, c) => c.value < lowest.value ? c : lowest)
}

function selectBotCardsToPass(hand, cardsToPass) {
  // Trier par dangerosité
  const sorted = [...hand].sort((a, b) => {
    let dangerA = 0, dangerB = 0

    if (a.suit === SUITS.PAYOO) dangerA = a.value * 2
    else if (a.value === 7) dangerA = 35
    else if (a.value >= 8) dangerA = a.value * 2

    if (b.suit === SUITS.PAYOO) dangerB = b.value * 2
    else if (b.value === 7) dangerB = 35
    else if (b.value >= 8) dangerB = b.value * 2

    return dangerB - dangerA
  })

  return sorted.slice(0, cardsToPass).map(c => c.id)
}

// ===== INITIALISER UNE PARTIE =====
function initializeGame(room) {
  const playerCount = room.players.length
  const deck = shuffleDeck(createDeck())
  const hands = dealCards(deck, playerCount)

  const players = room.players.map((p, index) => ({
    id: p.id,
    name: p.name,
    isBot: p.isBot,
    isHuman: !p.isBot,
    hand: hands[index],
    score: 0,
    collectedCards: [],
    selectedCards: [],
    cardsToPass: []
  }))

  return {
    roomCode: room.code,
    playerCount,
    players,
    phase: 'passing', // passing, rolling_die, playing, trick_end, round_end, game_end
    roundNumber: 1,
    maxRounds: room.maxRounds || 1,
    papayooSuit: null,
    currentPlayer: 0,
    leadSuit: null,
    currentTrick: [],
    trickCount: 0,
    cardsToPass: getCardsToPass(playerCount),
    lastUpdate: Date.now(),
    message: `Sélectionnez ${getCardsToPass(playerCount)} cartes à passer`
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { action } = req.query

  try {
    switch (action) {
      // Initialiser une partie
      case 'init': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { room } = req.body
        if (!room || !room.code) {
          return res.status(400).json({ error: 'Room data required' })
        }

        const game = initializeGame(room)
        await setGame(room.code, game)

        return res.status(200).json({ success: true, game })
      }

      // Récupérer l'état du jeu
      case 'state': {
        const { roomCode, playerId } = req.query
        const code = roomCode?.toUpperCase().trim()
        const game = await getGame(code)

        if (!game) {
          return res.status(404).json({ error: 'Game not found' })
        }

        // Retourner l'état avec seulement la main du joueur demandeur visible
        const playerIndex = game.players.findIndex(p => p.id === playerId)
        const sanitizedGame = {
          ...game,
          players: game.players.map((p, idx) => ({
            ...p,
            hand: idx === playerIndex ? p.hand : p.hand.map(() => ({ hidden: true })),
            selectedCards: idx === playerIndex ? p.selectedCards : [],
            cardsToPass: []
          }))
        }

        return res.status(200).json({ success: true, game: sanitizedGame })
      }

      // Sélectionner des cartes à passer
      case 'selectCards': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode, playerId, cardIds } = req.body
        const code = roomCode?.toUpperCase().trim()
        let game = await getGame(code)

        if (!game) {
          return res.status(404).json({ error: 'Game not found' })
        }

        if (game.phase !== 'passing') {
          return res.status(400).json({ error: 'Not in passing phase' })
        }

        const playerIndex = game.players.findIndex(p => p.id === playerId)
        if (playerIndex === -1) {
          return res.status(404).json({ error: 'Player not found' })
        }

        game.players[playerIndex].selectedCards = cardIds
        game.lastUpdate = Date.now()
        await setGame(code, game)

        return res.status(200).json({ success: true })
      }

      // Confirmer le passage de cartes
      case 'confirmPass': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode, playerId } = req.body
        const code = roomCode?.toUpperCase().trim()
        let game = await getGame(code)

        if (!game) {
          return res.status(404).json({ error: 'Game not found' })
        }

        if (game.phase !== 'passing') {
          return res.status(400).json({ error: 'Not in passing phase' })
        }

        const playerIndex = game.players.findIndex(p => p.id === playerId)
        if (playerIndex === -1) {
          return res.status(404).json({ error: 'Player not found' })
        }

        const player = game.players[playerIndex]
        if (player.selectedCards.length !== game.cardsToPass) {
          return res.status(400).json({ error: `Vous devez sélectionner ${game.cardsToPass} cartes` })
        }

        player.cardsToPass = player.selectedCards
        game.lastUpdate = Date.now()

        // Faire jouer les bots
        for (const p of game.players) {
          if (p.isBot && p.cardsToPass.length === 0) {
            p.cardsToPass = selectBotCardsToPass(p.hand, game.cardsToPass)
            p.selectedCards = p.cardsToPass
          }
        }

        // Vérifier si tous ont passé
        const allPassed = game.players.every(p => p.cardsToPass.length === game.cardsToPass)

        if (allPassed) {
          // Effectuer le passage (vers la gauche)
          const passedCards = game.players.map(p =>
            p.hand.filter(c => p.cardsToPass.includes(c.id))
          )

          game.players = game.players.map((p, index) => {
            const receiveFrom = (index + 1) % game.playerCount
            const cardsToKeep = p.hand.filter(c => !p.cardsToPass.includes(c.id))
            const receivedCards = passedCards[receiveFrom]

            return {
              ...p,
              hand: sortHand([...cardsToKeep, ...receivedCards]),
              selectedCards: [],
              cardsToPass: []
            }
          })

          game.phase = 'rolling_die'
          game.message = 'Lancez le dé pour déterminer le Papayoo!'
        }

        await setGame(code, game)
        return res.status(200).json({ success: true, game })
      }

      // Lancer le dé
      case 'rollDie': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode, papayooSuit } = req.body
        const code = roomCode?.toUpperCase().trim()
        let game = await getGame(code)

        if (!game) {
          return res.status(404).json({ error: 'Game not found' })
        }

        if (game.phase !== 'rolling_die') {
          return res.status(400).json({ error: 'Not in rolling phase' })
        }

        game.papayooSuit = papayooSuit || rollPapayooDie()
        game.phase = 'die_result' // Phase intermédiaire pour montrer le résultat
        game.dieRolledAt = Date.now()
        game.message = `Le Papayoo est ${game.papayooSuit}! Le 7 vaut 40 points!`
        game.lastUpdate = Date.now()

        await setGame(code, game)
        return res.status(200).json({ success: true, game })
      }

      // Confirmer le résultat du dé et passer à la phase de jeu
      case 'confirmDie': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode } = req.body
        const code = roomCode?.toUpperCase().trim()
        let game = await getGame(code)

        if (!game) {
          return res.status(404).json({ error: 'Game not found' })
        }

        if (game.phase !== 'die_result') {
          return res.status(400).json({ error: 'Not in die_result phase' })
        }

        game.phase = 'playing'
        game.lastUpdate = Date.now()

        await setGame(code, game)
        return res.status(200).json({ success: true, game })
      }

      // Continuer après l'affichage d'un pli terminé (fait jouer le bot gagnant si nécessaire)
      case 'continueAfterTrick': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode } = req.body
        const code = roomCode?.toUpperCase().trim()
        let game = await getGame(code)

        if (!game) {
          return res.status(404).json({ error: 'Game not found' })
        }

        if (game.phase !== 'playing') {
          return res.status(400).json({ error: 'Not in playing phase' })
        }

        // Si le pli n'est pas marqué comme terminé, rien à faire
        if (!game.trickComplete) {
          return res.status(200).json({ success: true, game })
        }

        // Si c'est le dernier pli, passer à round_end ou game_end
        if (game.isLastTrick) {
          game.currentTrick = []
          game.leadSuit = null
          game.trickComplete = false
          game.trickWinner = null
          game.nextPlayer = null
          game.isLastTrick = false

          const over = game.roundNumber >= game.maxRounds
          game.phase = over ? 'game_end' : 'round_end'
          game.message = over ? 'Partie terminée!' : 'Manche terminée!'

          game.lastUpdate = Date.now()
          await setGame(code, game)
          return res.status(200).json({ success: true, game })
        }

        // Vider le pli et passer au joueur gagnant
        game.currentTrick = []
        game.leadSuit = null
        game.currentPlayer = game.nextPlayer
        game.trickComplete = false
        game.trickWinner = null
        game.nextPlayer = null

        // Si c'est au tour d'un bot, le faire jouer
        const currentPlayer = game.players[game.currentPlayer]
        if (currentPlayer.isBot && currentPlayer.hand.length > 0) {
          // Le bot ouvre le pli
          const botCard = selectBotCard(currentPlayer.hand, null, game.papayooSuit, [])
          currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== botCard.id)
          game.currentTrick.push({ playerId: currentPlayer.id, card: botCard })
          game.leadSuit = botCard.suit
          game.currentPlayer = (game.currentPlayer + 1) % game.playerCount
          game.message = `${currentPlayer.name} ouvre le pli`

          // Faire jouer les bots suivants
          while (game.currentTrick.length < game.playerCount) {
            const np = game.players[game.currentPlayer]
            if (!np.isBot) break
            if (np.hand.length === 0) break
            const bc = selectBotCard(np.hand, game.leadSuit, game.papayooSuit, game.currentTrick)
            np.hand = np.hand.filter(c => c.id !== bc.id)
            game.currentTrick.push({ playerId: np.id, card: bc })
            game.currentPlayer = (game.currentPlayer + 1) % game.playerCount
          }

          // Vérifier si le pli est complet après les bots
          if (game.currentTrick.length === game.playerCount) {
            const winnerId = determineTrickWinner(game.currentTrick, game.leadSuit)
            const winnerIndex = game.players.findIndex(p => p.id === winnerId)
            const trickCards = game.currentTrick.map(t => t.card)
            game.players[winnerIndex].collectedCards.push(...trickCards)
            game.trickCount++

            const allEmpty = game.players.every(p => p.hand.length === 0)
            if (allEmpty) {
              game.players = game.players.map(p => {
                const rp = calculateTrickPoints(p.collectedCards, game.papayooSuit)
                return { ...p, lastRoundPoints: rp, score: p.score + rp, collectedCards: [] }
              })
              const over = game.roundNumber >= game.maxRounds
              game.phase = over ? 'game_end' : 'round_end'
              game.message = over ? 'Partie terminée!' : 'Manche terminée!'
              game.currentTrick = []
              game.leadSuit = null
            } else {
              // Nouveau pli terminé - garder les cartes visibles
              game.trickComplete = true
              game.trickWinner = winnerIndex
              game.nextPlayer = winnerIndex
              game.message = `${game.players[winnerIndex].name} remporte le pli!`
            }
          } else {
            game.message = `C'est au tour de ${game.players[game.currentPlayer].name}`
          }
        } else {
          game.message = `C'est au tour de ${currentPlayer.name}`
        }

        game.lastUpdate = Date.now()
        await setGame(code, game)
        return res.status(200).json({ success: true, game })
      }

      // Jouer une carte
      case 'playCard': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode, playerId, cardId } = req.body
        const code = roomCode?.toUpperCase().trim()
        let game = await getGame(code)

        if (!game) {
          return res.status(404).json({ error: 'Game not found' })
        }

        if (game.phase !== 'playing') {
          return res.status(400).json({ error: 'Not in playing phase' })
        }

        const playerIndex = game.players.findIndex(p => p.id === playerId)
        if (playerIndex === -1) {
          return res.status(404).json({ error: 'Player not found' })
        }

        if (playerIndex !== game.currentPlayer) {
          return res.status(400).json({ error: 'Ce n\'est pas votre tour' })
        }

        const player = game.players[playerIndex]
        const card = player.hand.find(c => c.id === cardId)

        if (!card) {
          return res.status(400).json({ error: 'Card not found' })
        }

        if (!canPlayCard(card, player.hand, game.leadSuit)) {
          return res.status(400).json({ error: 'Vous devez jouer la couleur demandée!' })
        }

        // Retirer la carte de la main
        player.hand = player.hand.filter(c => c.id !== cardId)

        // Ajouter au pli
        game.currentTrick.push({ playerId, card })
        if (!game.leadSuit) {
          game.leadSuit = card.suit
        }

        game.lastUpdate = Date.now()

        // Passer au joueur suivant ou terminer le pli
        if (game.currentTrick.length === game.playerCount) {
          // Pli complet
          const winnerId = determineTrickWinner(game.currentTrick, game.leadSuit)
          const winnerIndex = game.players.findIndex(p => p.id === winnerId)
          const trickCards = game.currentTrick.map(t => t.card)

          game.players[winnerIndex].collectedCards.push(...trickCards)
          game.trickCount++

          // Vérifier si la manche est terminée
          const allHandsEmpty = game.players.every(p => p.hand.length === 0)

          if (allHandsEmpty) {
            // Calculer les scores mais garder le pli visible d'abord
            game.players = game.players.map(p => {
              const roundPoints = calculateTrickPoints(p.collectedCards, game.papayooSuit)
              return {
                ...p,
                lastRoundPoints: roundPoints,
                score: p.score + roundPoints,
                collectedCards: []
              }
            })

            // Marquer le pli comme terminé pour l'affichage
            // Le client appellera continueAfterTrick qui passera à round_end/game_end
            game.trickComplete = true
            game.trickWinner = winnerIndex
            game.nextPlayer = winnerIndex
            game.isLastTrick = true // Flag pour indiquer que c'est le dernier pli
            game.message = `${game.players[winnerIndex].name} remporte le dernier pli!`
          } else {
            // NE PAS vider currentTrick - garder les cartes visibles pour l'affichage
            // Marquer le pli comme terminé avec le gagnant
            game.trickComplete = true
            game.trickWinner = winnerIndex
            game.nextPlayer = winnerIndex
            game.message = `${game.players[winnerIndex].name} remporte le pli!`
            // Le client appellera 'continueAfterTrick' après le délai d'affichage
          }
        } else {
          // Joueur suivant
          game.currentPlayer = (game.currentPlayer + 1) % game.playerCount

          // Si c'est un bot, le faire jouer automatiquement
          const nextPlayer = game.players[game.currentPlayer]
          if (nextPlayer.isBot) {
            const botCard = selectBotCard(nextPlayer.hand, game.leadSuit, game.papayooSuit, game.currentTrick)
            // Récursif: jouer la carte du bot
            nextPlayer.hand = nextPlayer.hand.filter(c => c.id !== botCard.id)
            game.currentTrick.push({ playerId: nextPlayer.id, card: botCard })

            // Continuer jusqu'au prochain humain ou fin de pli
            while (game.currentTrick.length < game.playerCount) {
              game.currentPlayer = (game.currentPlayer + 1) % game.playerCount
              const np = game.players[game.currentPlayer]
              if (!np.isBot) break

              const bc = selectBotCard(np.hand, game.leadSuit, game.papayooSuit, game.currentTrick)
              np.hand = np.hand.filter(c => c.id !== bc.id)
              game.currentTrick.push({ playerId: np.id, card: bc })
            }

            // Si le pli est complet après les bots
            if (game.currentTrick.length === game.playerCount) {
              const winnerId = determineTrickWinner(game.currentTrick, game.leadSuit)
              const winnerIndex = game.players.findIndex(p => p.id === winnerId)
              const trickCards = game.currentTrick.map(t => t.card)
              game.players[winnerIndex].collectedCards.push(...trickCards)
              game.trickCount++

              const allEmpty = game.players.every(p => p.hand.length === 0)
              if (allEmpty) {
                game.players = game.players.map(p => {
                  const rp = calculateTrickPoints(p.collectedCards, game.papayooSuit)
                  return { ...p, lastRoundPoints: rp, score: p.score + rp, collectedCards: [] }
                })
                // Marquer le pli comme terminé pour l'affichage (dernier pli)
                game.trickComplete = true
                game.trickWinner = winnerIndex
                game.nextPlayer = winnerIndex
                game.isLastTrick = true
                game.message = `${game.players[winnerIndex].name} remporte le dernier pli!`
              } else {
                // NE PAS vider currentTrick - garder les cartes visibles
                game.trickComplete = true
                game.trickWinner = winnerIndex
                game.nextPlayer = winnerIndex
                game.message = `${game.players[winnerIndex].name} remporte le pli!`
              }
            }
          }
        }

        await setGame(code, game)
        return res.status(200).json({ success: true, game })
      }

      // Nouvelle manche
      case 'newRound': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode } = req.body
        const code = roomCode?.toUpperCase().trim()
        let game = await getGame(code)

        if (!game) {
          return res.status(404).json({ error: 'Game not found' })
        }

        // Redistribuer les cartes
        const deck = shuffleDeck(createDeck())
        const hands = dealCards(deck, game.playerCount)

        game.players = game.players.map((p, index) => ({
          ...p,
          hand: hands[index],
          collectedCards: [],
          selectedCards: [],
          cardsToPass: [],
          lastRoundPoints: 0
        }))

        game.roundNumber++
        game.phase = 'passing'
        game.papayooSuit = null
        game.currentPlayer = 0
        game.leadSuit = null
        game.currentTrick = []
        game.trickCount = 0
        game.message = `Manche ${game.roundNumber} - Sélectionnez ${game.cardsToPass} cartes à passer`
        game.lastUpdate = Date.now()

        await setGame(code, game)
        return res.status(200).json({ success: true, game })
      }

      // Retourner au lobby (réinitialiser la room)
      case 'backToLobby': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode } = req.body
        const code = roomCode?.toUpperCase().trim()

        // Supprimer le jeu
        await deleteGame(code)

        // Récupérer et réinitialiser la room
        const room = await getRoom(code)
        if (room) {
          room.status = 'waiting'
          room.players = room.players.map(p => ({
            ...p,
            isReady: p.isHost // L'hôte reste prêt
          }))
          await setRoom(code, room)
          return res.status(200).json({ success: true, room })
        }

        return res.status(404).json({ error: 'Room not found' })
      }

      default:
        return res.status(400).json({ error: 'Unknown action' })
    }
  } catch (error) {
    console.error('Game API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

