import { createClient } from 'redis'

let redis = null
let redisType = null

async function getRedisClient() {
  if (redis && redisType === 'vercel') {
    try {
      await redis.ping()
      return { client: redis, type: redisType }
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
      return { client: redis, type: 'vercel' }
    } catch (e) {
      console.log('Failed to connect to Vercel Redis:', e.message)
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
      return { client: redis, type: 'upstash' }
    } catch (e) {
      console.log('Failed to connect to Upstash Redis:', e.message)
    }
  }

  return { client: null, type: 'memory' }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { client, type } = await getRedisClient()

    const result = {
      redisType: type,
      connected: !!client,
      timestamp: new Date().toISOString()
    }

    if (client && type === 'vercel') {
      // Test set/get
      const testKey = 'test:ping'
      await client.set(testKey, 'pong')
      const value = await client.get(testKey)
      result.testValue = value

      // List all room keys
      const keys = await client.keys('room:*')
      result.roomKeys = keys

      // Get room data for each key
      result.rooms = {}
      for (const key of keys) {
        const data = await client.get(key)
        result.rooms[key] = data ? JSON.parse(data) : null
      }
    }

    if (client && type === 'upstash') {
      const testKey = 'test:ping'
      await client.set(testKey, 'pong')
      const value = await client.get(testKey)
      result.testValue = value

      const keys = await client.keys('room:*')
      result.roomKeys = keys

      result.rooms = {}
      for (const key of keys) {
        const data = await client.get(key)
        result.rooms[key] = data
      }
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('Debug error:', error)
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    })
  }
}

