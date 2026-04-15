'use client'
import type { DefaultCellComponentProps } from 'payload'

type RowData = {
  amountUsdtOriginal?: number | null
}

/**
 * List-view cell for `amountUsdtOriginal`.
 * This column is intentionally always rendered in USDT.
 */
export function AmountSentToExchangeUsdtCell({
  cellData,
  rowData,
}: DefaultCellComponentProps) {
  const row = rowData as RowData
  const value = (cellData as number | null | undefined) ?? row.amountUsdtOriginal

  if (value == null) return <span style={{ color: 'var(--theme-text-muted, #888)' }}>—</span>

  const formatted = Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      <span style={{ opacity: 0.6, fontSize: '0.8em', marginRight: 2 }}>USDT</span>
      {formatted}
    </span>
  )
}
