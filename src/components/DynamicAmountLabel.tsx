'use client'
import { useFormFields } from '@payloadcms/ui'

function DynamicLabel({
  fiatLabel,
  cryptoLabel,
  staticLabel,
  required,
}: {
  fiatLabel: string
  cryptoLabel: string
  /** Shown in the list/table column header (no form context). Falls back to fiatLabel if omitted. */
  staticLabel?: string
  required?: boolean
}) {
  const typeField = useFormFields(([fields]) => fields['type'])

  // typeField is undefined when there is no form context (e.g. list/table column header).
  // In any form (create or edit), 'type' always has at minimum its defaultValue.
  const inFormContext = typeField !== undefined
  const txType = typeField?.value as string | undefined

  let label: string
  if (!inFormContext) {
    // List / table view → use the neutral static label
    label = staticLabel ?? fiatLabel
  } else {
    label = txType === 'crypto_to_fiat' ? cryptoLabel : fiatLabel
  }

  return (
    <label
      style={{
        display: 'block',
        marginBottom: '4px',
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
      {required && <span style={{ color: 'var(--theme-error-500)', marginLeft: '4px' }}>*</span>}
    </label>
  )
}

/** Amount field — form: "Total Received (₱ Peso)" ↔ "Total Received (USDT)" | table: static label */
export function AmountLabel() {
  return (
    <DynamicLabel
      fiatLabel="Total Received (₱ Peso)"
      cryptoLabel="Total Received (USDT)"
      staticLabel="Total Received"
      required
    />
  )
}

/** Original-rate field — form: dynamic currency | table: static label */
export function AmountOriginalLabel() {
  return (
    <DynamicLabel
      fiatLabel="Amount sent (Original Rate) - USDT"
      cryptoLabel="Amount sent (Original Rate) - ₱"
      staticLabel="Original Rate (USDT/₱)"
    />
  )
}

/** Final amount field — form: dynamic currency | table: static label */
export function AmountFinalLabel() {
  return (
    <DynamicLabel
      fiatLabel="Total Amount sent (USDT)"
      cryptoLabel="Total Amount sent (₱ Peso)"
      staticLabel="Total Amount sent"
    />
  )
}

/** Profit field — form: "Profit (USDT)" ↔ "Profit (₱ Peso)" | table: static label */
export function ProfitLabel() {
  return (
    <DynamicLabel fiatLabel="Profit (USDT)" cryptoLabel="Profit (₱ Peso)" staticLabel="Profit" />
  )
}
