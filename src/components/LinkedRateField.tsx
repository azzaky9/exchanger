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

import { useField, useForm, useFormFields } from '@payloadcms/ui'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'

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

  rowSecondary: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '12px',
    alignItems: 'end',
    marginTop: '10px',
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
    width: '28px',
    height: '28px',
    borderRadius: '999px',
    border: '1px solid var(--theme-elevation-200)',
    background: 'var(--theme-elevation-0)',
    color: 'var(--theme-elevation-500)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
    userSelect: 'none' as const,
  },

  hint: {
    fontSize: '11px',
    color: 'var(--theme-elevation-450)',
    marginTop: '8px',
  },

  stats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '10px',
  } as React.CSSProperties,

  statCard: {
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: '6px',
    padding: '8px 10px',
    background: 'var(--theme-elevation-0)',
  } as React.CSSProperties,

  statLabel: {
    fontSize: '11px',
    color: 'var(--theme-elevation-500)',
    marginBottom: '2px',
  },

  statValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--theme-text)',
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

// Derive final rate from reference + discount markup.
function pctToRate(referenceRate: number, pct: number): number {
  return round(referenceRate * (1 - pct / 100), 6)
}

// Derive markup% from reference and final rate.
function rateToPct(referenceRate: number, rate: number): number {
  if (referenceRate === 0) return 0
  return round((Math.abs(referenceRate - rate) / referenceRate) * 100, 2)
}

// ─── core linked editor ───────────────────────────────────────────────────────

