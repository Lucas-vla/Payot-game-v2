import { createClient } from 'redis'

// Initialiser Redis
// Supporte Vercel Redis (REDIS_URL) et Upstash (UPSTASH_REDIS_REST_URL)
let redis = null
let redisType = null // 'vercel' ou 'upstash'

async function getRedisClient() {
  if (redis && redisType === 'vercel') {
    // Vérifier si la connexion est toujours active
    try {
      await redis.ping()
      return redis
    } catch (e) {
      redis = null
    }
  }

  // Option 1: Vercel Redis (Redis Labs) - utilise REDIS_URL
  if (process.env.REDIS_URL) {
    try {
      redis = createClient({ url: process.env.REDIS_URL })
      redis.on('error', (err) => console.log('Redis Client Error', err))
      await redis.connect()
      redisType = 'vercel'
      console.log('Connected to Vercel Redis')
      return redis
    } catch (e) {
      console.log('Failed to connect to Vercel Redis:', e.message)
      redis = null
    }
  }

  // Option 2: Upstash Redis (REST API) - import dynamique
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import('@upstash/redis')
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      redisType = 'upstash'
      console.log('Connected to Upstash Redis')
      return redis
    } catch (e) {
      console.log('Failed to connect to Upstash Redis:', e.message)
      redis = null
    }
  }

  return null
}

// Fallback en mémoire si Redis n'est pas configuré
const memoryRooms = new Map()

// Fonctions d'accès aux données (avec fallback mémoire)
async function getRoom(code) {
  const client = await getRedisClient()

  if (client && redisType === 'vercel') {
    const data = await client.get(`room:${code}`)
    return data ? JSON.parse(data) : null
  }

  if (client && redisType === 'upstash') {
    return await client.get(`room:${code}`)
  }

  return memoryRooms.get(code)
}

async function setRoom(code, room) {
  const client = await getRedisClient()

  if (client && redisType === 'vercel') {
    // Expire après 24 heures (86400 secondes)
    await client.setEx(`room:${code}`, 86400, JSON.stringify(room))
    return
  }

  if (client && redisType === 'upstash') {
    await client.set(`room:${code}`, room, { ex: 86400 })
    return
  }

  memoryRooms.set(code, room)
}

async function deleteRoom(code) {
  const client = await getRedisClient()

  if (client) {
    await client.del(`room:${code}`)
    return
  }

  memoryRooms.delete(code)
}

