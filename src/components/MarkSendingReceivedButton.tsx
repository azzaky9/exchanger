'use client'

import { CRYPTO_TO_FIAT_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'
import { createPortal } from 'react-dom'

export function MarkSendingReceivedButton() {
  const { id } = useDocumentInfo()
  const statusField = useFormFields(([fields]) => fields['status'])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [txHashInput, setTxHashInput] = useState('')

  const status = statusField?.value as string | undefined
  const isDone = status === 'confirmed' || status === 'processing' || status === 'completed'
  const isBrowser = typeof window !== 'undefined'

  if (!id) return null

  const handleClick = async () => {
    setShowModal(true)
    setMessage(null)
    setIsError(false)
  }

  const handleConfirm = async () => {
    setLoading(true)
    setMessage(null)
    setIsError(false)

    const txHash = txHashInput.trim()

    try {
      const res = await fetch(`/api/${CRYPTO_TO_FIAT_COLLECTION_SLUG}/${id}/mark-received`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txHash ? { txHash } : {}),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data?.message || 'Failed to update status')
      }

      setMessage(data.message || 'Status updated successfully.')
      setShowModal(false)
      setTxHashInput('')
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
        disabled={loading || isDone}
        style={{
          backgroundColor:
            loading || isDone ? 'var(--theme-elevation-400)' : 'var(--theme-success-500)',
          color: 'white',
          border: 'none',
          padding: '0.6rem 1.1rem',
          borderRadius: 'var(--border-radius-m)',
          cursor: loading || isDone ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        {loading ? 'Updating...' : isDone ? 'Sending Confirmed' : 'Confirm Sending'}
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
                onChange={(event) => setTxHashInput(event.target.value)}
                style={{ marginBottom: '0.75rem', width: '100%' }}
              />

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (loading) return
                    setShowModal(false)
                    setTxHashInput('')
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