interface LinkedRateEditorProps {
  /** Label shown at the top of the widget */
  heading: string
  /** Payload field path for the ramp reference/original rate */
  referenceFieldPath: string
  /** Payload field path for the final rate, e.g. "usdtToPhpRate" */
  rateFieldPath: string
  /** Payload field path for the markup %, e.g. "usdtToPhpMarkupPercentage" */
  pctFieldPath: string
  /** Human labels */
  referenceLabel: string
  rateLabel: string
  pctLabel: string
  spreadLabel: string
  spreadPctLabel: string
  /** Which `_lastEdited` sentinel value to stamp */
  referenceKey: string
  rateKey: string
  pctKey: string
  /** Optional spread persistence paths */
  spreadFieldPath?: string
  spreadPctFieldPath?: string
  /** Description of the rate unit */
  rateUnit: string
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h12m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LinkedRateEditor({
  heading,
  referenceFieldPath,
  rateFieldPath,
  pctFieldPath,
  referenceLabel,
  rateLabel,
  pctLabel,
  spreadLabel,
  spreadPctLabel,
  referenceKey,
  rateKey,
  pctKey,
  spreadFieldPath,
  spreadPctFieldPath,
  rateUnit,
}: LinkedRateEditorProps) {
  const { dispatchFields, setModified } = useForm()
  const { setValue: setLastEdited } = useField<string>({ path: '_lastEdited' })

  // Subscribe to the three relevant fields
  const referenceRateField = useFormFields(([fields]) => fields[referenceFieldPath])
  const rateField = useFormFields(([fields]) => fields[rateFieldPath])
  const pctField = useFormFields(([fields]) => fields[pctFieldPath])

  const referenceRate = Number(referenceRateField?.value ?? 0)

  const rateValue = Number(rateField?.value ?? 0)
  const pctValue = Number(pctField?.value ?? 0)

  const spreadValue = useMemo(() => {
    if (referenceRate <= 0 || rateValue <= 0) return 0
    return round(Math.abs(referenceRate - rateValue), 6)
  }, [referenceRate, rateValue])

  const spreadPctValue = useMemo(() => {
    if (referenceRate <= 0 || rateValue <= 0) return 0
    return round((spreadValue / referenceRate) * 100, 2)
  }, [referenceRate, rateValue, spreadValue])

  // Track which input the user last touched so we don't create feedback loops
  const lastTouched = useRef<'reference' | 'rate' | 'pct' | null>(null)

  const dispatch = useCallback(
    (path: string, value: number | string) => {
      dispatchFields({ type: 'UPDATE', path, value })
      setModified(true)
    },
    [dispatchFields, setModified],
  )

  // Persist spread fields while editing so server-side values stay in sync.
  useEffect(() => {
    if (spreadFieldPath) dispatch(spreadFieldPath, spreadValue)
    if (spreadPctFieldPath) dispatch(spreadPctFieldPath, spreadPctValue)
  }, [spreadFieldPath, spreadPctFieldPath, spreadValue, spreadPctValue, dispatch])

  // Recalculate dependent value when reference changes.
  const prevRefRate = useRef(referenceRate)
  useEffect(() => {
    if (referenceRate > 0 && referenceRate !== prevRefRate.current) {
      if (lastTouched.current === 'rate') {
        const newPct = rateToPct(referenceRate, rateValue)
        dispatch(pctFieldPath, newPct)
        setLastEdited(rateKey)
      } else {
        const newRate = pctToRate(referenceRate, pctValue)
        dispatch(rateFieldPath, newRate)
        setLastEdited(referenceKey)
      }
    }
    prevRefRate.current = referenceRate
  }, [
    referenceRate,
    rateValue,
    pctValue,
    rateFieldPath,
    pctFieldPath,
    referenceKey,
    rateKey,
    dispatch,
    setLastEdited,
  ])

  const handleReferenceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newReference = parseFloat(e.target.value)
      if (isNaN(newReference)) return

      lastTouched.current = 'reference'
      dispatch(referenceFieldPath, newReference)

      if (newReference > 0) {
        const newRate = pctToRate(newReference, pctValue)
        dispatch(rateFieldPath, newRate)
      }

      setLastEdited(referenceKey)
    },
    [referenceFieldPath, pctValue, rateFieldPath, referenceKey, dispatch, setLastEdited],
  )

  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newRate = parseFloat(e.target.value)
      if (isNaN(newRate)) return
      lastTouched.current = 'rate'

      dispatch(rateFieldPath, newRate)

      if (referenceRate > 0) {
        const newPct = rateToPct(referenceRate, newRate)
        dispatch(pctFieldPath, newPct)
      }

      setLastEdited(rateKey)
    },
    [referenceRate, rateFieldPath, pctFieldPath, rateKey, dispatch, setLastEdited],
  )

  const handlePctChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPct = parseFloat(e.target.value)
      if (isNaN(newPct)) return
      lastTouched.current = 'pct'

      dispatch(pctFieldPath, newPct)

      if (referenceRate > 0) {
        const newRate = pctToRate(referenceRate, newPct)
        dispatch(rateFieldPath, newRate)
      }

      setLastEdited(pctKey)
    },
    [referenceRate, rateFieldPath, pctFieldPath, pctKey, dispatch, setLastEdited],
  )

  const handleBlur = useCallback(() => {
    lastTouched.current = null
  }, [])

  return (
    <div style={styles.wrapper}>
      <div style={styles.heading}>
        {heading}
        {referenceRate > 0 && <span style={styles.badge}>ref: {referenceRate}</span>}
      </div>

      <div style={styles.row}>
        {/* Reference input */}
        <div style={styles.field}>
          <label style={styles.label}>{referenceLabel}</label>
          <input
            type="number"
            step="any"
            value={referenceRate || ''}
            onChange={handleReferenceChange}
            onBlur={handleBlur}
            placeholder="e.g. 56.50"
            style={styles.input}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--theme-elevation-400)')}
          />
          <span style={styles.hint}>Original market/reference for this ramp</span>
        </div>

        <div style={styles.arrow}>
          <ArrowIcon />
        </div>

        {/* Final rate input */}
        <div style={styles.field}>
          <label style={styles.label}>{rateLabel}</label>
          <input
            type="number"
            step="any"
            value={rateValue || ''}
            onChange={handleRateChange}
            onBlur={handleBlur}
            placeholder="e.g. 56.50"
            style={styles.input}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--theme-elevation-400)')}
          />
          <span style={styles.hint}>{rateUnit}</span>
        </div>
      </div>

      <div style={styles.rowSecondary}>
        {/* Rate input */}
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
          <span style={styles.hint}>
            Set the markup percentage to control your profit margin on this rate.
          </span>
        </div>

        <div style={styles.arrow}>
          <ArrowIcon />
        </div>

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>{spreadLabel}</div>
            <div style={styles.statValue}>{spreadValue}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>{spreadPctLabel}</div>
            <div style={styles.statValue}>{spreadPctValue}%</div>
          </div>
        </div>
      </div>

      {referenceRate > 0 && rateValue > 0 && (
        <p style={{ ...styles.hint, marginTop: '10px' }}>
          At {pctValue}% markup: final rate is {rateValue} (market/reference: {referenceRate}).
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
      referenceFieldPath="usdtToPhpReferenceRate"
      rateFieldPath="usdtToPhpRate"
      pctFieldPath="usdtToPhpMarkupPercentage"
      referenceLabel="Reference Rate (1 USDT = ? PHP)"
      rateLabel="Rate (1 USDT = ? PHP)"
      pctLabel="Markup %"
      spreadLabel="Profit / Spread (PHP)"
      spreadPctLabel="Spread (%)"
      referenceKey="usdtToPhpReferenceRate"
      rateKey="usdtToPhpRate"
      pctKey="usdtToPhpMarkupPercentage"
      spreadFieldPath="usdtToPhpSpread"
      spreadPctFieldPath="usdtToPhpSpreadPercentage"
      rateUnit="PHP received per USDT sold"
    />
  )
}

/** Slot for the PHP → USDT linked editor */
export function LinkedRateFieldPhp() {
  return (
    <LinkedRateEditor
      heading="PHP → USDT Pricing"
      referenceFieldPath="phpToUsdtReferenceRate"
      rateFieldPath="phpToUsdtRate"
      pctFieldPath="phpToUsdtMarkupPercentage"
      referenceLabel="Reference Rate (1 PHP = ? USDT)"
      rateLabel="Rate (1 PHP = ? USDT)"
      pctLabel="Markup %"
      spreadLabel="Profit / Spread (USDT)"
      spreadPctLabel="Spread (%)"
      referenceKey="phpToUsdtReferenceRate"
      rateKey="phpToUsdtRate"
      pctKey="phpToUsdtMarkupPercentage"
      spreadFieldPath="phpToUsdtSpread"
      spreadPctFieldPath="phpToUsdtSpreadPercentage"
      rateUnit="USDT received per PHP spent"
    />
  )
}
