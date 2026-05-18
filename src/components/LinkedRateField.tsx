'use client'

/**
 * LinkedRateField.tsx
 *
 * A Payload CMS custom UI field that renders a paired "Rate ↔ Fees"
 * editor for both exchange directions.
 *
 * It intercepts changes to the fees (spinzoFee, gicFee) and immediately
 * recalculates the final rate on the client side so the admin can see
 * the effect before saving.
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
    gridTemplateColumns: '1fr 1fr',
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

/**
 * Derive final rate from reference - fees.
 *
 * USDT→PHP (crossRefRate undefined): direct subtraction
 *   finalRate = refRate - spinzoFee - gicFee
 *
 * PHP→USDT (crossRefRate = usdtToPhpRefRate): proportional conversion
 *   finalRate = refRate × (1 - totalFee / crossRefRate)
 */
function feesToRate(
  referenceRate: number,
  spinzoFee: number,
  gicFee: number,
  crossRefRate?: number,
): number {
  const totalFee = spinzoFee + gicFee
  if (crossRefRate && crossRefRate > 0) {
    // PHP→USDT: proportional conversion so rate can't go negative
    return round(referenceRate * (1 - totalFee / crossRefRate), 6)
  }
  // USDT→PHP: direct subtraction
  return round(referenceRate - totalFee, 6)
}

// ─── core linked editor ───────────────────────────────────────────────────────

