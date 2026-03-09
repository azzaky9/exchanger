import type { Endpoint } from 'payload'
import { APIError } from 'payload'

/**
 * POST /api/transactions/create-exchange
 *
 * Creates an exchange transaction (fiat-to-crypto or crypto-to-fiat).
 * Auto-selects a treasury wallet for the chosen network.
 *
 * Exchange rate and markup are set later by admin in the panel.
 * amountPhp is auto-computed from amountUsdt × exchangeRate × (1 + markup%).
 *
 * Body:
 *   - type: 'fiat_to_crypto' | 'crypto_to_fiat' (required)
 *   - amountUsdt: number (required — USDT amount)
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

    const { type, amountUsdt, network, targetAddress } = body as {
      type?: string
      amountUsdt?: number
      network?: number
      targetAddress?: string
    }

    const validTypes = ['fiat_to_crypto', 'crypto_to_fiat'] as const
    if (!type || !validTypes.includes(type as (typeof validTypes)[number])) {
      throw new APIError("type is required and must be 'fiat_to_crypto' or 'crypto_to_fiat'", 400)
    }

    // Validate required fields
    if (!amountUsdt || typeof amountUsdt !== 'number' || amountUsdt <= 0) {
      throw new APIError('amountUsdt is required and must be a positive number', 400)
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

    // Create the transaction — exchange rate and markup are set by admin later
    const transaction = await payload.create({
      collection: 'transactions',
      data: {
        type: type as (typeof validTypes)[number],
        amountUsdt,
        network,
        targetAddress: targetAddress.trim(),
        treasury: treasury.id,
        status: 'awaiting_fiat',
      },
    })

    return Response.json({
      success: true,
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amountUsdt: transaction.amountUsdt,
        network: transaction.network,
        targetAddress: transaction.targetAddress,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
    })
  },
}
