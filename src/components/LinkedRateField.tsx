'use client'

/**
 * LinkedRateField.tsx
 *
 * A Payload CMS custom UI field that renders a paired "Rate ↔ Percentage"
 * editor for both exchange directions.
 *
 * It intercepts changes to either the rate or the markup percentage and
 * immediately recalculates the sibling field on the client side so the
 * admin can see the effect before saving.
 *
 * It also stamps `_lastEdited` onto the form so the `beforeChange` hook
 * knows which field was the source of truth.
 *
 * Usage (collection config):
 *   { name: 'usdtToPhpRateGroup', type: 'ui', admin: { components: { Field: '/components/LinkedRateField#LinkedRateField' } } }
 *   { name: 'phpToUsdtRateGroup', type: 'ui', admin: { components: { Field: '/components/LinkedRateField#LinkedRateFieldPhp' } } }
 */

import React, { useCallback, useEffect, useRef } from 'react'
import { useField, useFormFields, useForm } from '@payloadcms/ui'

// ─── shared styles ────────────────────────────────────────────────────────────

const styles = {
  wrapper: {
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: '6px',
    padding: '16px 20px',
    marginBottom: '16px',
    background: 'var(--theme-elevation-50)',
  } as React.CSSProperties,

  heading: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--theme-elevation-500)',
    marginBottom: '12px',
  },

  row: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '12px',
    alignItems: 'end',
  } as React.CSSProperties,

  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },

  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--theme-elevation-700)',
  },

  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '4px',
    border: '1px solid var(--theme-elevation-200)',
    background: 'var(--theme-input-bg, var(--theme-elevation-0))',
    color: 'var(--theme-text)',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s',
  } as React.CSSProperties,

  arrow: {
    fontSize: '18px',
    color: 'var(--theme-elevation-400)',
    paddingBottom: '8px',
    userSelect: 'none' as const,
  },

  hint: {
    fontSize: '11px',
    color: 'var(--theme-elevation-450)',
    marginTop: '8px',
  },

  badge: {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '3px',
    marginLeft: '6px',
    verticalAlign: 'middle',
    background: 'var(--theme-success-100, #d1fae5)',
    color: 'var(--theme-success-700, #065f46)',
  },
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function round(n: number, decimals: number) {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

/**
 * Derive the display rate from referenceRate + markup%.
 * "discount" direction: rate = reference × (1 - pct/100)
 */
function pctToRate(referenceRate: number, pct: number): number {
  return round(referenceRate * (1 - pct / 100), 6)
}

/**
 * Derive markup% from referenceRate and the actual rate.
 */
function rateToPct(referenceRate: number, rate: number): number {
  if (referenceRate === 0) return 0
  return round((Math.abs(referenceRate - rate) / referenceRate) * 100, 2)
}

// ─── core linked editor ───────────────────────────────────────────────────────

interface LinkedRateEditorProps {
  /** Label shown at the top of the widget */
  heading: string
  /** Payload field path for the rate, e.g. "usdtToPhpRate" */
  rateFieldPath: string
  /** Payload field path for the markup %, e.g. "usdtToPhpMarkupPercentage" */
  pctFieldPath: string
  /** Human labels */
  rateLabel: string
  pctLabel: string
  /** Which `_lastEdited` sentinel value to stamp */
  rateKey: string
  pctKey: string
  /** Description of the rate unit */
  rateUnit: string
  /**
   * When true, the effective reference rate used for markup calculations is
   * 1/referenceRate.  This is needed for the PHP→USDT side where the market
   * rate is expressed as "USDT per 1 PHP" = 1/(USDT per PHP reference).
   */
  invertRate?: boolean
}

function LinkedRateEditor({
  heading,
  rateFieldPath,
  pctFieldPath,
  rateLabel,
  pctLabel,
  rateKey,
  pctKey,
  rateUnit,
  invertRate = false,
}: LinkedRateEditorProps) {
  const { dispatchFields, setModified } = useForm()

  // Subscribe to the three relevant fields
  const referenceRateField = useFormFields(([fields]) => fields['referenceRate'])
  const rateField = useFormFields(([fields]) => fields[rateFieldPath])
  const pctField = useFormFields(([fields]) => fields[pctFieldPath])

  const rawReferenceRate = Number(referenceRateField?.value ?? 0)
  // The effective reference rate for this side's math
  const effectiveRef = invertRate && rawReferenceRate > 0 ? 1 / rawReferenceRate : rawReferenceRate

  const rateValue = Number(rateField?.value ?? 0)
  const pctValue = Number(pctField?.value ?? 0)

  // Track which input the user last touched so we don't create feedback loops
  const lastTouched = useRef<'rate' | 'pct' | null>(null)

  const dispatch = useCallback(
    (path: string, value: number | string) => {
      dispatchFields({ type: 'UPDATE', path, value })
      setModified(true)
    },
    [dispatchFields, setModified],
  )

  // ── When referenceRate changes, re-derive the rate from the current pct ──
  const prevRefRate = useRef(effectiveRef)
  useEffect(() => {
    if (
      effectiveRef > 0 &&
      effectiveRef !== prevRefRate.current &&
      lastTouched.current !== 'rate'
    ) {
      const newRate = pctToRate(effectiveRef, pctValue)
      dispatch(rateFieldPath, newRate)
      dispatch('_lastEdited', rateKey)
    }
    prevRefRate.current = effectiveRef
  }, [effectiveRef]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newRate = parseFloat(e.target.value)
      if (isNaN(newRate)) return
      lastTouched.current = 'rate'

      dispatch(rateFieldPath, newRate)

      if (effectiveRef > 0) {
        const newPct = rateToPct(effectiveRef, newRate)
        dispatch(pctFieldPath, newPct)
      }

      dispatch('_lastEdited', rateKey)
    },
    [effectiveRef, rateFieldPath, pctFieldPath, rateKey, dispatch],
  )

  const handlePctChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPct = parseFloat(e.target.value)
      if (isNaN(newPct)) return
      lastTouched.current = 'pct'

      dispatch(pctFieldPath, newPct)

      if (effectiveRef > 0) {
        const newRate = pctToRate(effectiveRef, newPct)
        dispatch(rateFieldPath, newRate)
      }

      dispatch('_lastEdited', pctKey)
    },
    [effectiveRef, rateFieldPath, pctFieldPath, pctKey, dispatch],
  )

  const handleBlur = useCallback(() => {
    lastTouched.current = null
  }, [])

  return (
    <div style={styles.wrapper}>
      <div style={styles.heading}>
        {heading}
        {rawReferenceRate > 0 && <span style={styles.badge}>ref: {rawReferenceRate} PHP</span>}
      </div>

      <div style={styles.row}>
        {/* Rate input */}
        <div style={styles.field}>
          <label style={styles.label}>{rateLabel}</label>
          <input
            type="number"
            step="any"
            value={rateValue || ''}
            onChange={handleRateChange}
            onBlur={handleBlur}
            placeholder={invertRate ? 'e.g. 0.01754' : 'e.g. 56.50'}
            style={styles.input}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--theme-elevation-400)')}
          />
          <span style={styles.hint}>{rateUnit}</span>
        </div>

        <div style={styles.arrow}>⇄</div>

        {/* Percentage input */}
        <div style={styles.field}>
          <label style={styles.label}>{pctLabel}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={pctValue || ''}
            onChange={handlePctChange}
            onBlur={handleBlur}
            placeholder="e.g. 2.5"
            style={styles.input}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--theme-elevation-400)')}
          />
          <span style={styles.hint}>% discount from reference rate</span>
        </div>
      </div>

      {effectiveRef > 0 && rateValue > 0 && (
        <p style={{ ...styles.hint, marginTop: '10px' }}>
          At {pctValue}% markup:{' '}
          {invertRate
            ? `1 PHP → ${rateValue} USDT (market: ${round(effectiveRef, 6)} USDT)`
            : `1 USDT → ${rateValue} PHP (market: ${rawReferenceRate} PHP)`}
        </p>
      )}
    </div>
  )
}

// ─── exported Payload UI field components ────────────────────────────────────

/** Slot for the USDT → PHP linked editor */
export function LinkedRateField() {
  return (
    <LinkedRateEditor
      heading="USDT → PHP Pricing"
      rateFieldPath="usdtToPhpRate"
      pctFieldPath="usdtToPhpMarkupPercentage"
      rateLabel="Rate (1 USDT = ? PHP)"
      pctLabel="Markup %"
      rateKey="usdtToPhpRate"
      pctKey="usdtToPhpMarkupPercentage"
      rateUnit="PHP received per USDT sold"
    />
  )
}

/** Slot for the PHP → USDT linked editor */
export function LinkedRateFieldPhp() {
  return (
    <LinkedRateEditor
      heading="PHP → USDT Pricing"
      rateFieldPath="phpToUsdtRate"
      pctFieldPath="phpToUsdtMarkupPercentage"
      rateLabel="Rate (1 PHP = ? USDT)"
      pctLabel="Markup %"
      rateKey="phpToUsdtRate"
      pctKey="phpToUsdtMarkupPercentage"
      rateUnit="USDT received per PHP spent"
      invertRate
    />
  )
}
