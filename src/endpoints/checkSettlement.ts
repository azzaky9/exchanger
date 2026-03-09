import type { Endpoint } from 'payload'
import { APIError } from 'payload'

/**
 * GET /api/transactions/check-settlement/:id
 *
 * Allows a third-party vault to check whether fiat has been settled
 * for a given transaction. The admin manually marks fiat as received
 * in the admin panel; this endpoint lets external systems poll the status.
 *
 * Returns the transaction's current status and settlement details.
 */
export const checkSettlementEndpoint: Endpoint = {
  path: '/check-settlement/:id',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    const { id } = req.routeParams as { id: string }

    if (!id) {
      throw new APIError('Transaction ID is required', 400)
    }

    const transactionId = Number(id)
    if (isNaN(transactionId)) {
      throw new APIError('Transaction ID must be a number', 400)
    }

    const { payload } = req

    const transaction = await payload.findByID({
      collection: 'transactions',
      id: transactionId,
      depth: 0,
    })

    if (!transaction) {
      throw new APIError('Transaction not found', 404)
    }

    const isFiatSettled = transaction.status !== 'awaiting_fiat'

    return Response.json({
      success: true,
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amountUsdt: transaction.amountUsdt,
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
