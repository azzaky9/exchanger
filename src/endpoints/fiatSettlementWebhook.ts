import type { Endpoint } from 'payload'
import { APIError } from 'payload'
import crypto from 'node:crypto'

/**
 * POST /api/transactions/webhook/fiat-settlement
 *
 * Webhook called by the external fiat settlement service to mark
 * a transaction as "fiat_received" with the settlement reference.
 *
 * Secured via HMAC-SHA256 signature in the `x-webhook-signature` header.
 * The service signs the raw JSON body with the shared WEBHOOK_SECRET.
 *
 * Body:
 *   - transactionId: number (required)
 *   - fiatSettlementId: string (required)
 *
 * Signature:
 *   x-webhook-signature: sha256=<hex HMAC of raw body>
 */
export const fiatSettlementWebhookEndpoint: Endpoint = {
  path: '/webhook/fiat-settlement',
  method: 'post',
  handler: async (req) => {
    const webhookSecret = process.env.WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Webhook] WEBHOOK_SECRET is not configured')
      throw new APIError('Webhook not configured', 500)
    }

    // Read raw body for signature verification
    let rawBody: string
    try {
      rawBody = await req.text!()
    } catch {
      throw new APIError('Unable to read request body', 400)
    }

    // Verify HMAC signature
    const signatureHeader = req.headers.get('x-webhook-signature')
    if (!signatureHeader) {
      throw new APIError('Missing x-webhook-signature header', 401)
    }

    const expectedSignature =
      'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature))) {
      throw new APIError('Invalid webhook signature', 401)
    }

    // Parse body after signature is verified
    let body: { transactionId?: number; fiatSettlementId?: string }
    try {
      body = JSON.parse(rawBody)
    } catch {
      throw new APIError('Invalid JSON body', 400)
    }

    const { transactionId, fiatSettlementId } = body

    if (!transactionId || typeof transactionId !== 'number') {
      throw new APIError('transactionId is required (number)', 400)
    }
    if (!fiatSettlementId || typeof fiatSettlementId !== 'string' || !fiatSettlementId.trim()) {
      throw new APIError('fiatSettlementId is required (string)', 400)
    }

    const { payload } = req

    // Verify transaction exists and is in the correct state
    const transaction = await payload.findByID({
      collection: 'transactions',
      id: transactionId,
    })

    if (!transaction) {
      throw new APIError('Transaction not found', 404)
    }

    if (transaction.status !== 'awaiting_fiat') {
      throw new APIError(
        `Transaction is not awaiting fiat (current status: ${transaction.status})`,
        409,
      )
    }

    // Update transaction to fiat_received
    const updated = await payload.update({
      collection: 'transactions',
      id: transactionId,
      data: {
        status: 'fiat_received',
        fiatSettlementId: fiatSettlementId.trim(),
      },
    })

    console.log(
      `[Webhook] Transaction #${transactionId} marked as fiat_received (settlement: ${fiatSettlementId})`,
    )

    return Response.json({
      success: true,
      transaction: {
        id: updated.id,
        status: updated.status,
        fiatSettlementId: updated.fiatSettlementId,
      },
    })
  },
}
