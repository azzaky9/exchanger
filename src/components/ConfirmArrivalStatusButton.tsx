'use client'

import { useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type ActionType = 'confirm_arrival' | 'confirm_done'

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
    width="14"
    height="14"
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

export function ConfirmArrivalStatusButton() {
  const { id } = useDocumentInfo()
  const { dispatchFields } = useForm()
  const statusField = useFormFields(([fields]) => fields['status'])
  const typeField = useFormFields(([fields]) => fields['type'])
  const txHashField = useFormFields(([fields]) => fields['txHash'])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [showDoneModal, setShowDoneModal] = useState(false)
  const [txHashInput, setTxHashInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const [localStatus, setLocalStatus] = useState<string | undefined>(
    statusField?.value as string | undefined,
  )

  const currentStatus = localStatus ?? (statusField?.value as string | undefined)
  const txType = typeField?.value as 'fiat_to_crypto' | 'crypto_to_fiat' | undefined
  const existingTxHash = (txHashField?.value as string | undefined)?.trim() || ''

  const canConfirmArrival =
    currentStatus === 'fiat_received' ||
    currentStatus === 'crypto_received' ||
    currentStatus === 'confirmed'
  const canConfirmDone = currentStatus === 'processing' || currentStatus === 'confirmed'
  const isComplete = currentStatus === 'completed'
  const isBrowser = typeof window !== 'undefined'

  useEffect(() => {
    const fieldStatus = statusField?.value as string | undefined
    if (fieldStatus && fieldStatus !== localStatus) {
      setLocalStatus(fieldStatus)
    }
  }, [statusField?.value, localStatus])

  useEffect(() => {
    if (!menuOpen || !triggerRef.current || !isBrowser) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      })
    }

    updatePosition()

    const closeMenu = () => setMenuOpen(false)
    const onResizeOrScroll = () => updatePosition()
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('click', closeMenu)
    window.addEventListener('resize', onResizeOrScroll)
    window.addEventListener('scroll', onResizeOrScroll, true)
    window.addEventListener('keydown', onEscape)

    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('resize', onResizeOrScroll)
      window.removeEventListener('scroll', onResizeOrScroll, true)
      window.removeEventListener('keydown', onEscape)
    }
  }, [menuOpen, isBrowser])

  const uploadInvoiceImage = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append(
      '_payload',
      JSON.stringify({
        alt: `transaction-invoice-${id}-${Date.now()}`,
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
    action: ActionType,
    extra?: { txHash?: string; invoiceImage?: number | string },
  ) => {
    setLoading(true)
    setMessage(null)
    setIsError(false)

    try {
      const res = await fetch(`/api/transactions/${id}/confirm-arrival`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })

      const data = (await res.json()) as ActionResponse

      if (!res.ok || !data.success) {
        throw new Error(data?.message || 'Failed to update status')
      }

      const nextStatus = typeof data.status === 'string' ? data.status : undefined
      if (nextStatus) {
        setLocalStatus(nextStatus)
        dispatchFields({ type: 'UPDATE', path: 'status', value: nextStatus })
      }

      setMessage(data.message || 'Status updated successfully.')
      setMenuOpen(false)
      setPendingAction(null)
      setShowDoneModal(false)
      setSelectedFile(null)
      setTxHashInput('')
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDone = async () => {
    if (txType === 'fiat_to_crypto') {
      const txHash = txHashInput.trim() || existingTxHash
      if (!txHash) {
        setIsError(true)
        setMessage('txHash is required to complete crypto sending.')
        return
      }

      await submitAction('confirm_done', { txHash })
      return
    }

    if (txType === 'crypto_to_fiat') {
      if (!selectedFile) {
        setIsError(true)
        setMessage('Please upload invoice image before Confirm Done.')
        return
      }

      const mediaId = await uploadInvoiceImage(selectedFile)
      await submitAction('confirm_done', { invoiceImage: mediaId })
      return
    }

    await submitAction('confirm_done')
  }

  if (!id) return null

  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <style>{`
        .status-action-trigger {
          transition: transform 160ms ease, box-shadow 220ms ease, filter 180ms ease;
        }

        .status-action-trigger:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: saturate(1.08);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .status-action-menu {
          animation: statusActionMenuIn 190ms cubic-bezier(0.2, 0.7, 0.2, 1);
          transform-origin: top;
          backdrop-filter: blur(6px);
        }

        .status-action-item {
          transition: transform 130ms ease, background-color 160ms ease, border-color 160ms ease;
        }

        .status-action-item:hover:not(:disabled) {
          transform: translateX(2px);
          background: var(--theme-elevation-50);
          border-color: var(--theme-elevation-450);
        }

        .status-action-done-panel {
          animation: statusActionPanelIn 220ms cubic-bezier(0.2, 0.7, 0.2, 1);
          transform-origin: top;
        }

        @keyframes statusActionMenuIn {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes statusActionPanelIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        ref={triggerRef}
        style={{
          padding: '0.6rem',
          border: '1px solid var(--theme-elevation-200)',
          borderRadius: '10px',
          background:
            'linear-gradient(180deg, var(--theme-elevation-0), var(--theme-elevation-50, var(--theme-elevation-0)))',
        }}
      >
        <button
          className="status-action-trigger"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setMenuOpen((open) => !open)
          }}
          disabled={loading || isComplete}
          style={{
            width: '100%',
            background:
              loading || isComplete
                ? 'var(--theme-elevation-350, var(--theme-elevation-300))'
                : 'linear-gradient(135deg, var(--theme-success-500), var(--theme-success-600))',
            color: 'white',
            border: '1px solid var(--theme-success-700, transparent)',
            padding: '0.62rem 0.9rem',
            borderRadius: '8px',
            cursor: loading || isComplete ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: loading || isComplete ? 'none' : '0 6px 14px rgba(0, 0, 0, 0.15)',
          }}
        >
          <span>
            {loading ? 'Updating...' : isComplete ? 'Process Completed' : 'Status Actions'}
          </span>
          <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <ChevronIcon open={menuOpen} />
          </span>
        </button>
      </div>

      {menuOpen &&
        !isComplete &&
        isBrowser &&
        menuPosition &&
        createPortal(
          <div
            className="status-action-menu"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              width: Math.max(menuPosition.width, 200),
              zIndex: 2147483000,
              border: '1px solid var(--theme-elevation-250, var(--theme-elevation-200))',
              borderRadius: '10px',
              padding: '0.45rem',
              background: 'var(--theme-elevation-0)',
              boxShadow: '0 14px 32px rgba(0, 0, 0, 0.24)',
              display: 'grid',
              gap: '0.4rem',
            }}
          >
            <div
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--theme-elevation-500)',
                padding: '0.1rem 0.25rem 0.2rem',
                borderBottom: '1px solid var(--theme-elevation-150)',
                marginBottom: '0.15rem',
              }}
            >
              Workflow Actions
            </div>

            <button
              className="status-action-item"
              type="button"
              onClick={() => submitAction('confirm_arrival')}
              disabled={loading || !canConfirmArrival}
              style={{
                border: '1px solid var(--theme-elevation-300)',
                background:
                  loading || !canConfirmArrival ? 'var(--theme-elevation-100)' : 'transparent',
                borderRadius: '7px',
                padding: '0.5rem 0.65rem',
                fontSize: '0.75rem',
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
              className="status-action-item"
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setPendingAction('confirm_done')
                setShowDoneModal(true)
              }}
              disabled={loading || !canConfirmDone}
              style={{
                border: '1px solid var(--theme-elevation-300)',
                background:
                  loading || !canConfirmDone ? 'var(--theme-elevation-100)' : 'transparent',
                borderRadius: '7px',
                padding: '0.5rem 0.65rem',
                fontSize: '0.75rem',
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

      {pendingAction === 'confirm_done' &&
        !isComplete &&
        showDoneModal &&
        isBrowser &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => {
              if (event.target === event.currentTarget && !loading) {
                setShowDoneModal(false)
                setPendingAction(null)
                setSelectedFile(null)
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
              zIndex: 2147483600,
              padding: '1rem',
            }}
          >
            <div
              className="status-action-done-panel"
              onClick={(event) => event.stopPropagation()}
              style={{
                background: 'var(--theme-bg)',
                border: '1px solid var(--theme-elevation-200)',
                borderRadius: '10px',
                width: '100%',
                maxWidth: '430px',
                padding: '1rem',
                boxShadow: '0 14px 36px rgba(0, 0, 0, 0.2)',
                display: 'grid',
                gap: '0.55rem',
              }}
            >
              <h4 style={{ margin: 0 }}>Confirm Done</h4>

              {txType === 'fiat_to_crypto' && (
                <>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.82rem' }}>
                    Include transaction hash to complete crypto sending.
                  </p>
                  <input
                    type="text"
                    placeholder="Enter txHash"
                    value={txHashInput}
                    onChange={(event) => setTxHashInput(event.target.value)}
                    style={{
                      border: '1px solid var(--theme-elevation-300)',
                      borderRadius: '7px',
                      padding: '0.48rem 0.62rem',
                    }}
                  />
                </>
              )}

              {txType === 'crypto_to_fiat' && (
                <>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.82rem' }}>
                    Upload invoice image to complete bank sending.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setSelectedFile(file)
                    }}
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    style={{
                      border: '1px solid var(--theme-elevation-300)',
                      background: 'transparent',
                      borderRadius: '7px',
                      padding: '0.5rem 0.72rem',
                      fontSize: '0.75rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Choose Invoice Image
                  </button>

                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--theme-text-muted)' }}>
                    {selectedFile ? selectedFile.name : 'Invoice image is required.'}
                  </p>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDoneModal(false)
                    setPendingAction(null)
                    setSelectedFile(null)
                    setTxHashInput('')
                  }}
                  disabled={loading}
                  style={{
                    border: '1px solid var(--theme-elevation-300)',
                    background: 'transparent',
                    borderRadius: '7px',
                    padding: '0.48rem 0.72rem',
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
                    border: 'none',
                    background:
                      'linear-gradient(135deg, var(--theme-success-500), var(--theme-success-600))',
                    color: 'white',
                    borderRadius: '7px',
                    padding: '0.48rem 0.82rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit Confirm Done'}
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
            fontSize: '0.75rem',
            lineHeight: 1.4,
          }}
        >
          {message}
        </p>
      )}
    </div>
  )
}