interface LinkedRateEditorProps {
  /** Label shown at the top of the widget */
  heading: string
  /** Payload field path for the ramp reference/original rate */
  referenceFieldPath: string
  /** Payload field path for the final rate, e.g. "usdtToPhpRate" */
  rateFieldPath: string
  /** Human labels */
  referenceLabel: string
  rateLabel: string
  spreadLabel: string
  spreadPctLabel: string
  /** Which `_lastEdited` sentinel value to stamp */
  referenceKey: string
  rateKey: string
  /** Optional spread persistence paths */
  spreadFieldPath?: string
  spreadPctFieldPath?: string
  /** Description of the rate unit */
  rateUnit: string
  /**
   * For PHP→USDT, pass the field path of the USDT→PHP reference rate
   * so fees can be proportionally converted. Leave undefined for USDT→PHP.
   */
  crossReferenceFieldPath?: string
  /** Payload field path for the spinzo fee (per-direction), e.g. 'usdtToPhpSpinzoFee' */
  spinzoFeeFieldPath: string
  /** Payload field path for the gic fee (per-direction), e.g. 'usdtToPhpGicFee' */
  gicFeeFieldPath: string
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
  referenceLabel,
  rateLabel,
  spreadLabel,
  spreadPctLabel,
  referenceKey,
  rateKey,
  spreadFieldPath,
  spreadPctFieldPath,
  rateUnit,
  crossReferenceFieldPath,
  spinzoFeeFieldPath,
  gicFeeFieldPath,
}: LinkedRateEditorProps) {
  const { dispatchFields, setModified } = useForm()
  const { setValue: setLastEdited } = useField<string>({ path: '_lastEdited' })

  // Subscribe to the relevant fields
  const referenceRateField = useFormFields(([fields]) => fields[referenceFieldPath])
  const rateField = useFormFields(([fields]) => fields[rateFieldPath])
  const spinzoFeeField = useFormFields(([fields]) => fields[spinzoFeeFieldPath])
  const gicFeeField = useFormFields(([fields]) => fields[gicFeeFieldPath])
  // For PHP→USDT, we need the USDT→PHP reference rate for proportional conversion
  const crossRefField = useFormFields(([fields]) =>
    crossReferenceFieldPath ? fields[crossReferenceFieldPath] : undefined,
  )

  const referenceRate = Number(referenceRateField?.value ?? 0)
  const rateValue = Number(rateField?.value ?? 0)
  const spinzoFee = Number(spinzoFeeField?.value ?? 0)
  const gicFee = Number(gicFeeField?.value ?? 0)
  const crossRefRate = crossRefField ? Number(crossRefField.value ?? 0) : undefined

  // spread: USDT→PHP uses totalFee directly; PHP→USDT converts proportionally
  const spreadValue = useMemo(() => {
    const totalFee = spinzoFee + gicFee
    if (crossRefRate && crossRefRate > 0) {
      // PHP→USDT: spread = refRate × totalFee / crossRefRate
      return round(referenceRate * totalFee / crossRefRate, 6)
    }
    // USDT→PHP: spread = totalFee
    return round(totalFee, 6)
  }, [spinzoFee, gicFee, referenceRate, crossRefRate])

  // spreadPct: symmetric for both directions = totalFee / usdtToPhpRefRate * 100
  const spreadPctValue = useMemo(() => {
    // For USDT→PHP: totalFee / refRate; for PHP→USDT: totalFee / crossRefRate
    const denominator = crossRefRate && crossRefRate > 0 ? crossRefRate : referenceRate
    if (denominator <= 0) return 0
    return round(((spinzoFee + gicFee) / denominator) * 100, 2)
  }, [referenceRate, crossRefRate, spinzoFee, gicFee])

  // Track which input the user last touched so we don't create feedback loops
  const lastTouched = useRef<'reference' | 'rate' | 'fee' | null>(null)

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

  // Recalculate final rate when reference changes.
  const prevRefRate = useRef(referenceRate)
  useEffect(() => {
    if (referenceRate > 0 && referenceRate !== prevRefRate.current) {
      if (lastTouched.current !== 'rate') {
        const newRate = feesToRate(referenceRate, spinzoFee, gicFee, crossRefRate)
        dispatch(rateFieldPath, newRate)
        setLastEdited(referenceKey)
      }
    }
    prevRefRate.current = referenceRate
  }, [
    referenceRate,
    spinzoFee,
    gicFee,
    crossRefRate,
    rateFieldPath,
    referenceKey,
    dispatch,
    setLastEdited,
  ])

  // Recalculate final rate when fees change.
  const prevFees = useRef({ spinzoFee, gicFee })
  useEffect(() => {
    if (
      referenceRate > 0 &&
      (spinzoFee !== prevFees.current.spinzoFee || gicFee !== prevFees.current.gicFee)
    ) {
      const newRate = feesToRate(referenceRate, spinzoFee, gicFee, crossRefRate)
      dispatch(rateFieldPath, newRate)
      setLastEdited(spinzoFeeFieldPath) // signal fee-driven change
    }
    prevFees.current = { spinzoFee, gicFee }
  }, [referenceRate, spinzoFee, gicFee, crossRefRate, rateFieldPath, dispatch, setLastEdited])

  const handleReferenceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newReference = parseFloat(e.target.value)
      if (isNaN(newReference)) return

      lastTouched.current = 'reference'
      dispatch(referenceFieldPath, newReference)

      if (newReference > 0) {
        const newRate = feesToRate(newReference, spinzoFee, gicFee, crossRefRate)
        dispatch(rateFieldPath, newRate)
      }

      setLastEdited(referenceKey)
    },
    [referenceFieldPath, spinzoFee, gicFee, crossRefRate, rateFieldPath, referenceKey, dispatch, setLastEdited],
  )

  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newRate = parseFloat(e.target.value)
      if (isNaN(newRate)) return
      lastTouched.current = 'rate'

      dispatch(rateFieldPath, newRate)
      setLastEdited(rateKey)
    },
    [rateFieldPath, rateKey, dispatch, setLastEdited],
  )

  const handleSpinzoFeeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFee = parseFloat(e.target.value)
      if (isNaN(newFee)) return
      lastTouched.current = 'fee'

      dispatch(spinzoFeeFieldPath, newFee)

      if (referenceRate > 0) {
        const newRate = feesToRate(referenceRate, newFee, gicFee, crossRefRate)
        dispatch(rateFieldPath, newRate)
      }

      setLastEdited(spinzoFeeFieldPath)
    },
    [referenceRate, gicFee, crossRefRate, rateFieldPath, spinzoFeeFieldPath, dispatch, setLastEdited],
  )

  const handleGicFeeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFee = parseFloat(e.target.value)
      if (isNaN(newFee)) return
      lastTouched.current = 'fee'

      dispatch(gicFeeFieldPath, newFee)

      if (referenceRate > 0) {
        const newRate = feesToRate(referenceRate, spinzoFee, newFee, crossRefRate)
        dispatch(rateFieldPath, newRate)
      }

      setLastEdited(gicFeeFieldPath)
    },
    [referenceRate, spinzoFee, crossRefRate, rateFieldPath, gicFeeFieldPath, dispatch, setLastEdited],
  )

  const handleBlur = useCallback(() => {
    lastTouched.current = null
  }, [])

  const totalFee = round(spinzoFee + gicFee, 6)

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
        {/* Spinzo Fee input */}
        <div style={styles.field}>
          <label style={styles.label}>Spinzo Fee</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={spinzoFee || ''}
            onChange={handleSpinzoFeeChange}
            onBlur={handleBlur}
            placeholder="e.g. 0.50"
            style={styles.input}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--theme-elevation-400)')}
          />
          <span style={styles.hint}>
            Flat fee deducted from the reference rate.
          </span>
        </div>

        {/* GIC Fee input */}
        <div style={styles.field}>
          <label style={styles.label}>GIC Fee</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={gicFee || ''}
            onChange={handleGicFeeChange}
            onBlur={handleBlur}
            placeholder="e.g. 0.50"
            style={styles.input}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--theme-elevation-400)')}
          />
          <span style={styles.hint}>
            Flat fee deducted from the reference rate.
          </span>
        </div>
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

      {referenceRate > 0 && rateValue > 0 && (
        <p style={{ ...styles.hint, marginTop: '10px' }}>
          Total fee: {totalFee} (Spinzo: {spinzoFee} + GIC: {gicFee}) → final rate is {rateValue} (ref: {referenceRate}).
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
      referenceLabel="Reference Rate (1 USDT = ? PHP)"
      rateLabel="Rate (1 USDT = ? PHP)"
      spreadLabel="Profit / Spread (PHP)"
      spreadPctLabel="Spread (%)"
      referenceKey="usdtToPhpReferenceRate"
      rateKey="usdtToPhpRate"
      spreadFieldPath="usdtToPhpSpread"
      spreadPctFieldPath="usdtToPhpSpreadPercentage"
      rateUnit="PHP received per USDT sold"
      spinzoFeeFieldPath="usdtToPhpSpinzoFee"
      gicFeeFieldPath="usdtToPhpGicFee"
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
      referenceLabel="Reference Rate (1 PHP = ? USDT)"
      rateLabel="Rate (1 PHP = ? USDT)"
      spreadLabel="Profit / Spread (USDT)"
      spreadPctLabel="Spread (%)"
      referenceKey="phpToUsdtReferenceRate"
      rateKey="phpToUsdtRate"
      spreadFieldPath="phpToUsdtSpread"
      spreadPctFieldPath="phpToUsdtSpreadPercentage"
      rateUnit="USDT received per PHP spent"
      crossReferenceFieldPath="usdtToPhpReferenceRate"
      spinzoFeeFieldPath="phpToUsdtSpinzoFee"
      gicFeeFieldPath="phpToUsdtGicFee"
    />
  )
}
