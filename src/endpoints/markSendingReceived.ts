import type { Transaction as TransactionDoc } from '@/payload-types'
import { APIError, type Endpoint } from 'payload'

export const markSendingReceivedEndpoint: Endpoint = {
  path: '/:id/mark-received',
  method: 'post',
  handler: async (req) => {
    const { user, payload, routeParams } = req

    if (!user) {
      throw new APIError('Unauthorized', 401)
    }

    const isAllowed = user.roles?.includes('user') || user.roles?.includes('admin')
    if (!isAllowed) {
      throw new APIError('Forbidden', 403)
    }

    const routeId = routeParams?.id
    const sendingId =
      typeof routeId === 'string' || typeof routeId === 'number' ? routeId : undefined

    if (!sendingId) {
      throw new APIError('Missing sending id', 400)
    }

    try {
      const sendingDoc = await payload.findByID({
        collection: 'sending',
        id: sendingId,
        depth: 0,
        req,
      })

      const transactionId =
        typeof sendingDoc.transaction === 'object'
          ? sendingDoc.transaction.id
          : sendingDoc.transaction

      if (!transactionId) {
        throw new APIError('Sending record has no transaction reference', 400)
      }

      const transactionRecordId: string | number = transactionId

      const transactionDoc = await payload.findByID({
        collection: 'transactions',
        id: transactionRecordId,
        depth: 0,
        req,
      })

      const nextTransactionStatus: TransactionDoc['status'] =
        transactionDoc.type === 'fiat_to_crypto' ? 'fiat_received' : 'crypto_received'

      await payload.update({
        collection: 'sending',
        id: sendingId,
        data: {
          status: 'completed',
        },
        req,
      })

      const updatedTransaction = await payload.update({
        collection: 'transactions',
        id: transactionRecordId,
        data: {
          status: nextTransactionStatus,
        },
        req,
      })

      return Response.json({
        success: true,
        message: `Transaction marked as ${nextTransactionStatus.replace('_', ' ')}.`,
        transactionStatus: updatedTransaction.status,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark as received'
      return Response.json({ success: false, message }, { status: 500 })
    }
  },
}
