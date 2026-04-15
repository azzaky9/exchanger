'use client'

import type { DefaultCellComponentProps } from 'payload'

type StatusValue = string | null | undefined

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  pending: {
    bg: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.42)',
    text: '#b45309',
  },
  confirmed: {
    bg: 'rgba(37, 99, 235, 0.14)',
    border: 'rgba(37, 99, 235, 0.4)',
    text: '#1d4ed8',
  },
  processing: {
    bg: 'rgba(124, 58, 237, 0.14)',
    border: 'rgba(124, 58, 237, 0.4)',
    text: '#6d28d9',
  },
  completed: {
    bg: 'rgba(22, 163, 74, 0.14)',
    border: 'rgba(22, 163, 74, 0.4)',
    text: '#15803d',
  },
  failed: {
    bg: 'rgba(220, 38, 38, 0.14)',
    border: 'rgba(220, 38, 38, 0.4)',
    text: '#b91c1c',
  },
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function StatusBadgeCell({ cellData, rowData }: DefaultCellComponentProps) {
  const raw = (cellData ??
    (rowData as { status?: string | null } | undefined)?.status) as StatusValue
  const status = (typeof raw === 'string' ? raw : '').trim().toLowerCase()

  if (!status) {
    return <span style={{ color: 'var(--theme-text-muted, #888)', fontSize: '0.75rem' }}>-</span>
  }

  const style = STATUS_STYLES[status] ?? {
    bg: 'var(--theme-elevation-100)',
    border: 'var(--theme-elevation-250)',
    text: 'var(--theme-text)',
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.55rem',
        borderRadius: 6,
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.text,
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {formatStatusLabel(status)}
    </span>
  )
}
