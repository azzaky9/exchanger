'use client'

import { useAuth } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type RelatedTransactionRef =
  | string
  | number
  | {
      id?: string | number
      status?: string
      type?: 'fiat_to_crypto' | 'crypto_to_fiat'
      txHash?: string | null
      invoiceImage?: string | number | null
    }
  | null
  | undefined

type OperationRow = {
  transaction?: RelatedTransactionRef
}

type TransactionLite = {
  id: string | number
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

export function ExchangeAdminStatusActionCell({ rowData }: DefaultCellComponentProps) {
  const { user } = useAuth()
  if (!(user as { roles?: string[] } | null)?.roles?.includes('admin')) return null

  const row = rowData as OperationRow
  const transactionRef = row.transaction
  const transactionId = typeof transactionRef === 'object' ? transactionRef?.id : transactionRef

  const initialTransaction: TransactionLite | null =
    transactionId == null
      ? null
      : {
          id: transactionId,
          status: typeof transactionRef === 'object' ? transactionRef?.status : undefined,
          type: typeof transactionRef === 'object' ? transactionRef?.type : undefined,
          txHash: typeof transactionRef === 'object' ? transactionRef?.txHash : undefined,
          invoiceImage:
            typeof transactionRef === 'object' ? transactionRef?.invoiceImage : undefined,
        }

  const [tx, setTx] = useState<TransactionLite | null>(initialTransaction)
  const [loadingTx, setLoadingTx] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const [open, setOpen] = useState(false)
  const [showDoneModal, setShowDoneModal] = useState(false)
  const [txHashInput, setTxHashInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isBrowser = typeof window !== 'undefined'

  useEffect(() => {
    if (!transactionId || (tx?.status && tx?.type)) return

    const run = async () => {
      setLoadingTx(true)
      try {
        const res = await fetch(`/api/transactions/${transactionId}?depth=0`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to load transaction')
        const data = (await res.json()) as {
          id: string | number
          status?: string
          type?: 'fiat_to_crypto' | 'crypto_to_fiat'
          txHash?: string | null
          invoiceImage?: string | number | null
        }

        setTx({
          id: data.id,
          status: data.status,
          type: data.type,
          txHash: data.txHash,
          invoiceImage: data.invoiceImage,
        })
      } catch {
        setError('Failed to load linked transaction status')
      } finally {
        setLoadingTx(false)
      }
    }

    void run()
  }, [transactionId, tx?.status, tx?.type])

  useEffect(() => {
    if (!open || !wrapperRef.current || !isBrowser) return

    const updatePosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPosition({ top: rect.bottom + 6, left: rect.left })
    }

    updatePosition()

    const closeMenu = () => setOpen(false)
    const onResizeScroll = () => updatePosition()
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('click', closeMenu)
    window.addEventListener('resize', onResizeScroll)
    window.addEventListener('scroll', onResizeScroll, true)
    window.addEventListener('keydown', onEscape)

    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('resize', onResizeScroll)
      window.removeEventListener('scroll', onResizeScroll, true)
      window.removeEventListener('keydown', onEscape)
    }
  }, [open, isBrowser])

  if (!transactionId) {
    return <span style={{ color: 'var(--theme-text-muted, #888)', fontSize: '0.75rem' }}>-</span>
  }

  const status = tx?.status
  const txType = tx?.type

  const canConfirmArrival =
    status === 'fiat_received' ||
    status === 'crypto_received' ||
    status === 'confirmed' ||
    status === 'processing'
  const canConfirmDone = status === 'processing' || status === 'confirmed'
  const isCompleted = status === 'completed'

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

    setTx((prev) =>
      prev
        ? {
            ...prev,
            status: typeof data.status === 'string' ? data.status : prev.status,
            ...(extra?.txHash ? { txHash: extra.txHash } : {}),
            ...(extra?.invoiceImage ? { invoiceImage: extra.invoiceImage } : {}),
          }
        : prev,
    )

    setOpen(false)
  }

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

    setLoadingAction(true)
    setError(null)
    try {
      await submitAction('confirm_arrival')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleConfirmDone = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!tx) return

    setLoadingAction(true)
    setError(null)

    try {
      if (txType === 'fiat_to_crypto') {
        const txHash = txHashInput.trim() || (typeof tx.txHash === 'string' ? tx.txHash.trim() : '')
        if (!txHash) {
          throw new Error('txHash is required to complete crypto sending.')
        }

        await submitAction('confirm_done', { txHash })
      } else if (txType === 'crypto_to_fiat') {
        let invoiceImage: string | number | undefined

        if (selectedFile) {
          invoiceImage = await uploadInvoiceImage(selectedFile)
        } else if (typeof tx.invoiceImage === 'string' || typeof tx.invoiceImage === 'number') {
          invoiceImage = tx.invoiceImage
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoadingAction(false)
    }
  }

  if (loadingTx) {
    return <span style={{ color: 'var(--theme-text-muted, #888)', fontSize: '0.75rem' }}>...</span>
  }

  if (!canConfirmArrival && !canConfirmDone && !isCompleted) {
    return <span style={{ color: 'var(--theme-text-muted, #888)', fontSize: '0.75rem' }}>-</span>
  }

  return (
    <div ref={wrapperRef} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        disabled={loadingAction || isCompleted}
        style={{
          background:
            loadingAction || isCompleted
              ? 'var(--theme-elevation-350, var(--theme-elevation-300))'
              : 'linear-gradient(135deg, var(--theme-success-500), var(--theme-success-600))',
          color: 'white',
          border: '1px solid var(--theme-success-700, transparent)',
          borderRadius: '8px',
          padding: '0.4rem 0.65rem',
          fontSize: '0.71rem',
          fontWeight: 600,
          cursor: loadingAction || isCompleted ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <span>{loadingAction ? 'Updating...' : isCompleted ? 'Completed' : 'Status Actions'}</span>
        {!isCompleted && <ChevronIcon open={open} />}
      </button>

      {open &&
        !isCompleted &&
        isBrowser &&
        menuPosition &&
        createPortal(
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 999999,
              minWidth: 188,
              background: 'var(--theme-elevation-0)',
              border: '1px solid var(--theme-elevation-200)',
              borderRadius: '10px',
              boxShadow: '0 14px 30px rgba(0,0,0,0.2)',
              padding: '0.45rem',
            }}
          >
            {canConfirmArrival && (
              <button
                type="button"
                onClick={(event) => void runAction(event, 'confirm_arrival')}
                disabled={loadingAction}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: '8px',
                  border: '1px solid var(--theme-elevation-200)',
                  background: 'transparent',
                  padding: '0.45rem 0.55rem',
                  cursor: loadingAction ? 'not-allowed' : 'pointer',
                  marginBottom: canConfirmDone ? '0.4rem' : 0,
                }}
              >
                Confirm Arrival
              </button>
            )}

            {canConfirmDone && (
              <button
                type="button"
                onClick={(event) => void runAction(event, 'confirm_done')}
                disabled={loadingAction}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: '8px',
                  border: '1px solid var(--theme-elevation-200)',
                  background: 'transparent',
                  padding: '0.45rem 0.55rem',
                  cursor: loadingAction ? 'not-allowed' : 'pointer',
                }}
              >
                Confirm Done
              </button>
            )}
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
              if (event.target === event.currentTarget && !loadingAction) {
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
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Confirm Done</h4>

              {txType === 'fiat_to_crypto' ? (
                <>
                  <p style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    Enter txHash to confirm completion.
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
              ) : txType === 'crypto_to_fiat' ? (
                <>
                  <p style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    Upload invoice image to confirm completion.
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
                    disabled={loadingAction}
                    style={{
                      marginBottom: '0.65rem',
                      border: '1px solid var(--theme-elevation-300)',
                      background: 'transparent',
                      borderRadius: '6px',
                      padding: '0.4rem 0.7rem',
                      cursor: loadingAction ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Choose Invoice File
                  </button>

                  {selectedFile && (
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem' }}>{selectedFile.name}</p>
                  )}
                </>
              ) : null}

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
                    if (loadingAction) return
                    setShowDoneModal(false)
                    setSelectedFile(null)
                    setTxHashInput('')
                    setError(null)
                  }}
                  disabled={loadingAction}
                  style={{
                    border: '1px solid var(--theme-elevation-300)',
                    background: 'transparent',
                    borderRadius: '6px',
                    padding: '0.4rem 0.7rem',
                    cursor: loadingAction ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(event) => void handleConfirmDone(event)}
                  disabled={loadingAction}
                  style={{
                    background: loadingAction
                      ? 'var(--theme-elevation-300)'
                      : 'var(--theme-success-500)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.4rem 0.8rem',
                    cursor: loadingAction ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loadingAction ? 'Submitting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {error && !showDoneModal && (
        <div style={{ marginTop: '0.4rem', color: 'var(--theme-error-500)', fontSize: '0.72rem' }}>
          {error}
        </div>
      )}
    </div>
  )
}