// Générer un code de room unique
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { action } = req.query

  try {
    switch (action) {
      case 'create': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { hostName, playerCount, hostId, maxRounds } = req.body

        if (!hostName || !playerCount || !hostId) {
          return res.status(400).json({ error: 'Missing required fields' })
        }

        let roomCode = generateRoomCode()
        // S'assurer que le code est unique
        let existingRoom = await getRoom(roomCode)
        while (existingRoom) {
          roomCode = generateRoomCode()
          existingRoom = await getRoom(roomCode)
        }

        const room = {
          code: roomCode,
          hostId,
          playerCount: parseInt(playerCount),
          maxRounds: maxRounds || 1,
          players: [{
            id: hostId,
            name: hostName,
            isHost: true,
            isReady: true,
            isBot: false
          }],
          status: 'waiting',
          createdAt: Date.now(),
          lastActivity: Date.now()
        }

        await setRoom(roomCode, room)

        return res.status(200).json({ success: true, room })
      }

      case 'join': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode, playerName, playerId } = req.body

        if (!roomCode || !playerName || !playerId) {
          return res.status(400).json({ error: 'Missing required fields' })
        }

        const code = roomCode.toUpperCase().trim()
        const room = await getRoom(code)

        if (!room) {
          return res.status(404).json({ error: 'Partie introuvable. Vérifiez le code.' })
        }

        if (room.status !== 'waiting') {
          return res.status(400).json({ error: 'Cette partie a déjà commencé.' })
        }

        if (room.players.length >= room.playerCount) {
          return res.status(400).json({ error: 'Cette partie est complète.' })
        }

        // Vérifier si le joueur est déjà dans la partie
        const existingPlayer = room.players.find(p => p.id === playerId)
        if (existingPlayer) {
          room.lastActivity = Date.now()
          await setRoom(code, room)
          return res.status(200).json({ success: true, room, reconnected: true })
        }

        // Ajouter le nouveau joueur
        room.players.push({
          id: playerId,
          name: playerName,
          isHost: false,
          isReady: false,
          isBot: false
        })
        room.lastActivity = Date.now()
        await setRoom(code, room)

        return res.status(200).json({ success: true, room })
      }

      case 'leave': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode, playerId } = req.body
        const code = roomCode?.toUpperCase().trim()
        const room = await getRoom(code)

        if (!room) {
          return res.status(200).json({ success: true })
        }

        const playerIndex = room.players.findIndex(p => p.id === playerId)
        if (playerIndex === -1) {
          return res.status(200).json({ success: true })
        }

        const wasHost = room.players[playerIndex].isHost
        room.players.splice(playerIndex, 1)

        if (room.players.length === 0) {
          await deleteRoom(code)
          return res.status(200).json({ success: true, roomDeleted: true })
        }

        // Transférer l'hôte si nécessaire
        if (wasHost && room.players.length > 0) {
          room.players[0].isHost = true
          room.hostId = room.players[0].id
        }

        room.lastActivity = Date.now()
        await setRoom(code, room)
        return res.status(200).json({ success: true, room })
      }

      case 'ready': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode, playerId, ready } = req.body
        const code = roomCode?.toUpperCase().trim()
        const room = await getRoom(code)

        if (!room) {
          return res.status(404).json({ error: 'Room not found' })
        }

        const player = room.players.find(p => p.id === playerId)
        if (player) {
          player.isReady = ready
          room.lastActivity = Date.now()
          await setRoom(code, room)
        }

        return res.status(200).json({ success: true, room })
      }

      case 'addBot': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode, playerId } = req.body
        const code = roomCode?.toUpperCase().trim()
        const room = await getRoom(code)

        if (!room) {
          return res.status(404).json({ error: 'Room not found' })
        }

        if (room.hostId !== playerId) {
          return res.status(403).json({ error: 'Only host can add bots' })
        }

        if (room.players.length >= room.playerCount) {
          return res.status(400).json({ error: 'Room is full' })
        }

        const botNumber = room.players.filter(p => p.isBot).length + 1
        room.players.push({
          id: `bot-${Date.now()}-${botNumber}`,
          name: `Bot ${botNumber}`,
          isHost: false,
          isReady: true,
          isBot: true
        })
        room.lastActivity = Date.now()
        await setRoom(code, room)

        return res.status(200).json({ success: true, room })
      }

      case 'start': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode, playerId } = req.body
        const code = roomCode?.toUpperCase().trim()
        const room = await getRoom(code)

        if (!room) {
          return res.status(404).json({ error: 'Room not found' })
        }

        if (room.hostId !== playerId) {
          return res.status(403).json({ error: 'Only host can start the game' })
        }

        if (room.players.length < 3) {
          return res.status(400).json({ error: 'Minimum 3 players required' })
        }

        if (!room.players.every(p => p.isReady)) {
          return res.status(400).json({ error: 'All players must be ready' })
        }

        room.status = 'playing'
        room.lastActivity = Date.now()
        await setRoom(code, room)

        return res.status(200).json({ success: true, room })
      }

      case 'get': {
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode } = req.query
        const code = roomCode?.toUpperCase().trim()
        const room = await getRoom(code)

        if (!room) {
          return res.status(404).json({ error: 'Room not found' })
        }

        room.lastActivity = Date.now()
        await setRoom(code, room)
        return res.status(200).json({ success: true, room })
      }

      default:
        return res.status(400).json({ error: 'Unknown action' })
    }
  } catch (error) {
    console.error('Room API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

