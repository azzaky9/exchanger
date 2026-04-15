'use client'

import { useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type OperationDoc = {
  status?: string | null
  amount?: number | null
  transaction?:
    | number
    | string
    | {
        id?: number | string
        profit?: number | null
        type?: 'fiat_to_crypto' | 'crypto_to_fiat' | string | null
        amountPhp?: number | null
        amountUsdt?: number | null
      }
    | null
}

type SummaryState = {
  totalTransactions: number
  totalPending: number
  totalComplete: number
  totalExchange: number
  totalReceives: number
  totalRevenue: number
}

const INITIAL_SUMMARY: SummaryState = {
  totalTransactions: 0,
  totalPending: 0,
  totalComplete: 0,
  totalExchange: 0,
  totalReceives: 0,
  totalRevenue: 0,
}

function parseCollectionSlug(pathname: string): string | null {
  const marker = '/collections/'
  const idx = pathname.indexOf(marker)
  if (idx === -1) return null

  const rest = pathname.slice(idx + marker.length)
  const slug = rest.split('/')[0]?.trim()

  return slug || null
}

function Card({ title, value, accent }: { title: string; value: string; accent: string }) {
  return (
    <div
      style={{
        flex: '1 1 190px',
        minWidth: 170,
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
        borderTop: `3px solid ${accent}`,
        borderRadius: 8,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--theme-elevation-500)',
          marginBottom: 5,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.05,
          color: 'var(--theme-text)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

export function ExchangeOperationsSummaryBanner() {
  const { user } = useAuth()
  const pathname = usePathname()

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryState>(INITIAL_SUMMARY)

  const isAdmin = Boolean((user as { roles?: string[] } | null)?.roles?.includes('admin'))

  const collectionSlug = useMemo(() => parseCollectionSlug(pathname), [pathname])

  useEffect(() => {
    if (!collectionSlug) {
      setSummary(INITIAL_SUMMARY)
      setLoading(false)
      return
    }

    let cancelled = false

    const run = async () => {
      setLoading(true)

      try {
        const qs = new URLSearchParams({
          depth: '1',
          limit: '10000',
          sort: '-createdAt',
        })

        const res = await fetch(`/api/${collectionSlug}?${qs.toString()}`, {
          credentials: 'include',
        })

        if (!res.ok) {
          throw new Error('Failed to fetch list summary')
        }

        const data = (await res.json()) as { docs?: OperationDoc[] }
        const docs = Array.isArray(data?.docs) ? data.docs : []

        let totalPending = 0
        let totalComplete = 0
        let totalExchange = 0
        let totalReceives = 0
        let totalRevenue = 0

        for (const doc of docs) {
          if (doc.status === 'pending') totalPending += 1
          if (doc.status === 'completed') totalComplete += 1

          if (doc.transaction && typeof doc.transaction === 'object') {
            const txAmountSource = Number(doc.transaction.amountPhp ?? 0)
            if (!Number.isNaN(txAmountSource)) {
              totalExchange += txAmountSource
            }

            const txAmountReceive = Number(doc.transaction.amountUsdt ?? 0)
            if (!Number.isNaN(txAmountReceive)) {
              totalReceives += txAmountReceive
            }
          } else {
            const amount = Number(doc.amount ?? 0)
            if (!Number.isNaN(amount)) {
              totalExchange += amount
            }
          }

          if (
            isAdmin &&
            doc.status === 'completed' &&
            doc.transaction &&
            typeof doc.transaction === 'object'
          ) {
            const profit = Number(doc.transaction.profit ?? 0)
            if (!Number.isNaN(profit)) {
              totalRevenue += profit
            }
          }
        }

        if (!cancelled) {
          setSummary({
            totalTransactions: docs.length,
            totalPending,
            totalComplete,
            totalExchange,
            totalReceives,
            totalRevenue,
          })
        }
      } catch {
        if (!cancelled) {
          setSummary(INITIAL_SUMMARY)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [collectionSlug, isAdmin])

  if (!collectionSlug) return null

  const formatCount = (n: number) => n.toLocaleString('en-US')

  const formatUsdt = (n: number) =>
    `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT`

  const formatPhp = (n: number) =>
    `₱ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const isFiatToCryptoPage = collectionSlug === 'fiat-to-crypto'
  const receivesTitle = isFiatToCryptoPage ? 'Total Receives (USDT)' : 'Total Receives (PHP)'
  const receivesValue = isFiatToCryptoPage
    ? formatUsdt(summary.totalReceives)
    : formatPhp(summary.totalReceives)
  const exchangeTitle = isFiatToCryptoPage ? 'Total Exchange (PHP)' : 'Total Exchange (USDT)'
  const exchangeValue = isFiatToCryptoPage
    ? formatPhp(summary.totalExchange)
    : formatUsdt(summary.totalExchange)

  return (
    <div style={{ paddingTop: 14, paddingBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 160ms ease',
        }}
      >
        <Card
          title="Total Transaction"
          value={formatCount(summary.totalTransactions)}
          accent="#2563eb"
        />
        <Card title="Total Pending" value={formatCount(summary.totalPending)} accent="#d97706" />
        <Card title="Total Complete" value={formatCount(summary.totalComplete)} accent="#16a34a" />
        {isAdmin ? (
          <Card title="Total Revenue" value={formatUsdt(summary.totalRevenue)} accent="#0f766e" />
        ) : (
          <>
            <Card title={receivesTitle} value={receivesValue} accent="#7c3aed" />
            <Card title={exchangeTitle} value={exchangeValue} accent="#2563eb" />
          </>
        )}
      </div>
    </div>
  )
}
