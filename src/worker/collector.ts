import { Worker } from 'bullmq'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getRedisConnection } from './redis.js'
import { transferQueue } from './queues.js'
import { decrypt } from '../lib/encryption.js'
import type { CollectJobData, TransferJobData } from './queues.js'
import type { Network, Transaction, Treasury } from '../payload-types.js'

const MIN_BATCH_SIZE = Number(process.env.MIN_BATCH_SIZE) || 5
const MAX_BATCH_SIZE = Number(process.env.MAX_BATCH_SIZE) || 20

/**
 * Collector worker: runs every 5 minutes via a repeatable job.
 * Fetches "confirmed" transactions, creates a single batch,
 * and enqueues transfer jobs with decrypted treasury private keys.
 *
 * A batch can contain transfers across multiple networks/treasuries.
 * Each transfer job carries its own network RPC, contract, and private key.
 */
export function startCollectorWorker() {
  const connection = getRedisConnection()

  const worker = new Worker<CollectJobData>(
    'transaction-collect',
    async (job) => {
      const payload = await getPayload({ config })

      console.log(`[Collector] Job ${job.id} started at ${job.data.triggeredAt}`)

      // Fetch "confirmed" transactions with populated relations
      const { docs: transactions } = await payload.find({
        collection: 'transactions',
        where: {
          status: { equals: 'confirmed' },
          type: { equals: 'fiat_to_crypto' },
        },
        limit: MAX_BATCH_SIZE,
        sort: 'createdAt',
        depth: 2,
      })

      if (transactions.length < MIN_BATCH_SIZE) {
        console.log(
          `[Collector] Only ${transactions.length} transactions found (min: ${MIN_BATCH_SIZE}). Skipping.`,
        )
        return { collected: 0, reason: 'below_minimum' }
      }

      const toProcess = transactions.slice(0, MAX_BATCH_SIZE)
      console.log(`[Collector] Processing ${toProcess.length} transactions`)

      // Aggregate batch totals across all transactions (multi-network)
      const totalUsdt = toProcess.reduce((sum, tx) => sum + (tx.amountUsdt ?? 0), 0)

      // Create a single batch for all transactions
      const batch = await payload.create({
        collection: 'batches',
        data: {
          transactionCount: toProcess.length,
          totalUsdtBatched: totalUsdt,
          totalFeeUsdt: 0,
          totalNetUsdt: totalUsdt,
          status: 'processing',
        },
      })

      // Cache resolved treasuries and networks to avoid repeated lookups
      const treasuryCache = new Map<number, Treasury>()
      const networkCache = new Map<number, Network>()
      // Cache decrypted private keys per treasury (raw DB read bypasses afterRead mask)
      const privateKeyCache = new Map<number, string>()

      /**
       * Resolve treasury with its raw (encrypted) private key.
       * The afterRead hook masks privateKey to '••••••••', so we
       * do a direct DB read to get the encrypted value for decryption.
       */
      async function resolveTreasury(tx: Transaction): Promise<Treasury> {
        const treasuryId = typeof tx.treasury === 'number' ? tx.treasury : tx.treasury.id
        if (treasuryCache.has(treasuryId)) return treasuryCache.get(treasuryId)!

        const treasury =
          typeof tx.treasury === 'number'
            ? ((await payload.findByID({
                collection: 'treasury',
                id: treasuryId,
                depth: 1,
              })) as Treasury)
            : (tx.treasury as Treasury)

        treasuryCache.set(treasuryId, treasury)
        return treasury
      }

      async function resolveNetwork(tx: Transaction, treasury: Treasury): Promise<Network> {
        const networkId = typeof tx.network === 'number' ? tx.network : tx.network.id
        if (networkCache.has(networkId)) return networkCache.get(networkId)!

        let network: Network
        if (typeof tx.network !== 'number') {
          network = tx.network as Network
        } else if (typeof treasury.network !== 'number') {
          network = treasury.network as Network
        } else {
          network = (await payload.findByID({
            collection: 'networks',
            id: networkId,
          })) as Network
        }

        networkCache.set(networkId, network)
        return network
      }

      async function getDecryptedPrivateKey(treasuryId: number): Promise<string> {
        if (privateKeyCache.has(treasuryId)) return privateKeyCache.get(treasuryId)!

        // Read with context flag to bypass afterRead private key masking
        const result = await payload.findByID({
          collection: 'treasury',
          id: treasuryId,
          depth: 0,
          context: { skipPrivateKeyMask: true },
        })

        const rawKey = result?.privateKey
        if (!rawKey) {
          throw new Error(`Treasury ${treasuryId} has no private key`)
        }

        // Strip 'enc:' prefix and decrypt
        const encrypted = rawKey.startsWith('enc:') ? rawKey.slice(4) : rawKey
        const decrypted = decrypt(encrypted)

        privateKeyCache.set(treasuryId, decrypted)
        return decrypted
      }

      // Build transfer jobs for each transaction
      const transferJobs: { name: string; data: TransferJobData }[] = []

      for (const tx of toProcess) {
        const treasury = await resolveTreasury(tx)
        const network = await resolveNetwork(tx, treasury)
        const treasuryId = typeof tx.treasury === 'number' ? tx.treasury : tx.treasury.id
        const decryptedPrivateKey = await getDecryptedPrivateKey(treasuryId)

        // Assign batch and update status
        await payload.update({
          collection: 'transactions',
          id: tx.id,
          data: {
            batch: batch.id,
            status: 'processing',
          },
        })

        transferJobs.push({
          name: `transfer-${tx.id}`,
          data: {
            transactionId: tx.id,
            batchId: batch.id,
            networkSymbol: network.symbol,
            networkRpcUrl: network.rpcUrl,
            targetAddress: tx.targetAddress,
            amountUsdt: tx.amountUsdt ?? 0,
            treasuryWalletAddress: treasury.walletAddress,
            usdtContractAddress: network.usdtContractAddress,
            usdtDecimals: network.usdtDecimals ?? 6,
            decryptedPrivateKey,
          },
        })
      }

      await transferQueue.addBulk(transferJobs)

      // Log summary per network
      const networkSummary = new Map<string, number>()
      for (const j of transferJobs) {
        networkSummary.set(
          j.data.networkSymbol,
          (networkSummary.get(j.data.networkSymbol) || 0) + 1,
        )
      }
      const summaryStr = [...networkSummary.entries()]
        .map(([sym, count]) => `${sym}: ${count}`)
        .join(', ')

      console.log(
        `[Collector] Batch ${batch.id}: ${toProcess.length} txns [${summaryStr}] | ` +
          `Total: ${totalUsdt} USDT`,
      )

      console.log(`[Collector] Job done. Enqueued ${transferJobs.length} transfer jobs.`)
      return { collected: toProcess.length, enqueued: transferJobs.length }
    },
    {
      connection,
      concurrency: 1,
    },
  )

  worker.on('completed', (job, result) => {
    console.log(`[Collector] Job ${job?.id} completed:`, result)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Collector] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
