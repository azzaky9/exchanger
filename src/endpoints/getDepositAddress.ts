import type { Endpoint } from 'payload'
import { APIError } from 'payload'

/**
 * GET /api/treasury/deposit-address
 * Returns the public deposit wallet address for users.
 * Requires authentication (JWT token or API key).
 */
export const depositAddressEndpoint: Endpoint = {
  path: '/deposit-address',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    const { docs } = await req.payload.find({
      collection: 'treasury',
      where: {
        walletName: {
          equals: 'Deposit Wallet (Vault)',
        },
      },
      limit: 1,
      depth: 1,
      overrideAccess: true,
      select: {
        walletName: true,
        walletAddress: true,
        network: true,
      },
    })

    const wallet = docs[0]

    if (!wallet) {
      throw new APIError('Deposit wallet not found', 404)
    }

    return Response.json({
      wallet,
    })
  },
}
