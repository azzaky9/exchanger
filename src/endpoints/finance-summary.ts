import type { User } from '@/payload-types'
import type { Endpoint, Where } from 'payload'
import { APIError } from 'payload'

type TransactionRow = {
  type: string
  status: string
  profit: number | null
  amountPhp: number | null
  amountUsdt: number | null
  createdAt: string
  orderId: string | null
  targetAddress: string
  id: number
}

function startOf(period: 'day' | 'week' | 'month' | 'year') {
  const d = new Date()
  if (period === 'day') {
    d.setUTCHours(0, 0, 0, 0)
  }
  if (period === 'week') {
    // getUTCDay() returns 0 for Sunday
    d.setUTCDate(d.getUTCDate() - d.getUTCDay())
    d.setUTCHours(0, 0, 0, 0)
  }
  if (period === 'month') {
    d.setUTCDate(1)
    d.setUTCHours(0, 0, 0, 0)
  }
  if (period === 'year') {
    d.setUTCMonth(0, 1)
    d.setUTCHours(0, 0, 0, 0)
  }
  return d
}

export const financeSummaryEndpoint: Endpoint = {
  path: '/finance-summary',
  method: 'get',
  handler: async (req) => {
    const user = req.user as User | null
    if (!user?.roles?.includes('admin')) {
      throw new APIError('Unauthorized', 401)
    }

    const { searchParams } = new URL(req.url ?? '/', 'http://localhost')
    const preset = searchParams.get('preset') // today|week|month|year|all
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const statusParam = searchParams.get('status')
    const typeParam = searchParams.get('type')

    let from: Date | undefined
    const to: Date = toParam ? new Date(toParam) : new Date()

    if (fromParam) {
      from = new Date(fromParam)
    } else if (preset === 'today') {
      from = startOf('day')
    } else if (preset === 'week') {
      from = startOf('week')
    } else if (preset === 'month') {
      from = startOf('month')
    } else if (preset === 'year') {
      from = startOf('year')
    }
    // preset === 'all' or nothing → no date filter

    const where: Where = {}
    if (from) {
      where.createdAt = {
        greater_than_equal: from.toISOString(),
        less_than_equal: to.toISOString(),
      }
    }
    if (statusParam && statusParam !== 'all') {
      where.status = { equals: statusParam }
    }
    if (typeParam && typeParam !== 'all') {
      where.type = { equals: typeParam }
    }

    const result = await req.payload.find({
      collection: 'transactions',
      where,
      limit: 10000,
      depth: 0,
      sort: '-createdAt',
      overrideAccess: false,
      user,
    })

    const docs = result.docs as unknown as TransactionRow[]

    // ── KPIs ──
    let profitUsdt = 0
    let profitPhp = 0
    let volumePhp = 0
    let volumeUsdt = 0
    let completed = 0
    let pending = 0
    let pendingSentUsdt = 0
    let pendingSentPhp = 0
    const dailyMap: Record<string, { usdt: number; php: number }> = {}

    for (const tx of docs) {
      const p = tx.profit ?? 0
      const isFiatToCrypto = tx.type === 'fiat_to_crypto'
      const isCompleted = tx.status === 'completed'

      if (isFiatToCrypto) {
        if (isCompleted) profitUsdt += p
        volumePhp += tx.amountPhp ?? 0 // Source is PHP
        volumeUsdt += tx.amountUsdt ?? 0 // Target is USDT
      } else {
        // crypto_to_fiat
        if (isCompleted) profitPhp += p
        volumeUsdt += tx.amountPhp ?? 0 // Source is USDT
        volumePhp += tx.amountUsdt ?? 0 // Target is PHP
      }

      if (tx.status === 'completed') completed++
      if (['pending', 'confirmed', 'processing'].includes(tx.status)) {
        pending++
        if (tx.type === 'fiat_to_crypto') {
          pendingSentUsdt += tx.amountUsdt ?? 0
        } else {
          pendingSentPhp += tx.amountUsdt ?? 0
        }
      }

      const day = tx.createdAt.slice(0, 10)
      if (!dailyMap[day]) dailyMap[day] = { usdt: 0, php: 0 }
      if (isCompleted && tx.type === 'fiat_to_crypto') dailyMap[day].usdt += p
      if (isCompleted && tx.type === 'crypto_to_fiat') dailyMap[day].php += p
    }

    const chartData = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, profitUsdt: round(v.usdt), profitPhp: round(v.php) }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const recent = docs.slice(0, 10).map((tx) => ({
      id: tx.id,
      orderId: tx.orderId,
      type: tx.type,
      status: tx.status,
      amountPhp: tx.amountPhp,
      amountUsdt: tx.amountUsdt,
      profit: tx.profit,
      createdAt: tx.createdAt,
    }))

    return Response.json({
      kpis: {
        profitUsdt: round(profitUsdt),
        profitPhp: round(profitPhp),
        volumePhp: round(volumePhp),
        volumeUsdt: round(volumeUsdt),
        totalTx: docs.length,
        completed,
        pending,
        pendingSentUsdt: round(pendingSentUsdt),
        pendingSentPhp: round(pendingSentPhp),
      },
      chartData,
      recent,
    })
  },
}

function round(n: number, d = 4) {
  return Math.round(n * 10 ** d) / 10 ** d
}
