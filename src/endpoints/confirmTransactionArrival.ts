import {
  CRYPTO_TO_FIAT_COLLECTION_SLUG,
  FIAT_TO_CRYPTO_COLLECTION_SLUG,
} from '@/lib/collectionSlugs'
import type { Transaction as TransactionDoc } from '@/payload-types'
import { APIError, type Endpoint } from 'payload'

type ConfirmAction = 'confirm_arrival' | 'confirm_done'

type ConfirmArrivalRequestBody = {
  action?: ConfirmAction
  txHash?: string
  invoiceImage?: string | number
}

export const confirmTransactionArrivalEndpoint: Endpoint = {
  path: '/:id/confirm-arrival',
  method: 'post',
  handler: async (req) => {
    const { user, payload, routeParams } = req

    if (!user) {
      throw new APIError('Unauthorized', 401)
    }

    const isAllowed = user.roles?.includes('admin')
    if (!isAllowed) {
      throw new APIError('Forbidden', 403)
    }

    const routeId = routeParams?.id
    const transactionId =
      typeof routeId === 'string' || typeof routeId === 'number' ? routeId : undefined

    if (!transactionId) {
      throw new APIError('Missing transaction id', 400)
    }

    let body: ConfirmArrivalRequestBody = {}
    try {
      body = (await req.json?.()) as ConfirmArrivalRequestBody
    } catch {
      throw new APIError('Invalid request body', 400)
    }

    const action: ConfirmAction =
      body.action === 'confirm_done' ? 'confirm_done' : 'confirm_arrival'

    const transaction = await payload.findByID({
      collection: 'transactions',
      id: transactionId,
      depth: 0,
      req,
      overrideAccess: false,
    })

    const currentStatus = transaction.status

    if (
      action === 'confirm_arrival' &&
      currentStatus !== 'pending' &&
      currentStatus !== 'fiat_received' &&
      currentStatus !== 'crypto_received' &&
      currentStatus !== 'processing' &&
      currentStatus !== 'confirmed'
    ) {
      throw new APIError(
        'Confirm Arrival is only available when transaction is pending or later.',
        400,
      )
    }

    if (
      action === 'confirm_done' &&
      currentStatus !== 'processing' &&
      currentStatus !== 'confirmed'
    ) {
      throw new APIError('Confirm Done is only available when transaction is Processing.', 400)
    }

    const nextStatus: TransactionDoc['status'] =
      action === 'confirm_arrival' ? 'processing' : 'completed'

    const txHashFromBody = typeof body.txHash === 'string' ? body.txHash.trim() : ''
    const txHashFromDoc = typeof transaction.txHash === 'string' ? transaction.txHash.trim() : ''
    const txHash = txHashFromBody || txHashFromDoc

    const invoiceImageFromBodyRaw = body.invoiceImage
    const invoiceImageFromBody =
      typeof invoiceImageFromBodyRaw === 'number'
        ? invoiceImageFromBodyRaw
        : typeof invoiceImageFromBodyRaw === 'string' && invoiceImageFromBodyRaw.trim() !== ''
          ? Number(invoiceImageFromBodyRaw)
          : undefined

    if (action === 'confirm_done' && transaction.type === 'fiat_to_crypto' && !txHash) {
      throw new APIError('txHash is required to complete crypto sending.', 400)
    }

    if (
      action === 'confirm_done' &&
      transaction.type === 'crypto_to_fiat' &&
      typeof transaction.invoiceImage !== 'number' &&
      typeof transaction.invoiceImage !== 'string' &&
      !Number.isFinite(invoiceImageFromBody)
    ) {
      throw new APIError('Invoice image is required to complete bank sending.', 400)
    }

    if (Number.isFinite(invoiceImageFromBody)) {
      await payload.findByID({
        collection: 'media',
        id: invoiceImageFromBody as number,
        depth: 0,
        req,
        overrideAccess: false,
      })
    }

    const relatedCollection =
      transaction.type === 'fiat_to_crypto'
        ? FIAT_TO_CRYPTO_COLLECTION_SLUG
        : CRYPTO_TO_FIAT_COLLECTION_SLUG
    const relatedRecordRef =
      transaction.type === 'fiat_to_crypto' ? transaction.receivedRecord : transaction.sendingRecord
    const relatedRecordId =
      typeof relatedRecordRef === 'object' ? relatedRecordRef?.id : relatedRecordRef

    if (relatedRecordId) {
      await payload.update({
        collection: relatedCollection,
        id: relatedRecordId,
        data: {
          status: action === 'confirm_arrival' ? 'processing' : 'completed',
        },
        req,
        overrideAccess: true,
      })
    }

    const updated = await payload.update({
      collection: 'transactions',
      id: transactionId,
      data: {
        status: nextStatus,
        ...(action === 'confirm_done' && txHash ? { txHash } : {}),
        ...(Number.isFinite(invoiceImageFromBody) ? { invoiceImage: invoiceImageFromBody } : {}),
      },
      req,
      overrideAccess: true,
    })

    return Response.json({
      success: true,
      action,
      status: updated.status,
      message: `Transaction status changed to ${updated.status.replace('_', ' ')}.`,
    })
  },
}
