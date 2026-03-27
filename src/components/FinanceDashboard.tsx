'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type Preset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'

interface KPIs {
  profitUsdt: number
  profitPhp: number
  volumePhp: number
  volumeUsdt: number
  totalTx: number
  completed: number
  pending: number
  pendingSentUsdt: number
  pendingSentPhp: number
}

interface ChartPoint {
  date: string
  profitUsdt: number
  profitPhp: number
}

interface RecentTx {
  id: number
  orderId: string | null
  type: string
  status: string
  amountPhp: number | null
  amountUsdt: number | null
  profit: number | null
  createdAt: string
}

interface SummaryData {
  kpis: KPIs
  chartData: ChartPoint[]
  recent: RecentTx[]
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page: {
    padding: '32px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  heading: { fontSize: '32px', fontWeight: 700, color: 'var(--theme-text)', marginBottom: '4px' },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    background: 'var(--theme-elevation-100)',
    color: 'var(--theme-text)',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.15s',
    cursor: 'pointer',
    border: '1px solid var(--theme-elevation-200)',
  },
  subheading: { fontSize: '15px', color: 'var(--theme-elevation-500)', marginBottom: '32px' },

  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginBottom: '28px',
    padding: '14px 18px',
    background: 'var(--theme-elevation-50)',
    borderRadius: '8px',
    border: '1px solid var(--theme-elevation-150)',
  },

  presetBtn: (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '6px',
    border: active ? '1.5px solid #16a34a' : '1px solid var(--theme-elevation-200)',
    background: active ? '#16a34a15' : 'transparent',
    color: active ? '#16a34a' : 'var(--theme-text)',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),

  dateInput: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid var(--theme-elevation-200)',
    background: 'var(--theme-elevation-0)',
    color: 'var(--theme-text)',
    fontSize: '13px',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  } as React.CSSProperties,

  card: (accent: string): React.CSSProperties => ({
    background: 'var(--theme-elevation-50)',
    border: `1px solid var(--theme-elevation-150)`,
    borderTop: `3px solid ${accent}`,
    borderRadius: '8px',
    padding: '18px 20px',
  }),

  cardLabel: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
    color: 'var(--theme-elevation-500)',
    marginBottom: '6px',
  },

  cardValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--theme-text)',
    lineHeight: 1.1,
  },

  cardSub: {
    fontSize: '11px',
    color: 'var(--theme-elevation-450)',
    marginTop: '4px',
  },

  section: {
    marginBottom: '32px',
  },

  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--theme-elevation-600)',
    marginBottom: '14px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },

  chartWrapper: {
    background: 'var(--theme-elevation-50)',
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: '8px',
    padding: '20px',
    overflowX: 'auto' as const,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  },

  th: {
    textAlign: 'left' as const,
    padding: '8px 12px',
    borderBottom: '2px solid var(--theme-elevation-150)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--theme-elevation-500)',
    whiteSpace: 'nowrap' as const,
  },

  td: {
    padding: '9px 12px',
    borderBottom: '1px solid var(--theme-elevation-100)',
    color: 'var(--theme-text)',
    verticalAlign: 'middle' as const,
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | null, decimals = 4) =>
  n == null
    ? '—'
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals })

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    completed: '#16a34a',
    pending: '#ca8a04',
    confirmed: '#2563eb',
    processing: '#7c3aed',
    refunded: '#64748b',
    review_needed: '#dc2626',
  }
  return m[s] ?? '#64748b'
}

