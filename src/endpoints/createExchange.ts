import type { Endpoint } from 'payload'
import { APIError } from 'payload'
import { randomUUID } from 'crypto'

/**
 * POST /api/transactions/create-exchange
 *
 * Creates an exchange transaction (fiat-to-crypto or crypto-to-fiat).
 * Auto-selects a treasury wallet for the chosen network.
 *
 * Body:
 *   - type: 'fiat_to_crypto' | 'crypto_to_fiat' (required)
 *   - amount: number (required — amount in the source currency: PHP for fiat_to_crypto, USDT for crypto_to_fiat)
 *   - network: number (network ID, required)
 *   - targetAddress: string (destination wallet, required)
 *
 * Returns the created transaction.
 */
export const createExchangeEndpoint: Endpoint = {
  path: '/create-exchange',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    const body =
      typeof req.json === 'function' ? await req.json() : (req as unknown as { body: unknown }).body

    const { type, amount, network, targetAddress } = body as {
      type?: string
      amount?: number
      network?: number
      targetAddress?: string
    }

    const validTypes = ['fiat_to_crypto', 'crypto_to_fiat'] as const
    if (!type || !validTypes.includes(type as (typeof validTypes)[number])) {
      throw new APIError("type is required and must be 'fiat_to_crypto' or 'crypto_to_fiat'", 400)
    }

    // Validate required fields
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new APIError('amount is required and must be a positive number', 400)
    }
    if (!network || typeof network !== 'number') {
      throw new APIError('network is required (network ID)', 400)
    }
    if (!targetAddress || typeof targetAddress !== 'string' || !targetAddress.trim()) {
      throw new APIError('targetAddress is required', 400)
    }

    const { payload } = req

    // Verify network exists and is active
    const networkDoc = await payload.findByID({
      collection: 'networks',
      id: network,
    })

    if (!networkDoc || !networkDoc.isActive) {
      throw new APIError('Network not found or inactive', 400)
    }

    // Auto-select a treasury wallet for the chosen network
    const { docs: treasuries } = await payload.find({
      collection: 'treasury',
      where: {
        network: { equals: network },
      },
      limit: 1,
      depth: 0,
    })

    if (treasuries.length === 0) {
      throw new APIError('No treasury wallet available for this network', 400)
    }

    const treasury = treasuries[0]

    // Fetch active exchange rate
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

    // Calculate amountPhp based on the transaction type and source amount
    let amountPhp = 0
    if (type === 'fiat_to_crypto') {
      // User is sending PHP
      amountPhp = amount
    } else if (type === 'crypto_to_fiat') {
      // User is sending USDT, they get PHP based on the usdtToPhpRate
      amountPhp = amount * (currentRate.usdtToPhpRate as number)
    }

    // Create the transaction
    const transaction = await payload.create({
      collection: 'transactions',
      data: {
        orderId: randomUUID(),
        exchangeRate: currentRate.id,
        amountPhp,
        type: type as (typeof validTypes)[number],
        network,
        targetAddress: targetAddress.trim(),
        treasury: treasury.id,
        status: 'awaiting_fiat',
      },
    })

    const userSends =
      type === 'fiat_to_crypto'
        ? { amount: amount, currency: 'PHP' }
        : { amount: amount, currency: 'USDT' }

    const userReceives =
      type === 'fiat_to_crypto'
        ? { amount: transaction.amountUsdt, currency: 'USDT' }
        : { amount: transaction.amountPhp, currency: 'PHP' }

    const appliedRate =
      type === 'fiat_to_crypto'
        ? `1 PHP = ${currentRate.phpToUsdtRate} USDT`
        : `1 USDT = ${currentRate.usdtToPhpRate} PHP`

    const depositAddress = type === 'crypto_to_fiat' ? treasury.walletAddress : undefined

    return Response.json({
      success: true,
      exchangeDetails: {
        userSends,
        userReceives,
        appliedRate,
        ...(depositAddress && { depositAddress }),
      },
      transaction: {
        id: transaction.id,
        orderId: transaction.orderId,
        type: transaction.type,
        amountPhp: transaction.amountPhp,
        amountUsdt: transaction.amountUsdt,
        network: transaction.network,
        targetAddress: transaction.targetAddress,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
    })
  },
}
