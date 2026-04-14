'use client'

import { CRYPTO_TO_FIAT_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import type { DefaultCellComponentProps } from 'payload'
import { useState } from 'react'

type SendingRow = {
  id?: number | string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
}

export function MarkSendingReceivedCell({ rowData }: DefaultCellComponentProps) {
  const row = rowData as SendingRow
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(row.status === 'completed')

  const sendingId = row.id
  if (!sendingId) return null

  if (done) {
    return <span style={{ color: 'var(--theme-success-500)', fontSize: '0.8rem' }}>Done</span>
  }

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent default row click navigation so action can run directly in-table.
    event.preventDefault()
    event.stopPropagation()

    setLoading(true)
    try {
      const res = await fetch(`/api/${CRYPTO_TO_FIAT_COLLECTION_SLUG}/${sendingId}/mark-received`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.message || 'Failed to update')
      }
      setDone(true)
      setTimeout(() => window.location.reload(), 500)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        background: loading ? 'var(--theme-elevation-300)' : 'var(--theme-success-500)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        padding: '0.35rem 0.6rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? 'Updating...' : 'Confirm Sending'}
    </button>
  )
}
