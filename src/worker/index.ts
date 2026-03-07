import 'dotenv/config'
import { collectQueue } from './queues.js'
import { startCollectorWorker } from './collector.js'
import { startTransferWorker } from './processor.js'

const COLLECT_INTERVAL_MS = 1 * 60 * 1000 // 1 minutes
const TRANSFER_CONCURRENCY = Number(process.env.TRANSFER_CONCURRENCY) || 5
const REDIS_TARGET =
  process.env.REDIS_URL ||
  `${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`

async function main() {
  console.log('===========================================')
  console.log('  Transaction Worker Starting...')
  console.log('===========================================')
  console.log(`  Collect interval: ${COLLECT_INTERVAL_MS / 1000}s`)
  console.log(`  Transfer concurrency: ${TRANSFER_CONCURRENCY}`)
  console.log(`  Redis target: ${REDIS_TARGET}`)
  console.log('===========================================')

  // Register repeatable job: collect transactions every 5 minutes
  await collectQueue.upsertJobScheduler(
    'collect-created-transactions',
    { every: COLLECT_INTERVAL_MS },
    {
      data: { triggeredAt: new Date().toISOString() },
    },
  )
  console.log('[Scheduler] Repeatable collect job registered (every 5 min)')

  // Start workers
  const collectorWorker = startCollectorWorker()
  const transferWorker = startTransferWorker(TRANSFER_CONCURRENCY)

  // Graceful shutdown with forced exit timeout
  let isShuttingDown = false
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log('[Worker] Force exit.')
      process.exit(1)
    }
    isShuttingDown = true
    console.log(`\n[Worker] Received ${signal}. Shutting down gracefully...`)

    // Force exit after 5s if close() hangs
    const forceTimer = setTimeout(() => {
      console.error('[Worker] Shutdown timed out. Forcing exit.')
      process.exit(1)
    }, 5000)
    forceTimer.unref()

    try {
      await Promise.allSettled([
        collectorWorker.close(),
        transferWorker.close(),
        collectQueue.close(),
      ])
      console.log('[Worker] All workers closed. Exiting.')
    } catch (err) {
      console.error('[Worker] Error during shutdown:', err)
    }
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  console.log('[Worker] All workers running. Waiting for jobs...')
}

main().catch((err) => {
  console.error('[Worker] Fatal error:', err)
  process.exit(1)
})
