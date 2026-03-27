'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@payloadcms/ui'
import { useSearchParams } from 'next/navigation'

type Preset = 'today' | 'week' | 'month' | 'year' | 'all'
type TxType = 'all' | 'fiat_to_crypto' | 'crypto_to_fiat'

function UsdtLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.582v-2.366h5.414V8H8.596v3.435h5.414v2.366c-4.4.202-7.71 1.076-7.71 2.133 0 1.057 3.31 1.93 7.71 2.132v7.633h3.912v-7.635c4.392-.202 7.694-1.075 7.694-2.13 0-1.057-3.302-1.93-7.694-2.133"
        fill="#fff"
      />
    </svg>
  )
}

type Summary = {
  receivedPhp: number
  sentUsdt: number
  receivedUsdt: number
  sentPhp: number
  totalPending: number
  totalCompleted: number
  count: number
  pendingSentUsdt: number
  pendingSentPhp: number
}

function startOfUtc(period: 'day' | 'week' | 'month' | 'year'): Date {
  const d = new Date()
  if (period === 'day') d.setUTCHours(0, 0, 0, 0)
  if (period === 'week') {
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

function presetToRange(preset: Preset): { from?: string; to?: string } {
  if (preset === 'all') return {}
  const map: Record<Exclude<Preset, 'all'>, 'day' | 'week' | 'month' | 'year'> = {
    today: 'day',
    week: 'week',
    month: 'month',
    year: 'year',
  }
  return {
    from: startOfUtc(map[preset]).toISOString(),
    to: new Date().toISOString(),
  }
}

function PresetBar({ active, onChange }: { active: Preset; onChange: (p: Preset) => void }) {
  const presets: { label: string; value: Preset }[] = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
    { label: 'All Time', value: 'all' },
  ]

  const btn = (v: Preset): React.CSSProperties => ({
    padding: '4px 12px',
    borderRadius: 5,
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    background: active === v ? '#16a34a' : 'transparent',
    color: active === v ? '#fff' : 'var(--theme-elevation-500)',
    transition: 'all 0.15s',
  })

  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: '2px',
        background: 'var(--theme-elevation-100)',
        borderRadius: 6,
      }}
    >
      {presets.map((p) => (
        <button key={p.value} style={btn(p.value)} onClick={() => onChange(p.value)}>
          {p.label}
        </button>
      ))}
    </div>
  )
}

function AmountCell({ label, amount, isCrypto, accent }: {
  label: string
  amount: number
  isCrypto: boolean
  accent: string
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 140,
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
        borderTop: `3px solid ${accent}`,
        borderRadius: 8,
        padding: '14px 18px',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: 'var(--theme-elevation-500)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--theme-text)', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 6 }}>
        {isCrypto ? <UsdtLogo size={20} /> : <span>₱</span>}
        <span>
          {isCrypto
            ? amount.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
            : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  )
}

