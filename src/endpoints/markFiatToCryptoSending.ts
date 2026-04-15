import { FIAT_TO_CRYPTO_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import type { Transaction as TransactionDoc } from '@/payload-types'
import { APIError, type Endpoint } from 'payload'

type MarkSendingRequestBody = {
  invoiceImage?: number | string
}

export const markFiatToCryptoSendingEndpoint: Endpoint = {
  path: '/:id/mark-sending',
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
    const receivedId =
      typeof routeId === 'string' || typeof routeId === 'number' ? routeId : undefined

    if (!receivedId) {
      throw new APIError('Missing fiat-to-crypto record id', 400)
    }

    let body: MarkSendingRequestBody = {}
    try {
      body = (await req.json?.()) as MarkSendingRequestBody
    } catch {
      throw new APIError('Invalid request body', 400)
    }

    const invoiceImageIdRaw = body.invoiceImage

    if (typeof invoiceImageIdRaw !== 'string' && typeof invoiceImageIdRaw !== 'number') {
      throw new APIError('Invoice image is required', 400)
    }

    const invoiceImageId =
      typeof invoiceImageIdRaw === 'number' ? invoiceImageIdRaw : Number(invoiceImageIdRaw)

    if (!Number.isFinite(invoiceImageId)) {
      throw new APIError('Invoice image id is invalid', 400)
    }

    try {
      await payload.findByID({
        collection: 'media',
        id: invoiceImageId,
        depth: 0,
        req,
        overrideAccess: false,
      })

      const receivedDoc = await payload.findByID({
        collection: FIAT_TO_CRYPTO_COLLECTION_SLUG,
        id: receivedId,
        depth: 0,
        req,
      })

      const transactionId =
        typeof receivedDoc.transaction === 'object'
          ? receivedDoc.transaction.id
          : receivedDoc.transaction

      if (!transactionId) {
        throw new APIError('Fiat-to-crypto record has no transaction reference', 400)
      }

      const transactionRecordId: string | number = transactionId

      await payload.update({
        collection: FIAT_TO_CRYPTO_COLLECTION_SLUG,
        id: receivedId,
        data: {
          status: 'confirmed',
          invoiceImage: invoiceImageId,
        },
        req,
      })

      const updatedTransaction = await payload.update({
        collection: 'transactions',
        id: transactionRecordId,
        data: {
          status: 'fiat_received' as TransactionDoc['status'],
          invoiceImage: invoiceImageId,
        },
        req,
      })

      return Response.json({
        success: true,
        message: 'Marked as sending and invoice image attached.',
        transactionStatus: updatedTransaction.status,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark as sending'
      return Response.json({ success: false, message }, { status: 500 })
    }
  },
}
