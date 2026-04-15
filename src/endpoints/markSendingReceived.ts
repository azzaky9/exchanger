import { CRYPTO_TO_FIAT_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import type { Transaction as TransactionDoc } from '@/payload-types'
import { APIError, type Endpoint } from 'payload'

type MarkReceivedRequestBody = {
  txHash?: string
}

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

    let body: MarkReceivedRequestBody = {}
    try {
      body = (await req.json?.()) as MarkReceivedRequestBody
    } catch {
      body = {}
    }

    try {
      const sendingDoc = await payload.findByID({
        collection: CRYPTO_TO_FIAT_COLLECTION_SLUG,
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

      const txHash =
        typeof transactionDoc.txHash === 'string' ? transactionDoc.txHash.trim() : undefined

      const txHashFromBody = typeof body.txHash === 'string' ? body.txHash.trim() : ''
      const resolvedTxHash = txHashFromBody || txHash

      if (transactionDoc.type === 'fiat_to_crypto' && !resolvedTxHash) {
        throw new APIError('txHash is required before confirming sending.', 400)
      }

      const nextTransactionStatus: TransactionDoc['status'] =
        transactionDoc.type === 'fiat_to_crypto' ? 'fiat_received' : 'crypto_received'

      await payload.update({
        collection: CRYPTO_TO_FIAT_COLLECTION_SLUG,
        id: sendingId,
        data: {
          status: 'confirmed',
          ...(txHashFromBody ? { txHash: txHashFromBody } : {}),
        },
        req,
      })

      const updatedTransaction = await payload.update({
        collection: 'transactions',
        id: transactionRecordId,
        data: {
          status: nextTransactionStatus,
          ...(txHashFromBody ? { txHash: txHashFromBody } : {}),
        },
        req,
      })

      return Response.json({
        success: true,
        message: `Sending confirmed. Transaction marked as ${nextTransactionStatus.replace('_', ' ')}.`,
        transactionStatus: updatedTransaction.status,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark as received'
      const status =
        error instanceof APIError
          ? error.status || (error as { statusCode?: number }).statusCode || 400
          : 500

      return Response.json({ success: false, message }, { status })
    }
  },
}
