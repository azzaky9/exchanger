import type { Endpoint } from 'payload'
import { APIError } from 'payload'

/**
 * GET /api/networks/available
 * Returns active networks that users can choose for their exchange.
 * Requires authentication (JWT token or API key).
 */
export const availableNetworksEndpoint: Endpoint = {
  path: '/available',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    const { docs: networks } = await req.payload.find({
      collection: 'networks',
      where: { isActive: { equals: true } },
      limit: 100,
      sort: 'name',
      depth: 0,
      select: {
        name: true,
        symbol: true,
        networkType: true,
        gasFeeTokenName: true,
      },
    })

    return Response.json({ networks })
  },
}
