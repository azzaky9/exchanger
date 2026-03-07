import { getPayload } from 'payload'
import config from '@payload-config'
import { getPhpToUsdRate } from '../../../../lib/exchangeRate'

export async function GET(req: Request) {
  const payload = await getPayload({ config })
  const { searchParams } = new URL(req.url)

  // Require authentication
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rate = await getPhpToUsdRate()
    const amountPhpParam = searchParams.get('amountPhp')
    const feePercent =
      Number(searchParams.get('feePercent')) || Number(process.env.EXCHANGE_FEE_PERCENT) || 2

    if (amountPhpParam) {
      const amountPhp = Number(amountPhpParam)
      if (isNaN(amountPhp) || amountPhp <= 0) {
        return Response.json({ error: 'Invalid amountPhp' }, { status: 400 })
      }

      const amountUsdt = Math.round(amountPhp * rate * 1000000) / 1000000
      const feeUsdt = Math.round(amountUsdt * (feePercent / 100) * 1000000) / 1000000
      const netAmountUsdt = Math.round((amountUsdt - feeUsdt) * 1000000) / 1000000

      return Response.json({
        rate,
        amountPhp,
        amountUsdt,
        feePercent,
        feeUsdt,
        netAmountUsdt,
        timestamp: new Date().toISOString(),
      })
    }

    return Response.json({
      rate,
      feePercent,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ error: message }, { status: 500 })
  }
}
