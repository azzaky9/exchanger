import { Endpoint } from 'payload'

export const uploadTxHashByOrderIdEndpoint: Endpoint = {
  path: '/upload-tx/:orderId',
  method: 'post',
  handler: async (req) => {
    const { user, payload, routeParams } = req
    const orderId = typeof routeParams?.orderId === 'string' ? routeParams.orderId : undefined

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!orderId || typeof orderId !== 'string') {
      return Response.json({ error: 'Invalid orderId' }, { status: 400 })
    }

    try {
      const body = typeof req.json === 'function' ? await req.json() : null
      const txHash =
        body && typeof body === 'object' ? (body as { txHash?: unknown }).txHash : undefined

      if (!txHash || typeof txHash !== 'string' || !txHash.trim()) {
        return Response.json({ error: 'txHash is required' }, { status: 400 })
      }

      // Find the Crypto-to-Fiat record by ID
      const cryptoToFiatRecord = await payload.findByID({
        collection: 'crypto-to-fiat',
        id: orderId,
        depth: 1,
        req,
        overrideAccess: false,
      })

      if (!cryptoToFiatRecord) {
        return Response.json({ error: 'Order not found' }, { status: 404 })
      }

      // Verify user has permission to update (admin only)
      if (!user?.roles?.includes('admin')) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Update the txHash field
      const updated = await payload.update({
        collection: 'crypto-to-fiat',
        id: orderId,
        data: { txHash: txHash.trim() },
        req,
        overrideAccess: false,
      })

      return Response.json({ success: true, data: updated }, { status: 200 })
    } catch (error) {
      console.error('Error updating txHash:', error)
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
}
