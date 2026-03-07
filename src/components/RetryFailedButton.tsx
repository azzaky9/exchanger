'use client'
import { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

export function RetryFailedButton() {
  const { id } = useDocumentInfo()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  if (!id) return null

  const handleRetry = async () => {
    if (!confirm('Are you sure you want to retry all failed transactions in this batch?')) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch(`/api/batches/${id}/retry`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      setResult(data)

      if (data.success) {
        // Reload the page after a short delay to reflect updated statuses
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'An error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <button
        type="button"
        onClick={handleRetry}
        disabled={loading}
        style={{
          backgroundColor: loading ? 'var(--theme-elevation-400)' : 'var(--theme-error-500)',
          color: 'white',
          border: 'none',
          padding: '0.6rem 1.2rem',
          borderRadius: 'var(--border-radius-m)',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        {loading ? 'Retrying...' : 'Retry Failed Transactions'}
      </button>
      {result && (
        <p
          style={{
            marginTop: '0.5rem',
            color: result.success ? 'var(--theme-success-500)' : 'var(--theme-error-500)',
            fontSize: '0.85rem',
          }}
        >
          {result.message}
        </p>
      )}
    </div>
  )
}
