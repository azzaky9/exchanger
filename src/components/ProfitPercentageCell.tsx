'use client'
import { useAuth } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'
import type { User } from '@/payload-types'

type RowData = {
  type?: 'fiat_to_crypto' | 'crypto_to_fiat'
  status?: string | null
  profit?: number | null
  amountUsdtOriginal?: number | null
  amountPhp?: number | null
}

/**
 * List-view cell that displays the profit as a percentage of the reference-rate amount.
 *
 * Formula: (profit / baselineUsdt) × 100
 * - fiat_to_crypto baseline: amountUsdtOriginal (already USDT)
 * - crypto_to_fiat baseline: amountPhp (source amount field stores USDT)
 */
export function ProfitPercentageCell({ rowData }: DefaultCellComponentProps) {
  const { user } = useAuth()

  // Hide entirely for non-admin users
  if (!(user as User | null)?.roles?.includes('admin')) return null

  const row = rowData as RowData
  if (row.status !== 'completed') {
    return <span style={{ color: 'var(--theme-text-muted, #888)' }}>—</span>
  }

  const profit = typeof row.profit !== 'undefined' ? row.profit : 0
  const base = row.type === 'crypto_to_fiat' ? row.amountPhp : row.amountUsdtOriginal

  if (profit == null || base == null || base === 0) {
    return <span style={{ color: 'var(--theme-text-muted, #888)' }}>—</span>
  }

  const pct = (profit / base) * 100

  // Color code: green for positive margin, red if somehow negative
  const color = pct >= 0 ? 'var(--theme-success-500, #22c55e)' : 'var(--theme-error-500, #ef4444)'

  return (
    <span
      style={{
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        fontWeight: 600,
        color,
      }}
    >
      {pct.toFixed(2)}%
    </span>
  )
}
