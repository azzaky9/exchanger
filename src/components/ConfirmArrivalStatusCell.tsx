'use client'

import type { DefaultCellComponentProps } from 'payload'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type TransactionRow = {
  id?: number | string
  status?: string
  type?: 'fiat_to_crypto' | 'crypto_to_fiat'
  txHash?: string | null
  invoiceImage?: string | number | null
}

type ActionResponse = {
  success?: boolean
  message?: string
  status?: string
}

type MediaCreateResponse = {
  doc?: { id?: number | string }
  id?: number | string
  message?: string
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 180ms ease',
      flexShrink: 0,
    }}
  >
    <path
      d="M6 9L12 15L18 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const StatusDotIcon = ({ color }: { color: string }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="5" cy="5" r="4" fill={color} />
  </svg>
)

export function ConfirmArrivalStatusCell({ rowData }: DefaultCellComponentProps) {
  const row = rowData as TransactionRow
  const transactionId = row.id
  const [localStatus, setLocalStatus] = useState<string | undefined>(row.status)
  const status = localStatus ?? row.status
  const txType = row.type

  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [showDoneModal, setShowDoneModal] = useState(false)
  const [txHashInput, setTxHashInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isBrowser = typeof window !== 'undefined'

  if (!transactionId) return null

  const canConfirmArrival =
    status === 'fiat_received' || status === 'crypto_received' || status === 'confirmed'
  const canConfirmDone = status === 'processing' || status === 'confirmed'
  const isCompleted = status === 'completed'

  if (!canConfirmArrival && !canConfirmDone && !isCompleted) {
    return <span style={{ color: 'var(--theme-text-muted, #888)', fontSize: '0.75rem' }}>-</span>
  }

  const uploadInvoiceImage = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append(
      '_payload',
      JSON.stringify({
        alt: `transaction-row-invoice-${transactionId}-${Date.now()}`,
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

  const submitAction = async (
    action: 'confirm_arrival' | 'confirm_done',
    extra?: { txHash?: string; invoiceImage?: number | string },
  ) => {
    const res = await fetch(`/api/transactions/${transactionId}/confirm-arrival`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })

    const data = (await res.json()) as ActionResponse
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to update status')
    }

    if (typeof data.status === 'string') {
      setLocalStatus(data.status)
    }

    setOpen(false)
  }

  useEffect(() => {
    if (!open || !wrapperRef.current || !isBrowser) return

    const updatePosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return

      setMenuPosition({
        top: rect.bottom + 6,
        left: rect.left,
      })
    }

    updatePosition()

    const handleClose = () => setOpen(false)
    const handleResize = () => updatePosition()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('scroll', handleResize, true)
    window.addEventListener('resize', handleResize)
    window.addEventListener('click', handleClose)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('scroll', handleResize, true)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('click', handleClose)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open, isBrowser])

  const runAction = async (
    event: React.MouseEvent<HTMLButtonElement>,
    action: 'confirm_arrival' | 'confirm_done',
  ) => {
    event.preventDefault()
    event.stopPropagation()

    if (action === 'confirm_done') {
      setShowDoneModal(true)
      setError(null)
      return
    }

    setLoading(true)

    try {
      await submitAction(action)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  const handleConfirmDone = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    setLoading(true)
    setError(null)

    try {
      if (txType === 'fiat_to_crypto') {
        const txHash =
          txHashInput.trim() || (typeof row.txHash === 'string' ? row.txHash.trim() : '')
        if (!txHash) {
          throw new Error('txHash is required to complete crypto sending.')
        }

        await submitAction('confirm_done', { txHash })
      } else if (txType === 'crypto_to_fiat') {
        let invoiceImage: string | number | undefined

        if (selectedFile) {
          invoiceImage = await uploadInvoiceImage(selectedFile)
        } else if (typeof row.invoiceImage === 'string' || typeof row.invoiceImage === 'number') {
          invoiceImage = row.invoiceImage
        }

        if (!invoiceImage) {
          throw new Error('Invoice image is required to complete bank sending.')
        }

        await submitAction('confirm_done', { invoiceImage })
      } else {
        await submitAction('confirm_done')
      }

      setShowDoneModal(false)
      setSelectedFile(null)
      setTxHashInput('')
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
      setLoading(false)
    }
  }

  return (
    <div ref={wrapperRef} onClick={(event) => event.stopPropagation()}>
      <style>{`
        .tx-status-action-trigger {
          transition: transform 150ms ease, box-shadow 220ms ease, filter 180ms ease;
        }

        .tx-status-action-trigger:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: saturate(1.06);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.18);
        }

        .tx-status-action-menu {
          animation: txStatusMenuIn 180ms cubic-bezier(0.2, 0.7, 0.2, 1);
          transform-origin: top;
          backdrop-filter: blur(6px);
        }

        .tx-status-action-item {
          transition: transform 130ms ease, background-color 160ms ease, border-color 160ms ease;
        }

        .tx-status-action-item:hover:not(:disabled) {
          transform: translateX(2px);
          background: var(--theme-elevation-50);
          border-color: var(--theme-elevation-450);
        }

        @keyframes txStatusMenuIn {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <button
        className="tx-status-action-trigger"
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        disabled={loading || isCompleted}
        style={{
          background:
            loading || isCompleted
              ? 'var(--theme-elevation-350, var(--theme-elevation-300))'
              : 'linear-gradient(135deg, var(--theme-success-500), var(--theme-success-600))',
          color: 'white',
          border: '1px solid var(--theme-success-700, transparent)',
          borderRadius: '8px',
          padding: '0.4rem 0.65rem',
          fontSize: '0.71rem',
          fontWeight: 600,
          cursor: loading || isCompleted ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: loading || isCompleted ? 'none' : '0 4px 10px rgba(0, 0, 0, 0.12)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <span>{loading ? 'Updating...' : isCompleted ? 'Completed' : 'Status Actions'}</span>
        {!isCompleted && <ChevronIcon open={open} />}
      </button>

      {open &&
        !isCompleted &&
        isBrowser &&
        menuPosition &&
        createPortal(
          <div
            className="tx-status-action-menu"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 2147483000,
              width: 190,
              background: 'var(--theme-elevation-0)',
              border: '1px solid var(--theme-elevation-250, var(--theme-elevation-200))',
              borderRadius: '10px',
              padding: '0.4rem',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.22)',
              display: 'grid',
              gap: '0.35rem',
            }}
          >
            <div
              style={{
                fontSize: '0.64rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--theme-elevation-500)',
                padding: '0.08rem 0.22rem 0.2rem',
                borderBottom: '1px solid var(--theme-elevation-150)',
                marginBottom: '0.1rem',
              }}
            >
              Workflow Actions
            </div>

            <button
              className="tx-status-action-item"
              type="button"
              onClick={(event) => runAction(event, 'confirm_arrival')}
              disabled={loading || !canConfirmArrival}
              style={{
                border: '1px solid var(--theme-elevation-300)',
                background:
                  loading || !canConfirmArrival ? 'var(--theme-elevation-100)' : 'transparent',
                borderRadius: '7px',
                padding: '0.42rem 0.55rem',
                fontSize: '0.72rem',
                textAlign: 'left',
                cursor: loading || !canConfirmArrival ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <StatusDotIcon color="var(--theme-success-500)" />
                <span>Confirm Arrival</span>
              </span>
            </button>
            <button
              className="tx-status-action-item"
              type="button"
              onClick={(event) => runAction(event, 'confirm_done')}
              disabled={loading || !canConfirmDone}
              style={{
                border: '1px solid var(--theme-elevation-300)',
                background:
                  loading || !canConfirmDone ? 'var(--theme-elevation-100)' : 'transparent',
                borderRadius: '7px',
                padding: '0.42rem 0.55rem',
                fontSize: '0.72rem',
                textAlign: 'left',
                cursor: loading || !canConfirmDone ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <StatusDotIcon color="var(--theme-success-600)" />
                <span>Confirm Done</span>
              </span>
            </button>
          </div>,
          document.body,
        )}

      {showDoneModal &&
        isBrowser &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => {
              if (event.target === event.currentTarget && !loading) {
                setShowDoneModal(false)
                setSelectedFile(null)
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
              zIndex: 2147483600,
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
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Confirm Done</h4>

              {txType === 'fiat_to_crypto' && (
                <>
                  <p style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    Include txHash to complete crypto sending.
                  </p>
                  <input
                    type="text"
                    value={txHashInput}
                    placeholder="Enter txHash"
                    onChange={(event) => {
                      setTxHashInput(event.target.value)
                      setError(null)
                    }}
                    style={{ marginBottom: '0.75rem', width: '100%' }}
                  />
                </>
              )}

              {txType === 'crypto_to_fiat' && (
                <>
                  <p style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    Upload invoice image to complete bank sending.
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
                    Choose Invoice Image
                  </button>

                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem' }}>
                    {selectedFile
                      ? selectedFile.name
                      : typeof row.invoiceImage === 'string' || typeof row.invoiceImage === 'number'
                        ? 'Using existing invoice image'
                        : 'No invoice selected'}
                  </p>
                </>
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
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    if (loading) return
                    setShowDoneModal(false)
                    setSelectedFile(null)
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
                  onClick={handleConfirmDone}
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
    </div>
  )
}
