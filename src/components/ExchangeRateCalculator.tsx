'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useFormFields, useForm } from '@payloadcms/ui'

interface RateResponse {
  rate: number
  amountPhp: number
  amountUsdt: number
  feePercent: number
  feeUsdt: number
  netAmountUsdt: number
  timestamp: string
}

export function ExchangeRateCalculator() {
  const amountPhp = useFormFields(([fields]) => fields['amountPhp']?.value as number | undefined)
  const { dispatchFields } = useForm()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchRate = useCallback(
    async (php: number) => {
      // Cancel previous in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch(`/api/exchange-rate?amountPhp=${php}`, {
          signal: controller.signal,
        })
        if (!res.ok) return

        const data: RateResponse = await res.json()

        dispatchFields({
          type: 'UPDATE',
          path: 'exchangeRate',
          value: data.rate,
        })
        dispatchFields({
          type: 'UPDATE',
          path: 'amountUsdt',
          value: data.amountUsdt,
        })
        dispatchFields({
          type: 'UPDATE',
          path: 'exchangeFeePercent',
          value: data.feePercent,
        })
        dispatchFields({
          type: 'UPDATE',
          path: 'exchangeFeeUsdt',
          value: data.feeUsdt,
        })
        dispatchFields({
          type: 'UPDATE',
          path: 'netAmountUsdt',
          value: data.netAmountUsdt,
        })
      } catch {
        // Aborted or network error — ignore
      }
    },
    [dispatchFields],
  )

  useEffect(() => {
    if (!amountPhp || amountPhp <= 0) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchRate(amountPhp), 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [amountPhp, fetchRate])

  return null // No UI needed — this component only syncs form fields
}
