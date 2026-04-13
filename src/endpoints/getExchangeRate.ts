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
    const { payload } = req

    try {
      let exchangeRate = await payload.find({
        collection: 'exchange-rates',
        where: {
          isActive: {
            equals: true,
          },
        },
        select: {
          phpToUsdtRate: true,
          usdtToPhpRate: true,
          updatedAt: true,
        },
        depth: 0,
        limit: 1,
        sort: '-updatedAt',
      })

      // Fallback to most recent row if no active row exists.
      if (!exchangeRate.docs?.length) {
        exchangeRate = await payload.find({
          collection: 'exchange-rates',
          select: {
            phpToUsdtRate: true,
            usdtToPhpRate: true,
            updatedAt: true,
          },
          depth: 0,
          limit: 1,
          sort: '-updatedAt',
        })
      }

      const docs = exchangeRate.docs || []
      const rate = docs.length > 0 ? (docs[0] as ExchangeRate) : null

      const response = {
        phpToUsdtRate: rate?.phpToUsdtRate ?? null,
        usdtToPhpRate: rate?.usdtToPhpRate ?? null,
        updatedAt: rate?.updatedAt ?? null,
      }

      return Response.json(response)
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 500 })
    }
  },
}
