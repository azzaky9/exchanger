'use client'

import type { DefaultCellComponentProps } from 'payload'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

function BankIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 9.5L12 4l9 5.5M5 10.5v7m4-7v7m4-7v7m4-7v7M3 20h18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function parseBankDetails(raw: string) {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return null

  let accountName = ''
  let accountNumber = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.toLowerCase().startsWith('account name')) {
      const inline = line.split(':').slice(1).join(':').trim()
      accountName = inline || lines[i + 1] || ''
    }

    if (line.toLowerCase().startsWith('account number')) {
      const inline = line.split(':').slice(1).join(':').trim()
      accountNumber = inline || lines[i + 1] || ''
    }
  }

  return {
    accountName,
    accountNumber,
    raw,
  }
}

export function BankDetailsPopupCell({ cellData }: DefaultCellComponentProps) {
  const [open, setOpen] = useState(false)
  const value = typeof cellData === 'string' ? cellData.trim() : ''

  const parsed = useMemo(() => {
    if (!value) return null
    return parseBankDetails(value)
  }, [value])

  if (!value) {
    return <span style={{ color: 'var(--theme-text-muted, #888)' }}>-</span>
  }

  if (!parsed?.accountName && !parsed?.accountNumber) {
    return <span>{value}</span>
  }

  const isBrowser = typeof window !== 'undefined'

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen(true)
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          border: '1px solid var(--theme-elevation-300)',
          background: 'var(--theme-elevation-0)',
          borderRadius: '6px',
          padding: '0.3rem 0.5rem',
          fontSize: '0.75rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <BankIcon />
        View Bank Details
      </button>

      {open &&
        isBrowser &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false)
            }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              padding: '1rem',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '440px',
                background: 'var(--theme-bg)',
                border: '1px solid var(--theme-elevation-200)',
                borderRadius: '10px',
                padding: '1rem',
                boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  marginBottom: '0.75rem',
                }}
              >
                <BankIcon size={16} />
                <h4 style={{ margin: 0 }}>Bank Account Details</h4>
              </div>

              <div
                style={{
                  background: 'var(--theme-elevation-50)',
                  border: '1px solid var(--theme-elevation-150)',
                  borderRadius: '8px',
                  padding: '0.8rem',
                  marginBottom: '0.8rem',
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.72rem', opacity: 0.7, marginBottom: '0.2rem' }}>
                    Account Name
                  </div>
                  <div style={{ fontWeight: 600 }}>{parsed.accountName || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.7, marginBottom: '0.2rem' }}>
                    Account Number
                  </div>
                  <div style={{ fontWeight: 600 }}>{parsed.accountNumber || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    border: '1px solid var(--theme-elevation-300)',
                    background: 'transparent',
                    borderRadius: '6px',
                    padding: '0.4rem 0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
