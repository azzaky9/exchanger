'use client'
import type { DefaultCellComponentProps } from 'payload'

type RowData = {
  type?: 'fiat_to_crypto' | 'crypto_to_fiat'
  amountUsdt?: number | null
}

/**
 * List-view cell for the `amountUsdt` field (the computed "total to send/receive").
 *
 * - fiat_to_crypto → shows USDT received by customer (e.g. "1.72 USDT")
 * - crypto_to_fiat → shows PHP received by customer  (e.g. "₱ 5,750.00")
 */
export function AmountReceivedCell({ cellData, rowData }: DefaultCellComponentProps) {
  const row = rowData as RowData
  const value = (cellData as number | null | undefined) ?? row.amountUsdt

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
          <span style={{ opacity: 0.6, fontSize: '0.8em', marginRight: 2 }}>₱</span>
          {formatted}
        </>
      ) : (
        <>
          <span style={{ opacity: 0.6, fontSize: '0.8em', marginRight: 2 }}>USDT</span>
          {formatted}
        </>
      )}
    </span>
  )
}
