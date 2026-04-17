'use client'

import type { DefaultCellComponentProps } from 'payload'

type RowWithInvoice = {
  invoiceImageProof?: string | null
}

export function InvoiceImagePreviewCell({ cellData, rowData }: DefaultCellComponentProps) {
  const row = rowData as RowWithInvoice
  const raw =
    typeof cellData === 'string'
      ? cellData
      : typeof row.invoiceImageProof === 'string'
        ? row.invoiceImageProof
        : ''

  const url = raw.trim()

  if (!url) {
    return <span style={{ color: 'var(--theme-text-muted, #888)', fontSize: '0.75rem' }}>-</span>
  }

  const openInvoice = (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    // Keep list rows from navigating to detail view when clicking the proof thumbnail.
    event.preventDefault()
    event.stopPropagation()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onClick={openInvoice}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        textDecoration: 'none',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      {}
      {/* next/image requires all external hostnames (S3, CDN) to be whitelisted in
          next.config remotePatterns. Using img here covers both local /media/ paths
          and any S3 URL without extra config. This is admin-only, not a public LCP path. */}
      <img
        src={url}
        alt="Invoice proof"
        title="Click to open full invoice"
        style={{
          width: 46,
          height: 46,
          objectFit: 'cover',
          borderRadius: 6,
          border: '1px solid var(--theme-elevation-200)',
          display: 'block',
        }}
      />
    </button>
  )
}