function CountCard({ label, value, accent, sub }: { label: string; value: number; accent: string; sub?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 120, background: 'var(--theme-elevation-50)', border: '1px solid var(--theme-elevation-150)', borderTop: `3px solid ${accent}`, borderRadius: 8, padding: '14px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: 'var(--theme-elevation-500)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--theme-text)', lineHeight: 1.1 }}>{value.toLocaleString()}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--theme-elevation-450)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export function TransactionSummaryBanner() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [preset, setPreset] = useState<Preset>('month')
  const [loading, setLoading] = useState(false)

  // Read the type filter set by TransactionTypeFilter in the URL
  const typeFilter = (searchParams.get('where[type][equals]') ?? 'all') as TxType

  const fetchSummary = useCallback(async (p: Preset, type: TxType) => {
    setLoading(true)
    try {
      const { from, to } = presetToRange(p)
      const qs = new URLSearchParams({ limit: '10000', depth: '0' })
      if (from) {
        qs.set('where[createdAt][greater_than_equal]', from)
        qs.set('where[createdAt][less_than_equal]', to ?? new Date().toISOString())
      }
      // Apply the same type filter as the list table
      if (type !== 'all') {
        qs.set('where[type][equals]', type)
      }

      const data = await fetch(`/api/transactions?${qs}`, { credentials: 'include' }).then((r) =>
        r.json(),
      )
      const docs = (data?.docs ?? []) as {
        status: string
        amountPhp?: number | null
        amountUsdt?: number | null
        type?: string
      }[]

  // Accumulate per type — from EXCHANGER perspective
    let receivedPhp = 0,    // fiat_to_crypto: exchanger receives PHP  (amountPhp)
      sentUsdt = 0,         // fiat_to_crypto: exchanger sends USDT    (amountUsdt)
      receivedUsdt = 0,     // crypto_to_fiat: exchanger receives USDT (amountPhp field stores small USDT)
      sentPhp = 0,          // crypto_to_fiat: exchanger sends PHP      (amountUsdt field stores large PHP)
      totalPending = 0,
      totalCompleted = 0,
      pendingSentUsdt = 0,
      pendingSentPhp = 0

    for (const tx of docs) {
      if (tx.type === 'fiat_to_crypto') {
        receivedPhp += tx.amountPhp ?? 0   // PHP customer paid in
        sentUsdt    += tx.amountUsdt ?? 0  // USDT exchanger sent out
      } else {
        receivedUsdt += tx.amountPhp ?? 0  // USDT received
        sentPhp      += tx.amountUsdt ?? 0 // PHP paid out
      }
      
      if (['pending', 'confirmed', 'processing'].includes(tx.status)) {
        totalPending++
        if (tx.type === 'fiat_to_crypto') {
          pendingSentUsdt += tx.amountUsdt ?? 0
        } else {
          pendingSentPhp += tx.amountUsdt ?? 0
        }
      }
      if (tx.status === 'completed') totalCompleted++
    }

    setSummary({ receivedPhp, sentUsdt, receivedUsdt, sentPhp, totalPending, totalCompleted, count: docs.length, pendingSentUsdt, pendingSentPhp })
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-fetch when preset or type filter changes
  useEffect(() => {
    if (user) fetchSummary(preset, typeFilter)
  }, [user, preset, typeFilter, fetchSummary])

  if (!user || !summary) return null

  const showFiat = typeFilter === 'fiat_to_crypto'
  const showCrypto = typeFilter === 'crypto_to_fiat'
  const showAll = typeFilter === 'all'

  return (
    <div style={{ paddingTop: 16, paddingBottom: 8 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--theme-elevation-500)', fontWeight: 600 }}>
          My Summary
        </span>
        <PresetBar active={preset} onChange={setPreset} />
      </div>

      {/* Cards */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {/* Fiat→Crypto: exchanger receives PHP, sends USDT */}
        {(showAll || showFiat) && (
          <AmountCell label="PHP Received" amount={summary.receivedPhp} isCrypto={false} accent="#16a34a" />
        )}
        {(showAll || showFiat) && (
          <AmountCell label="USDT Sent" amount={summary.sentUsdt} isCrypto={true} accent="#7c3aed" />
        )}

        {/* Crypto→Fiat: exchanger receives USDT, sends PHP */}
        {(showAll || showCrypto) && (
          <AmountCell label="USDT Received" amount={summary.receivedUsdt} isCrypto={true} accent="#16a34a" />
        )}
        {(showAll || showCrypto) && (
          <AmountCell label="PHP Sent" amount={summary.sentPhp} isCrypto={false} accent="#7c3aed" />
        )}

        <CountCard 
          label="Pending" 
          value={summary.totalPending} 
          accent="#f97316" 
          sub={`Sent Pending: ₱${summary.pendingSentPhp.toLocaleString()} | ${summary.pendingSentUsdt.toLocaleString()} USDT`} 
        />
        <CountCard label="Completed" value={summary.totalCompleted} accent="#2563eb" sub={`of ${summary.count} total`} />
      </div>
    </div>
  )
}
