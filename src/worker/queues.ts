import { Queue } from 'bullmq'
import { getRedisConnection } from './redis.js'

const connection = getRedisConnection()

/** Queue for collecting "created" transactions into batches */
export const collectQueue = new Queue('transaction-collect', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
})

/** Queue for processing individual transfers */
export const transferQueue = new Queue('transaction-transfer', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  },
})

export interface CollectJobData {
  triggeredAt: string
}

export interface TransferJobData {
  transactionId: number
  batchId: number
  networkSymbol: string
  networkRpcUrl: string
  targetAddress: string
  amountUsdt: number
  treasuryWalletAddress: string
  usdtContractAddress: string
  usdtDecimals: number
  decryptedPrivateKey: string
}
