'use client'
import type { DefaultCellComponentProps } from 'payload'

type RowData = {
  type?: 'fiat_to_crypto' | 'crypto_to_fiat'
  profit?: number | null
  amountUsdtOriginal?: number | null
}

/**
 * List-view cell that displays the profit as a percentage of the reference-rate amount.
 *
 * Formula: (profit / amountUsdtOriginal) × 100
 *
 * Works for both transaction types since profit and amountUsdtOriginal are always
 * expressed in the same currency (USDT for fiat→crypto, PHP for crypto→fiat).
 */
export function ProfitPercentageCell({ rowData }: DefaultCellComponentProps) {
  const row = rowData as RowData
  const profit = row.profit
  const base = row.amountUsdtOriginal

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
