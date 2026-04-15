import { randomUUID } from 'crypto'
import type { Endpoint } from 'payload'
import { APIError } from 'payload'

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
 *   - targetAddress: string (destination wallet, required for fiat_to_crypto)
 *   - bankDetails: not required from client for crypto_to_fiat (loaded from BANK_NAME_LOTTO, BANK_ACCOUNT_NAME_LOTTO, and BANK_ACCOUNT_NUMBER_LOTTO env vars)
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
    if (type === 'fiat_to_crypto') {
      if (!targetAddress || typeof targetAddress !== 'string' || !targetAddress.trim()) {
        throw new APIError('targetAddress is required for fiat_to_crypto', 400)
      }
    }

    const exchangerBankName = process.env.BANK_NAME_EXCHANGER?.trim()
    const exchangerBankAccountName = process.env.BANK_ACCOUNT_NAME_EXCHANGER?.trim()
    const exchangerBankAccountNumber = process.env.BANK_ACCOUNT_NUMBER_EXCHANGER?.trim()

    if (
      type === 'fiat_to_crypto' &&
      (!exchangerBankName || !exchangerBankAccountName || !exchangerBankAccountNumber)
    ) {
      throw new APIError(
        'Missing BANK_NAME_EXCHANGER, BANK_ACCOUNT_NAME_EXCHANGER, or BANK_ACCOUNT_NUMBER_EXCHANGER environment configuration',
        500,
      )
    }

    const exchangerBankDetails =
      type === 'fiat_to_crypto'
        ? `Bank Name:\n${exchangerBankName}\n\nAccount Name:\n${exchangerBankAccountName}\n\nAccount Number:\n${exchangerBankAccountNumber}`
        : null

    const bankName = process.env.BANK_NAME_LOTTO?.trim()
    const bankAccountName = process.env.BANK_ACCOUNT_NAME_LOTTO?.trim()
    const bankAccountNumber = process.env.BANK_ACCOUNT_NUMBER_LOTTO?.trim()

    if (type === 'crypto_to_fiat' && (!bankName || !bankAccountName || !bankAccountNumber)) {
      throw new APIError(
        'Missing BANK_NAME_LOTTO, BANK_ACCOUNT_NAME_LOTTO, or BANK_ACCOUNT_NUMBER_LOTTO environment configuration',
        500,
      )
    }

    const bankDetailsFromEnv =
      type === 'crypto_to_fiat'
        ? `Bank Name:\n${bankName}\n\nAccount Name:\n${bankAccountName}\n\nAccount Number:\n${bankAccountNumber}`
        : null

    const { payload } = req

    // Verify network exists and is active
    const networkDoc = await payload.findByID({
      collection: 'networks',
      id: network,
      overrideAccess: true,
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
      overrideAccess: true,
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
      overrideAccess: true,
    })

    if (exchangeRateRes.docs.length === 0) {
      throw new APIError('No active exchange rate found', 400)
    }
    const currentRate = exchangeRateRes.docs[0]

    // Store the source amount in amountPhp for both flows.
    // crypto_to_fiat uses amountPhp as the source USDT amount inside the transaction hook.
    const amountPhp = amount

    // Create the transaction
    const transaction = await payload.create({
      collection: 'transactions',
      data: {
        orderId: randomUUID(),
        exchangeRate: currentRate.id,
        amountPhp,
        type: type as (typeof validTypes)[number],
        network,
        targetAddress: type === 'fiat_to_crypto' ? targetAddress?.trim() : null,
        bankDetails: bankDetailsFromEnv,
        treasury: treasury.id,
        status: 'pending',
      },
      overrideAccess: true,
      req,
    })

    const userSends =
      type === 'fiat_to_crypto'
        ? { amount: amount, currency: 'PHP' }
        : { amount: amount, currency: 'USDT' }

    const userReceives =
      type === 'fiat_to_crypto'
        ? { amount: transaction.amountUsdt, currency: 'USDT' }
        : { amount: transaction.amountUsdt, currency: 'PHP' }

    const appliedRate =
      type === 'fiat_to_crypto'
        ? `1 PHP = ${currentRate.phpToUsdtRate} USDT`
        : `1 USDT = ${currentRate.usdtToPhpRate} PHP`

    const depositAddress = type === 'crypto_to_fiat' ? treasury.walletAddress : null

    return Response.json({
      success: true,
      exchangeDetails: {
        userSends,
        userReceives,
        appliedRate,
        ...(exchangerBankDetails && {
          bankDetails: {
            bankName: exchangerBankName,
            accountName: exchangerBankAccountName,
            accountNumber: exchangerBankAccountNumber,
          },
        }),
        ...(depositAddress && type === 'crypto_to_fiat' && { depositAddress }),
      },
      transaction: {
        id: transaction.id,
        orderId: transaction.orderId,
        type: transaction.type,
        amountPhp: transaction.amountPhp,
        amountUsdt: transaction.amountUsdt,
        networ:
          typeof transaction.network === 'object'
            ? transaction.network.symbol
            : transaction.network,
        // amountUsdt: transaction.amountUsdt,
        // network: transaction.network,
        targetAddress: transaction.targetAddress,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
    })
  },
}
