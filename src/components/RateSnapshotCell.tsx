'use client'

import type { DefaultCellComponentProps } from 'payload'

export function RateSnapshotCell({ cellData }: DefaultCellComponentProps) {
  const value = cellData as number | null | undefined

  if (value == null) {
    return <span style={{ color: 'var(--theme-text-muted, #888)' }}>-</span>
  }

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })}
    </span>
  )
}
