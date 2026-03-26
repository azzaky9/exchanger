'use client'
import type { DefaultCellComponentProps } from 'payload'

type RowData = {
  type?: 'fiat_to_crypto' | 'crypto_to_fiat'
  amountPhp?: number | null
}

/**
 * List-view cell for the `amountPhp` field.
 *
 * - fiat_to_crypto → shows the PHP amount the customer sends  (e.g. "₱ 5,800.00")
 * - crypto_to_fiat → shows the USDT amount the customer sends (e.g. "100.00 USDT")
 */
export function AmountSentCell({ cellData, rowData }: DefaultCellComponentProps) {
  const row = rowData as RowData
  const value = (cellData as number | null | undefined) ?? row.amountPhp

  if (value == null) return <span style={{ color: 'var(--theme-text-muted, #888)' }}>—</span>

  const isCryptoToFiat = row.type === 'crypto_to_fiat'
  const formatted = Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {isCryptoToFiat ? (
        <>
          <span style={{ opacity: 0.6, fontSize: '0.8em', marginRight: 2 }}>USDT</span>
          {formatted}
        </>
      ) : (
        <>
          <span style={{ opacity: 0.6, fontSize: '0.8em', marginRight: 2 }}>₱</span>
          {formatted}
        </>
      )}
    </span>
  )
}
