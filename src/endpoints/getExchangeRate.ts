import { getPhpToUsdRate } from '@/lib/exchangeRate'
import { ExchangeRate } from '@/payload-types'
import { APIError, Endpoint } from 'payload'

export const getExchangeRateEndpoint: Endpoint = {
  path: '/live',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    try {
      const phpToUsd = await getPhpToUsdRate()

      return Response.json({ phpToUsdRate: phpToUsd })
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 500 })
    }
  },
}

export const getExchangeRatePublic: Endpoint = {
  path: '/current',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    const { payload } = req

    try {
      const exchangeRate = await payload.find({
        collection: 'exchange-rates',
        where: {
          isActive: { equals: true },
        },
        select: {
          phpToUsdtRate: true,
          usdtToPhpRate: true,
          updatedAt: true,
        },
        depth: 0,
        limit: 1,
        sort: '-updatedAt',
        overrideAccess: true,
      })
      const docs = exchangeRate.docs || []
      const rate = docs.length > 0 ? (docs[0] as ExchangeRate) : null

      if (!rate) {
        return Response.json({ error: 'No active exchange rate found' }, { status: 404 })
      }

      return Response.json({
        phpToUsdtRate: rate.phpToUsdtRate,
        usdtToPhpRate: rate.usdtToPhpRate,
        updatedAt: rate.updatedAt,
      })
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 500 })
    }
  },
}

/**
 * GET /api/exchange-rates/reference-rate
 *
 * Always returns the latest raw reference rates (market price with no markup/spread)
 * regardless of whether `isActive` is true or false. Used by:
 *  - Clients to display rates when the configured rate is inactive
 *  - Transaction creation when the rate is disabled (falls back to reference rates)
 */
export const getExchangeReferenceRate: Endpoint = {
  path: '/reference-rate',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    const { payload } = req

    try {
      const exchangeRate = await payload.find({
        collection: 'exchange-rates',
        select: {
          phpToUsdtReferenceRate: true,
          usdtToPhpReferenceRate: true,
          isActive: true,
          updatedAt: true,
        },
        depth: 0,
        limit: 1,
        sort: '-updatedAt',
        overrideAccess: true,
      })
      const docs = exchangeRate.docs || []
      const rate = docs.length > 0 ? (docs[0] as ExchangeRate) : null

      if (!rate) {
        return Response.json({ error: 'No exchange rate configured' }, { status: 404 })
      }

      return Response.json({
        /** Raw market reference rates — no markup/spread applied. */
        phpToUsdtReferenceRate: rate.phpToUsdtReferenceRate,
        usdtToPhpReferenceRate: rate.usdtToPhpReferenceRate,
        /**
         * Whether the configured rate is currently active.
         * If false, these reference rates are what transactions will use.
         */
        isActive: rate.isActive ?? false,
        message: 'Reference rate is Read-Only',
        updatedAt: rate.updatedAt,
      })
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 500 })
    }
  },
}
