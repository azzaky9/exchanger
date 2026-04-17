import { APIError, type Endpoint } from 'payload'
import { ExchangerType } from './constants'

export const uploadInvoiceByOrderIdEndpoint: Endpoint = {
  path: '/upload-invoice/:orderId',
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

    const orderIdParam = routeParams?.orderId
    const orderId = typeof orderIdParam === 'string' ? orderIdParam.trim() : ''

    if (!orderId) {
      throw new APIError('orderId route parameter is required', 400)
    }

    if (typeof req.formData !== 'function') {
      throw new APIError('multipart/form-data is required', 400)
    }

    const formData = await req.formData()
    const fileFromBody = formData.get('file')
    const altFromBody = formData.get('alt')

    if (!(fileFromBody instanceof File)) {
      throw new APIError("'file' is required and must be a file upload", 400)
    }

    const alt =
      typeof altFromBody === 'string' && altFromBody.trim() ? altFromBody.trim() : 'Invoice image'

    const transactionResult = await payload.find({
      collection: 'transactions',
      where: {
        orderId: {
          equals: orderId,
        },
      },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })

    if (transactionResult.docs.length === 0) {
      throw new APIError('Transaction not found for the given orderId', 404)
    }

    const transaction = transactionResult.docs[0]

    if (transaction.type !== ExchangerType.Onramp) {
      throw new APIError('Invoice upload via orderId is only supported for crypto_to_fiat', 400)
    }

    const fileBuffer = Buffer.from(await fileFromBody.arrayBuffer())

    const mediaDoc = await payload.create({
      collection: 'media',
      data: {
        alt,
      },
      file: {
        data: fileBuffer,
        mimetype: fileFromBody.type || 'application/octet-stream',
        name: fileFromBody.name || `invoice-${orderId}`,
        size: fileFromBody.size,
      },
      req,
      overrideAccess: true,
    })

    const sendingRecordRef = transaction.sendingRecord
    const sendingRecordId =
      typeof sendingRecordRef === 'object' ? sendingRecordRef?.id : sendingRecordRef

    await payload.update({
      collection: 'transactions',
      id: transaction.id,
      data: {
        invoiceImage: mediaDoc.id,
      },
      req,
      overrideAccess: true,
    })

    const mediaUrl = (mediaDoc as { url?: string | null }).url ?? null

    return Response.json({
      success: true,
      message: 'Invoice image uploaded and linked successfully.',
      orderId,
      transactionId: transaction.id,
      sendingRecordId: sendingRecordId ?? null,
      media: {
        id: mediaDoc.id,
        url: mediaUrl,
      },
    })
  },
}
