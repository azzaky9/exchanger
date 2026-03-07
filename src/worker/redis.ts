import type { ConnectionOptions } from 'bullmq'

const REDIS_URL = process.env.REDIS_URL
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1'
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined

export function getRedisConnection(): ConnectionOptions {
  if (REDIS_URL) {
    return {
      url: REDIS_URL,
      maxRetriesPerRequest: null,
    }
  }

  return {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  }
}
