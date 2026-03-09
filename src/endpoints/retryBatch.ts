import type { Endpoint } from 'payload'
import { APIError } from 'payload'
import { Queue } from 'bullmq'
import { decrypt } from '../lib/encryption'
import type { Network, Transaction, Treasury } from '../payload-types'

/**
 * Get a Redis connection for the transfer queue.
 * We create a separate Queue instance here because the worker's queue
 * runs in a different process; this connects to the same Redis.
 */
function getTransferQueue() {
  const host = process.env.REDIS_HOST || '127.0.0.1'
  const port = Number(process.env.REDIS_PORT) || 6379
  const url = process.env.REDIS_URL

  const connection = url ? { url } : { host, port }

  return new Queue('transaction-transfer', {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    },
  })
}

export const retryBatchEndpoint: Endpoint = {
  path: '/:id/retry',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    if (!req.user.roles?.includes('admin')) {
      throw new APIError('Forbidden', 403)
    }

    const batchId = Number(req.routeParams?.id)
    if (!batchId || isNaN(batchId)) {
      throw new APIError('Invalid batch ID', 400)
    }

    const { payload } = req

    // Verify batch exists and has failures
    const batch = await payload.findByID({
      collection: 'batches',
      id: batchId,
    })

    if (!batch) {
      throw new APIError('Batch not found', 404)
    }

    if (batch.status !== 'partial_success' && batch.status !== 'failed') {
      throw new APIError(
        `Cannot retry batch with status "${batch.status}". Only partial_success or failed batches can be retried.`,
        400,
      )
    }

    // Find failed transactions in this batch
    const { docs: failedTransactions } = await payload.find({
      collection: 'transactions',
      where: {
        and: [{ batch: { equals: batchId } }, { status: { equals: 'review_needed' } }],
      },
      limit: 100,
      depth: 2,
    })

    if (failedTransactions.length === 0) {
      return Response.json({
        success: false,
        message: 'No failed transactions found in this batch',
      })
    }

    // Build transfer jobs for each failed transaction
    const transferJobs: { name: string; data: Record<string, unknown> }[] = []

    for (const tx of failedTransactions) {
      const treasury = (
        typeof tx.treasury === 'number'
          ? await payload.findByID({ collection: 'treasury', id: tx.treasury, depth: 1 })
          : tx.treasury
      ) as Treasury

      const network = (
        typeof tx.network === 'number'
          ? await payload.findByID({ collection: 'networks', id: tx.network })
          : tx.network
      ) as Network

      const treasuryId = typeof tx.treasury === 'number' ? tx.treasury : tx.treasury.id

      // Get decrypted private key
      const rawTreasury = await payload.findByID({
        collection: 'treasury',
        id: treasuryId,
        depth: 0,
        context: { skipPrivateKeyMask: true },
      })

      const rawKey = rawTreasury?.privateKey
      if (!rawKey) {
        // Skip this transaction, mark with updated fail reason
        await payload.update({
          collection: 'transactions',
          id: tx.id,
          data: { failReason: 'Retry failed: Treasury has no private key' },
        })
        continue
      }

      const encrypted = rawKey.startsWith('enc:') ? rawKey.slice(4) : rawKey
      const decryptedPrivateKey = decrypt(encrypted)

      // Reset transaction status for retry
      await payload.update({
        collection: 'transactions',
        id: tx.id,
        data: {
          status: 'crypto_transfer_pending',
          failReason: '',
          txHash: '',
        },
      })

      transferJobs.push({
        name: `retry-transfer-${tx.id}`,
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

    if (transferJobs.length === 0) {
      return Response.json({
        success: false,
        message: 'No transactions could be retried (missing treasury keys)',
      })
    }

    // Reset batch counters for the retried transactions
    await payload.update({
      collection: 'batches',
      id: batchId,
      data: {
        status: 'processing',
        totalTrxFail: (batch.totalTrxFail || 0) - transferJobs.length,
        totalTrxSuccess: batch.totalTrxSuccess || 0,
        executedAt: null,
      },
    })

    // Enqueue retry jobs
    const queue = getTransferQueue()
    try {
      await queue.addBulk(transferJobs)
    } finally {
      await queue.close()
    }

    console.log(
      `[RetryBatch] Batch ${batchId}: retrying ${transferJobs.length}/${failedTransactions.length} failed transactions`,
    )

    return Response.json({
      success: true,
      message: `Retrying ${transferJobs.length} failed transaction(s)`,
      retried: transferJobs.length,
      total: failedTransactions.length,
    })
  },
}
