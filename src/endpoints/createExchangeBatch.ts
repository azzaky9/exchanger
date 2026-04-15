import { randomUUID } from 'crypto'
import type { Endpoint } from 'payload'
import { APIError } from 'payload'

const BATCH_LIMIT = 50

interface ExchangeItem {
  type?: string
  amount?: number
  network?: number
  targetAddress?: string
}

interface ExchangeResultSuccess {
  index: number
  success: true
  exchangeDetails: {
    userSends: { amount: number; currency: string }
    userReceives: { amount: number; currency: string }
    appliedRate: string
    depositAddress?: string
  }
  transaction: {
    id: number
    orderId: string
    type: string
    amountPhp: number
    amountUsdt: number
    network: number
    targetAddress: string
    status: string
    createdAt: string
  }
}

interface ExchangeResultFailure {
  index: number
  success: false
  error: string
  input: ExchangeItem
}

type ExchangeResult = ExchangeResultSuccess | ExchangeResultFailure

/**
 * POST /api/transactions/create-exchange-batch
 *
 * Creates multiple exchange transactions in a single request.
 * The active exchange rate is fetched once and shared across all items.
 * Individual item failures do NOT abort the rest of the batch.
 *
 * Body:
 *   - exchanges: Array of exchange items (max 50), each containing:
 *       - type: 'fiat_to_crypto' | 'crypto_to_fiat' (required)
 *       - amount: number (required — source currency amount)
 *       - network: number (network ID, required)
 *       - targetAddress: string (destination wallet or bank details, required)
 *
 * Returns:
 *   - total: number of items submitted
 *   - succeeded: number of successfully created transactions
 *   - failed: number of failed items
 *   - results: per-item result array (success or failure details)
 */
export const createExchangeBatchEndpoint: Endpoint = {
  path: '/create-exchange-batch',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    const body =
      typeof req.json === 'function' ? await req.json() : (req as unknown as { body: unknown }).body

    const { exchanges } = body as { exchanges?: unknown }

    if (!Array.isArray(exchanges) || exchanges.length === 0) {
      throw new APIError('exchanges must be a non-empty array', 400)
    }

    if (exchanges.length > BATCH_LIMIT) {
      throw new APIError(`exchanges array exceeds the maximum allowed size of ${BATCH_LIMIT}`, 400)
    }

    const { payload } = req
    const validTypes = ['fiat_to_crypto', 'crypto_to_fiat'] as const

    // Fetch the active exchange rate once for the entire batch
    const exchangeRateRes = await payload.find({
      collection: 'exchange-rates',
      where: {
        isActive: { equals: true },
      },
      limit: 1,
    })

    if (exchangeRateRes.docs.length === 0) {
      throw new APIError('No active exchange rate found', 400)
    }

    const currentRate = exchangeRateRes.docs[0]

    const results: ExchangeResult[] = []
    let succeeded = 0
    let failed = 0

    for (let i = 0; i < exchanges.length; i++) {
      const item = exchanges[i] as ExchangeItem

      // ── Per-item validation ──────────────────────────────────────────────
      if (!item.type || !validTypes.includes(item.type as (typeof validTypes)[number])) {
        results.push({
          index: i,
          success: false,
          error: "type is required and must be 'fiat_to_crypto' or 'crypto_to_fiat'",
          input: item,
        })
        failed++
        continue
      }

      if (!item.amount || typeof item.amount !== 'number' || item.amount <= 0) {
        results.push({
          index: i,
          success: false,
          error: 'amount is required and must be a positive number',
          input: item,
        })
        failed++
        continue
      }

      if (!item.network || typeof item.network !== 'number') {
        results.push({
          index: i,
          success: false,
          error: 'network is required (network ID)',
          input: item,
        })
        failed++
        continue
      }

      if (
        !item.targetAddress ||
        typeof item.targetAddress !== 'string' ||
        !item.targetAddress.trim()
      ) {
        results.push({
          index: i,
          success: false,
          error: 'targetAddress is required',
          input: item,
        })
        failed++
        continue
      }

      // ── Network & treasury lookup ────────────────────────────────────────
      try {
        const networkDoc = await payload.findByID({
          collection: 'networks',
          id: item.network,
        })

        if (!networkDoc || !networkDoc.isActive) {
          results.push({
            index: i,
            success: false,
            error: 'Network not found or inactive',
            input: item,
          })
          failed++
          continue
        }

        const { docs: treasuries } = await payload.find({
          collection: 'treasury',
          where: {
            network: { equals: item.network },
          },
          limit: 1,
          depth: 0,
        })

        if (treasuries.length === 0) {
          results.push({
            index: i,
            success: false,
            error: 'No treasury wallet available for this network',
            input: item,
          })
          failed++
          continue
        }

        const treasury = treasuries[0]

        // ── Calculate amounts ──────────────────────────────────────────────
        let amountPhp = 0
        if (item.type === 'fiat_to_crypto') {
          amountPhp = item.amount
        } else {
          amountPhp = item.amount * (currentRate.usdtToPhpRate as number)
        }

        // ── Create the transaction ─────────────────────────────────────────
        const transaction = await payload.create({
          collection: 'transactions',
          data: {
            orderId: randomUUID(),
            exchangeRate: currentRate.id,
            amountPhp,
            type: item.type as (typeof validTypes)[number],
            network: item.network,
            targetAddress: item.targetAddress.trim(),
            treasury: treasury.id,
            status: 'pending',
          },
        })

        const userSends =
          item.type === 'fiat_to_crypto'
            ? { amount: item.amount, currency: 'PHP' }
            : { amount: item.amount, currency: 'USDT' }

        const userReceives =
          item.type === 'fiat_to_crypto'
            ? { amount: transaction.amountUsdt as number, currency: 'USDT' }
            : { amount: transaction.amountPhp, currency: 'PHP' }

        const appliedRate =
          item.type === 'fiat_to_crypto'
            ? `1 PHP = ${currentRate.phpToUsdtRate} USDT`
            : `1 USDT = ${currentRate.usdtToPhpRate} PHP`

        const depositAddress =
          item.type === 'crypto_to_fiat' ? (treasury.walletAddress as string) : undefined

        results.push({
          index: i,
          success: true,
          exchangeDetails: {
            userSends,
            userReceives,
            appliedRate,
            ...(depositAddress && { depositAddress }),
          },
          transaction: {
            id: transaction.id as number,
            orderId: transaction.orderId as string,
            type: transaction.type,
            amountPhp: transaction.amountPhp,
            amountUsdt: transaction.amountUsdt as number,
            network:
              typeof transaction.network === 'object'
                ? (transaction.network as { id: number }).id
                : (transaction.network as number),
            targetAddress: transaction.targetAddress as string,
            status: transaction.status,
            createdAt: transaction.createdAt,
          },
        })
        succeeded++
      } catch (err) {
        results.push({
          index: i,
          success: false,
          error: err instanceof Error ? err.message : 'Unexpected error creating transaction',
          input: item,
        })
        failed++
      }
    }

    return Response.json({
      success: true,
      total: exchanges.length,
      succeeded,
      failed,
      results,
    })
  },
}
