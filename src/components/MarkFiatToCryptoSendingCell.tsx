'use client'

import { FIAT_TO_CRYPTO_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import { useAuth } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type FiatToCryptoRow = {
  id?: number | string
  status?: 'pending' | 'confirmed' | 'processing' | 'completed'
}

type MediaCreateResponse = {
  doc?: { id?: number | string }
  id?: number | string
  message?: string
}

type MarkSendingResponse = {
  success?: boolean
  message?: string
}

export function MarkFiatToCryptoSendingCell({ rowData }: DefaultCellComponentProps) {
  const { user } = useAuth()

  const row = rowData as FiatToCryptoRow
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(
    row.status === 'confirmed' || row.status === 'processing' || row.status === 'completed',
  )
  const [showModal, setShowModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recordId = row.id
  if (!recordId) return null

  if (done) {
    return <span style={{ color: 'var(--theme-success-500)', fontSize: '0.8rem' }}>Done</span>
  }

  const uploadInvoiceImage = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append(
      '_payload',
      JSON.stringify({
        alt: `fiat-to-crypto-invoice-${recordId}-${Date.now()}`,
      }),
    )

    const uploadRes = await fetch('/api/media', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    const uploadData = (await uploadRes.json()) as MediaCreateResponse

    if (!uploadRes.ok) {
      throw new Error(uploadData?.message || 'Failed to upload invoice image')
    }

    const mediaId = uploadData?.doc?.id ?? uploadData?.id

    if (typeof mediaId !== 'string' && typeof mediaId !== 'number') {
      throw new Error('Invoice upload succeeded but media id was not returned')
    }

    return mediaId
  }

  const handleConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!selectedFile) {
      setError('Please upload an invoice image before confirming.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const mediaId = await uploadInvoiceImage(selectedFile)

      const res = await fetch(`/api/${FIAT_TO_CRYPTO_COLLECTION_SLUG}/${recordId}/mark-sending`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceImage: mediaId }),
      })

      const data = (await res.json()) as MarkSendingResponse

      if (!res.ok || !data.success) {
        throw new Error(data?.message || 'Failed to mark as sending')
      }

      setDone(true)
      setShowModal(false)
      if (isBrowser) {
        window.location.reload()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as sending')
      setLoading(false)
    }
  }

  const openModal = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setShowModal(true)
    setError(null)
  }

  const closeModal = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (loading) return

    setShowModal(false)
    setSelectedFile(null)
    setError(null)
  }

  const isBrowser = typeof window !== 'undefined'

  if (!(user as { roles?: string[] } | null)?.roles?.includes('user')) return null

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={loading}
        style={{
          background: 'var(--theme-success-500)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '0.35rem 0.6rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          opacity: loading ? 0.7 : 1,
        }}
      >
        Mark as Sending
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
                setSelectedFile(null)
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
                Upload invoice image before confirming this fiat send.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setSelectedFile(file)
                  setError(null)
                }}
                style={{ display: 'none' }}
              />

              <input
                type="text"
                readOnly
                value={selectedFile?.name || ''}
                placeholder="No file selected"
                style={{ marginBottom: '0.75rem', width: '100%' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                style={{
                  marginBottom: '0.75rem',
                  border: '1px solid var(--theme-elevation-300)',
                  background: 'transparent',
                  borderRadius: '6px',
                  padding: '0.4rem 0.7rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Choose Invoice File
              </button>

              {selectedFile && (
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem' }}>{selectedFile.name}</p>
              )}

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
                  onClick={closeModal}
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
                  disabled={loading || !selectedFile}
                  style={{
                    background: loading ? 'var(--theme-elevation-300)' : 'var(--theme-success-500)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.4rem 0.8rem',
                    cursor: loading || !selectedFile ? 'not-allowed' : 'pointer',
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
