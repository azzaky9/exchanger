import { Worker } from 'bullmq'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getRedisConnection } from './redis.js'
import { executeTransfer } from './transfer.js'
import type { TransferJobData } from './queues.js'

/**
 * Transfer worker: processes individual USDT transfers concurrently.
 * Each job = one transaction to transfer on-chain.
 *
 * Concurrency is set to 5 by default — Node.js handles these concurrently
 * since each transfer is I/O-bound (network calls to blockchain RPCs).
 */
export function startTransferWorker(concurrency = 5) {
  const connection = getRedisConnection()

  const worker = new Worker<TransferJobData>(
    'transaction-transfer',
    async (job) => {
      const { transactionId, batchId, networkSymbol, amountUsdt } = job.data
      const payload = await getPayload({ config })

      console.log(
        `[Transfer] Job ${job.id}: tx #${transactionId} | ${amountUsdt} USDT on ${networkSymbol}`,
      )

      // Mark transaction as crypto transfer pending
      await payload.update({
        collection: 'transactions',
        id: transactionId,
        data: { status: 'crypto_transfer_pending' },
      })

      try {
        const { txHash } = await executeTransfer(job.data)

        // Mark transaction as completed
        await payload.update({
          collection: 'transactions',
          id: transactionId,
          data: {
            status: 'completed',
            txHash,
          },
        })

        // Update batch success count and check completion
        const batch = await payload.findByID({
          collection: 'batches',
          id: batchId,
        })

        const newSuccess = (batch.totalTrxSuccess || 0) + 1
        const totalFail = batch.totalTrxFail || 0
        const totalProcessed = newSuccess + totalFail
        const isComplete = totalProcessed >= (batch.transactionCount || 0)

        await payload.update({
          collection: 'batches',
          id: batchId,
          data: {
            totalTrxSuccess: newSuccess,
            ...(isComplete && {
              status: totalFail === 0 ? 'success' : 'partial_success',
              executedAt: new Date().toISOString(),
            }),
          },
        })

        console.log(`[Transfer] tx #${transactionId} completed: ${txHash}`)
        return { txHash }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)

        // Mark transaction as failed
        await payload.update({
          collection: 'transactions',
          id: transactionId,
          data: {
            status: 'review_needed',
            failReason: message.slice(0, 500),
          },
        })

        // Update batch fail count and check completion
        const batch = await payload.findByID({
          collection: 'batches',
          id: batchId,
        })

        const newFail = (batch.totalTrxFail || 0) + 1
        const totalSuccess = batch.totalTrxSuccess || 0
        const totalProcessed = totalSuccess + newFail
        const isComplete = totalProcessed >= (batch.transactionCount || 0)

        await payload.update({
          collection: 'batches',
          id: batchId,
          data: {
            totalTrxFail: newFail,
            ...(isComplete && {
              status: totalSuccess === 0 ? 'failed' : 'partial_success',
              executedAt: new Date().toISOString(),
            }),
          },
        })

        console.error(`[Transfer] tx #${transactionId} failed:`, message)
        throw err // let BullMQ handle retries
      }
    },
    {
      connection,
      concurrency, // process multiple transfers in parallel
    },
  )

  worker.on('completed', (job) => {
    console.log(`[Transfer] Job ${job?.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Transfer] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
