import { createClient } from 'redis'

// Configuration Redis
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
      console.log('Failed to connect to Redis:', e.message)
      redis = null
    }
  }

  return null
}

// Stockage en mémoire pour le développement local
const memoryChats = new Map()

async function getChat(roomCode) {
  const client = await getRedisClient()
  if (client && redisType === 'vercel') {
    const data = await client.get(`chat:${roomCode}`)
    return data ? JSON.parse(data) : []
  }
  return memoryChats.get(roomCode) || []
}

async function setChat(roomCode, messages) {
  const client = await getRedisClient()
  // Garder seulement les 100 derniers messages
  const trimmedMessages = messages.slice(-100)

  if (client && redisType === 'vercel') {
    await client.setEx(`chat:${roomCode}`, 86400, JSON.stringify(trimmedMessages))
    return
  }
  memoryChats.set(roomCode, trimmedMessages)
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const action = req.query.action

  try {
    switch (action) {
      // Récupérer les messages
      case 'get': {
        const roomCode = req.query.roomCode?.toUpperCase().trim()
        const since = parseInt(req.query.since) || 0

        if (!roomCode) {
          return res.status(400).json({ error: 'Room code required' })
        }

        const messages = await getChat(roomCode)
        // Retourner seulement les messages depuis le timestamp donné
        const newMessages = messages.filter(m => m.timestamp > since)

        return res.status(200).json({
          success: true,
          messages: newMessages,
          lastTimestamp: messages.length > 0 ? messages[messages.length - 1].timestamp : 0
        })
      }

      // Envoyer un message
      case 'send': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode, playerId, playerName, message } = req.body
        const code = roomCode?.toUpperCase().trim()

        if (!code || !playerId || !message?.trim()) {
          return res.status(400).json({ error: 'Missing required fields' })
        }

        // Limiter la longueur du message
        const trimmedMessage = message.trim().slice(0, 500)

        const messages = await getChat(code)
        const newMessage = {
          id: `${Date.now()}-${playerId.slice(0, 8)}`,
          playerId,
          playerName: playerName || 'Anonyme',
          message: trimmedMessage,
          timestamp: Date.now()
        }

        messages.push(newMessage)
        await setChat(code, messages)

        return res.status(200).json({ success: true, message: newMessage })
      }

      // Effacer le chat (quand la room est supprimée)
      case 'clear': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const { roomCode } = req.body
        const code = roomCode?.toUpperCase().trim()

        if (!code) {
          return res.status(400).json({ error: 'Room code required' })
        }

        await setChat(code, [])
        return res.status(200).json({ success: true })
      }

      default:
        return res.status(400).json({ error: 'Unknown action' })
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

