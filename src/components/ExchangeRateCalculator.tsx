'use client'
import { useEffect, useRef } from 'react'
import { useFormFields, useForm } from '@payloadcms/ui'

/**
 * Computes amountPhp and profit in real-time as admin fills in exchangeRate and markup.
 * Formula: amountPhp = (amountUsdt × exchangeRate) + markup
 * Profit = markup (fixed fee)
 */
export function ExchangeRateCalculator() {
  const amountUsdt = useFormFields(([fields]) => fields['amountUsdt']?.value as number | undefined)
  const exchangeRate = useFormFields(
    ([fields]) => fields['exchangeRate']?.value as number | undefined,
  )
  const markup = useFormFields(([fields]) => fields['markup']?.value as number | undefined)
  const { dispatchFields } = useForm()
  const prevRef = useRef<{ php: number; profit: number } | null>(null)

  useEffect(() => {
    if (!amountUsdt || !exchangeRate || exchangeRate <= 0) return

    const fee = markup ?? 0
    const basePhp = Math.round(amountUsdt * exchangeRate * 100) / 100
    const php = Math.round((basePhp + fee) * 100) / 100
    const profit = Math.round(fee * 100) / 100

    if (prevRef.current?.php === php && prevRef.current?.profit === profit) return
    prevRef.current = { php, profit }

    dispatchFields({
      type: 'UPDATE',
      path: 'amountPhp',
      value: php,
    })
    dispatchFields({
      type: 'UPDATE',
      path: 'profit',
      value: profit,
    })
  }, [amountUsdt, exchangeRate, markup, dispatchFields])

  return null
}
