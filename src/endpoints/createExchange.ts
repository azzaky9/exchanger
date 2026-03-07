import type { Endpoint } from 'payload'
import { APIError } from 'payload'

/**
 * POST /api/transactions/create-exchange
 *
 * Creates a fiat-to-crypto exchange transaction.
 * Auto-selects a treasury wallet for the chosen network,
 * auto-calculates exchange rate and fees via the beforeValidate hook.
 *
 * Body:
 *   - amountPhp: number (required)
 *   - network: number (network ID, required)
 *   - targetAddress: string (destination wallet, required)
 *
 * Returns the created transaction with all calculated fields.
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

    const { amountPhp, network, targetAddress } = body as {
      amountPhp?: number
      network?: number
      targetAddress?: string
    }

    // Validate required fields
    if (!amountPhp || typeof amountPhp !== 'number' || amountPhp <= 0) {
      throw new APIError('amountPhp is required and must be a positive number', 400)
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

    // Create the transaction — the beforeValidate hook will auto-calculate
    // exchangeRate, amountUsdt, fees, and netAmountUsdt from amountPhp
    const transaction = await payload.create({
      collection: 'transactions',
      data: {
        type: 'fiat_to_crypto',
        amountPhp,
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
        amountPhp: transaction.amountPhp,
        exchangeRate: transaction.exchangeRate,
        amountUsdt: transaction.amountUsdt,
        exchangeFeePercent: transaction.exchangeFeePercent,
        exchangeFeeUsdt: transaction.exchangeFeeUsdt,
        netAmountUsdt: transaction.netAmountUsdt,
        network: transaction.network,
        targetAddress: transaction.targetAddress,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
    })
  },
}
