'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useState } from 'react'

export function MarkSendingReceivedButton() {
  const { id } = useDocumentInfo()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  if (!id) return null

  const handleClick = async () => {
    setLoading(true)
    setMessage(null)
    setIsError(false)

    try {
      const res = await fetch(`/api/sending/${id}/mark-received`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data?.message || 'Failed to update status')
      }

      setMessage(data.message || 'Status updated successfully.')
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          backgroundColor: loading ? 'var(--theme-elevation-400)' : 'var(--theme-success-500)',
          color: 'white',
          border: 'none',
          padding: '0.6rem 1.1rem',
          borderRadius: 'var(--border-radius-m)',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        {loading ? 'Updating...' : 'Confirm Sending'}
      </button>

      {message && (
        <p
          style={{
            marginTop: '0.5rem',
            color: isError ? 'var(--theme-error-500)' : 'var(--theme-success-500)',
            fontSize: '0.85rem',
          }}
        >
          {message}
        </p>
      )}
    </div>
  )
}
