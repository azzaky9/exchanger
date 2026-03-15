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

    const { payload } = req

    try {
      const rates = await payload.find({
        collection: 'exchange-rates',
      })
      const phpToUsd = await getPhpToUsdRate()

      console.log(`[exchange-rate] Fetched exchange rates: ${JSON.stringify(rates)}`)

      return Response.json({ phpToUsdRate: phpToUsd })
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 500 })
    }
  },
}

export const getExchangeRatePublic: Endpoint = {
  path: '/',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    const { payload } = req

    try {
      const exchangeRate = await payload.find({
        collection: 'exchange-rates',
      })
      const docs = exchangeRate.docs || []
      const rate = docs.length > 0 ? (docs[0] as ExchangeRate) : null

      const response = {
        phpToUsdtRate: rate?.phpToUsdtRate ?? null,
        usdtToPhpRate: rate?.usdtToPhpRate ?? null,
      }

      console.log(`[exchange-rate] Fetched exchange rates: ${JSON.stringify(response)}`)

      return Response.json(response)
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 500 })
    }
  },
}
