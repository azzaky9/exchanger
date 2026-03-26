import type { Endpoint } from 'payload'
import { APIError } from 'payload'

/**
 * GET /api/transactions/settlement/:orderId
 *
 * Allows checking the transaction and fiat settlement status using the generated orderId.
 *
 * Route Parameters:
 *  - orderId: The UUID generated during create-exchange
 *
 * Returns the transaction's current status and settlement details.
 */
export const settlementStatusEndpoint: Endpoint = {
  path: '/settlement/:orderId',
  method: 'get',
  handler: async (req) => {
    // Require authentication
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    // Access orderId from route parameters
    const { orderId } = (req.routeParams || {}) as { orderId?: string }

    if (!orderId || typeof orderId !== 'string') {
      throw new APIError('orderId query parameter is required', 400)
    }

    const { payload } = req

    const transactions = await payload.find({
      collection: 'transactions',
      where: {
        orderId: {
          equals: orderId,
        },
      },
      depth: 0,
      limit: 1,
    })

    if (transactions.docs.length === 0) {
      throw new APIError('Transaction not found for the given orderId', 404)
    }

    const transaction = transactions.docs[0]
    const isFiatSettled = transaction.status !== 'pending'

    return Response.json({
      success: true,
      transaction: {
        id: transaction.id,
        orderId: transaction.orderId,
        type: transaction.type,
        amountPhp: transaction.amountPhp,
        amountUsdt: transaction.amountUsdt,
        targetAddress: transaction.targetAddress,
        status: transaction.status,
        fiatSettled: isFiatSettled,
        fiatSettlementId: transaction.fiatSettlementId ?? null,
        txHash: transaction.txHash ?? null,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    })
  },
}