const typeBadge = (t: string) => (t === 'fiat_to_crypto' ? 'Fiat→Crypto' : 'Crypto→Fiat')

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function BarChart({ data }: { data: ChartPoint[] }) {
  const W = Math.max(data.length * 48, 500)
  const H = 180
  const isEmpty = !data.length
  const PAD = { top: 16, right: 16, bottom: 36, left: 52 }
  const innerH = H - PAD.top - PAD.bottom
  const innerW = W - PAD.left - PAD.right
  const maxVal = Math.max(...data.map((d) => d.profitUsdt + d.profitPhp), 0.001)
  const barW = Math.max((innerW / data.length) * 0.4, 8)

  const yLabel = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
    return v.toFixed(2)
  }

  const ticks = 4
  return (
    <svg width={W} height={H} style={{ display: 'block', minWidth: W }}>
      {/* Y grid lines + labels */}
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = PAD.top + innerH - (i / ticks) * innerH
        const val = (i / ticks) * maxVal
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={y}
              y2={y}
              stroke="var(--theme-elevation-150)"
              strokeDasharray="4 3"
            />
            <text
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="var(--theme-elevation-500)"
            >
              {yLabel(val)}
            </text>
          </g>
        )
      })}

      {isEmpty && (
        <text
          x={PAD.left + innerW / 2}
          y={PAD.top + innerH / 2}
          textAnchor="middle"
          fontSize={12}
          fill="var(--theme-elevation-400)"
        >
          No data for this period
        </text>
      )}

      {/* Bars */}
      {data.map((d, i) => {
        const slotW = innerW / data.length
        const cx = PAD.left + slotW * i + slotW / 2

        const hUsdt = (d.profitUsdt / maxVal) * innerH
        const hPhp = (d.profitPhp / maxVal) * innerH

        const label =
          data.length <= 31
            ? d.date.slice(5)
            : i % Math.ceil(data.length / 12) === 0
              ? d.date.slice(0, 7)
              : ''

        return (
          <g key={d.date}>
            {/* USDT profit bar (green) */}
            {d.profitUsdt > 0 && (
              <rect
                x={cx - barW - 1}
                y={PAD.top + innerH - hUsdt}
                width={barW}
                height={hUsdt}
                rx={2}
                fill="#16a34a"
                opacity={0.85}
              >
                <title>
                  USDT Profit: {d.profitUsdt} on {d.date}
                </title>
              </rect>
            )}
            {/* PHP profit bar (blue) */}
            {d.profitPhp > 0 && (
              <rect
                x={cx + 1}
                y={PAD.top + innerH - hPhp}
                width={barW}
                height={hPhp}
                rx={2}
                fill="#2563eb"
                opacity={0.8}
              >
                <title>
                  PHP Profit: {d.profitPhp} on {d.date}
                </title>
              </rect>
            )}
            {/* X label */}
            {label && (
              <text
                x={cx}
                y={H - PAD.bottom + 14}
                textAnchor="middle"
                fontSize={9}
                fill="var(--theme-elevation-500)"
              >
                {label}
              </text>
            )}
          </g>
        )
      })}

      {/* Legend */}
      <rect x={PAD.left} y={H - 10} width={8} height={8} rx={1} fill="#16a34a" opacity={0.85} />
      <text x={PAD.left + 12} y={H - 3} fontSize={9} fill="var(--theme-elevation-600)">
        USDT Profit (fiat→crypto)
      </text>
      <rect
        x={PAD.left + 130}
        y={H - 10}
        width={8}
        height={8}
        rx={1}
        fill="#2563eb"
        opacity={0.8}
      />
      <text x={PAD.left + 144} y={H - 3} fontSize={9} fill="var(--theme-elevation-600)">
        PHP Profit (crypto→fiat)
      </text>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FinanceDashboardView() {
  const [preset, setPreset] = useState<Preset>('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<SummaryData | null>(null)
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async (p: Preset, f: string, t: string, st: string, ty: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (p === 'custom') {
        if (f) params.set('from', f)
        if (t) params.set('to', t)
      } else {
        params.set('preset', p)
      }
      if (st !== 'all') params.set('status', st)
      if (ty !== 'all') params.set('type', ty)

      const res = await fetch(`/api/transactions/finance-summary?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_(preset, from, to, status, type)
  }, [preset, status, type]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePreset = (p: Preset) => {
    setPreset(p)
  }
  const handleCustomApply = () => {
    setPreset('custom')
    fetch_('custom', from, to, status, type)
  }

  const PRESETS: { label: string; value: Preset }[] = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
    { label: 'All Time', value: 'all' },
  ]

  const kpis = data?.kpis
  const cards = kpis
    ? [
        {
          label: 'Profit (USDT)',
          value: `${fmt(kpis.profitUsdt)} USDT`,
          sub: 'Fiat → Crypto transactions',
          accent: '#16a34a',
        },
        {
          label: 'Profit (PHP)',
          value: `₱${fmt(kpis.profitPhp, 2)}`,
          sub: 'Crypto → Fiat transactions',
          accent: '#2563eb',
        },
        {
          label: 'Volume PHP',
          value: `₱${fmt(kpis.volumePhp, 2)}`,
          sub: 'Total PHP received/sent',
          accent: '#7c3aed',
        },
        {
          label: 'Volume USDT',
          value: `${fmt(kpis.volumeUsdt)} USDT`,
          sub: 'Total USDT received/sent',
          accent: '#0891b2',
        },
        {
          label: 'Completed',
          value: kpis.completed.toLocaleString(),
          sub: `of ${kpis.totalTx} total`,
          accent: '#ca8a04',
        },
        {
          label: 'In Progress',
          value: kpis.pending.toLocaleString(),
          sub: `Sent Pending: ₱${fmt(kpis.pendingSentPhp, 2)} | ${fmt(kpis.pendingSentUsdt)} USDT`,
          accent: '#f97316',
        },
      ]
    : []

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
        <Link href="/admin" style={s.backLink}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </Link>
        <h1 style={{ ...s.heading, marginBottom: 0 }}>Finance Overview</h1>
      </div>
      <p style={s.subheading}>Transaction profit & volume summary — admin only</p>

      {/* Filter bar */}
      <div style={s.filterBar}>
        {PRESETS.map((p) => (
          <button
            key={p.value}
            style={s.presetBtn(preset === p.value)}
            onClick={() => handlePreset(p.value)}
          >
            {p.label}
          </button>
        ))}
        <span style={{ color: 'var(--theme-elevation-300)', margin: '0 4px' }}>|</span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={s.dateInput}
        />
        <span style={{ color: 'var(--theme-elevation-400)', fontSize: '12px' }}>to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={s.dateInput} />
        <button style={s.presetBtn(preset === 'custom')} onClick={handleCustomApply}>
          Apply
        </button>

        <span style={{ color: 'var(--theme-elevation-300)', margin: '0 4px' }}>|</span>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ ...s.dateInput, minWidth: '120px' }}
        >
          <option value="all">All Types</option>
          <option value="fiat_to_crypto">Fiat → Crypto</option>
          <option value="crypto_to_fiat">Crypto → Fiat</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ ...s.dateInput, minWidth: '120px' }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="review_needed">Review Needed</option>
        </select>
      </div>

      {loading && (
        <p style={{ color: 'var(--theme-elevation-500)', marginBottom: '24px' }}>Loading…</p>
      )}
      {error && <p style={{ color: '#dc2626', marginBottom: '24px' }}>Error: {error}</p>}

      {/* KPI Cards */}
      {!loading && kpis && (
        <div style={s.grid}>
          {cards.map((c) => (
            <div key={c.label} style={s.card(c.accent)}>
              <div style={s.cardLabel}>{c.label}</div>
              <div style={s.cardValue}>{c.value}</div>
              <div style={s.cardSub}>{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {!loading && data && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Daily Profit Breakdown</div>
          <div style={s.chartWrapper}>
            <BarChart data={data.chartData} />
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {!loading && data && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Recent Transactions</div>
          <div
            style={{
              background: 'var(--theme-elevation-50)',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={s.table}>
              <thead>
                <tr>
                  {['Order ID', 'Type', 'Status', 'Received', 'Sent', 'Profit', 'Created'].map(
                    (h) => (
                      <th key={h} style={s.th}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.recent.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        ...s.td,
                        textAlign: 'center',
                        color: 'var(--theme-elevation-400)',
                        padding: '24px',
                      }}
                    >
                      No transactions in this period
                    </td>
                  </tr>
                ) : (
                  data.recent.map((tx) => (
                    <tr
                      key={tx.id}
                      style={{ transition: 'background 0.1s' }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'var(--theme-elevation-100)')
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      <td style={s.td}>
                        <code style={{ fontSize: '11px', opacity: 0.75 }}>
                          {tx.orderId?.slice(0, 8) ?? tx.id}
                        </code>
                      </td>
                      <td style={s.td}>
                        <span
                          style={{
                            fontSize: '12px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: tx.type === 'fiat_to_crypto' ? '#d1fae5' : '#dbeafe',
                            color: tx.type === 'fiat_to_crypto' ? '#065f46' : '#1e40af',
                            fontWeight: 600,
                          }}
                        >
                          {typeBadge(tx.type)}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span
                          style={{
                            fontSize: '12px',
                            color: statusColor(tx.status),
                            fontWeight: 600,
                          }}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' as const }}>
                        {tx.type === 'fiat_to_crypto'
                          ? `₱${fmt(tx.amountPhp, 2)}`
                          : `${fmt(tx.amountPhp, 6)} USDT`
                        }
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' as const }}>
                        {tx.type === 'fiat_to_crypto'
                          ? `${fmt(tx.amountUsdt, 6)} USDT`
                          : `₱${fmt(tx.amountUsdt, 2)}`}
                      </td>
                      <td
                        style={{
                          ...s.td,
                          textAlign: 'right' as const,
                          color: (tx.profit ?? 0) >= 0 ? '#16a34a' : '#dc2626',
                          fontWeight: 600,
                        }}
                      >
                        {tx.profit != null
                          ? tx.type === 'fiat_to_crypto'
                            ? `${fmt(tx.profit)} USDT`
                            : `₱${fmt(tx.profit, 2)}`
                          : '—'}
                      </td>
                      <td
                        style={{ ...s.td, fontSize: '12px', color: 'var(--theme-elevation-500)' }}
                      >
                        {new Date(tx.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
