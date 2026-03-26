import { Worker } from 'bullmq'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getRedisConnection } from './redis.js'
import { executeTransfer } from './transfer.js'
import type { TransferJobData } from './queues.js'

/**
 * Count completed and failed transactions for a batch, then update the batch
 * totals and status accordingly. Uses actual DB counts to avoid race conditions
 * when multiple transfer jobs finish concurrently.
 */
async function syncBatchCounts(payload: Awaited<ReturnType<typeof getPayload>>, batchId: number) {
  const [successResult, failResult] = await Promise.all([
    payload.count({
      collection: 'transactions',
      where: { batch: { equals: batchId }, status: { equals: 'completed' } },
    }),
    payload.count({
      collection: 'transactions',
      where: { batch: { equals: batchId }, status: { equals: 'review_needed' } },
    }),
  ])

  const totalSuccess = successResult.totalDocs
  const totalFail = failResult.totalDocs

  const batch = await payload.findByID({ collection: 'batches', id: batchId })
  const totalProcessed = totalSuccess + totalFail
  const isComplete = totalProcessed >= (batch.transactionCount || 0)

  await payload.update({
    collection: 'batches',
    id: batchId,
    data: {
      totalTrxSuccess: totalSuccess,
      totalTrxFail: totalFail,
      ...(isComplete && {
        status: totalFail === 0 ? 'success' : totalSuccess === 0 ? 'failed' : 'partial_success',
        executedAt: new Date().toISOString(),
      }),
    },
  })
}

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

      // Mark transaction as processing
      await payload.update({
        collection: 'transactions',
        id: transactionId,
        data: { status: 'processing' },
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

        // Sync batch counts from actual DB state (avoids race conditions)
        await syncBatchCounts(payload, batchId)

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

        // Sync batch counts from actual DB state (avoids race conditions)
        await syncBatchCounts(payload, batchId)

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
