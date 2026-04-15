'use client'

import { CRYPTO_TO_FIAT_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import { useAuth } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'
import { useState } from 'react'
import { createPortal } from 'react-dom'

type SendingRow = {
  id?: number | string
  status?: 'pending' | 'confirmed' | 'processing' | 'completed' | 'failed'
}

export function MarkSendingReceivedCell({ rowData }: DefaultCellComponentProps) {
  const { user } = useAuth()

  const row = rowData as SendingRow
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(
    row.status === 'confirmed' || row.status === 'processing' || row.status === 'completed',
  )
  const [showModal, setShowModal] = useState(false)
  const [txHashInput, setTxHashInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sendingId = row.id
  if (!sendingId) return null

  const isBrowser = typeof window !== 'undefined'

  if (done) {
    return <span style={{ color: 'var(--theme-success-500)', fontSize: '0.8rem' }}>Done</span>
  }

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent default row click navigation so action can run directly in-table.
    event.preventDefault()
    event.stopPropagation()

    setShowModal(true)
    setError(null)
  }

  const handleConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    setLoading(true)
    setError(null)

    const txHash = txHashInput.trim()

    try {
      const res = await fetch(`/api/${CRYPTO_TO_FIAT_COLLECTION_SLUG}/${sendingId}/mark-received`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txHash ? { txHash } : {}),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.message || 'Failed to update')
      }
      setDone(true)
      setShowModal(false)
      if (isBrowser) {
        window.location.reload()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update')
      setLoading(false)
    }
  }

  if (!(user as { roles?: string[] } | null)?.roles?.includes('user')) return null

  return (
    <>
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

      {showModal &&
        isBrowser &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => {
              if (event.target === event.currentTarget && !loading) {
                setShowModal(false)
                setTxHashInput('')
                setError(null)
              }
            }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              padding: '1rem',
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                background: 'var(--theme-bg)',
                border: '1px solid var(--theme-elevation-200)',
                borderRadius: '10px',
                width: '100%',
                maxWidth: '420px',
                padding: '1rem',
                boxShadow: '0 14px 36px rgba(0, 0, 0, 0.2)',
              }}
            >
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Confirm Sending</h4>
              <p style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                Add txHash if available, or confirm without it.
              </p>

              <input
                type="text"
                value={txHashInput}
                placeholder="Enter txHash (optional)"
                onChange={(event) => {
                  setTxHashInput(event.target.value)
                  setError(null)
                }}
                style={{ marginBottom: '0.75rem', width: '100%' }}
              />

              {error && (
                <p
                  style={{
                    margin: '0 0 0.75rem',
                    color: 'var(--theme-error-500)',
                    fontSize: '0.8rem',
                  }}
                >
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    if (loading) return
                    setShowModal(false)
                    setTxHashInput('')
                    setError(null)
                  }}
                  disabled={loading}
                  style={{
                    border: '1px solid var(--theme-elevation-300)',
                    background: 'transparent',
                    borderRadius: '6px',
                    padding: '0.4rem 0.7rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  style={{
                    background: loading ? 'var(--theme-elevation-300)' : 'var(--theme-success-500)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.4rem 0.8rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Submitting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
