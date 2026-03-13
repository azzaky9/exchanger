'use client'
import { useEffect, useRef } from 'react'
import { useFormFields, useForm } from '@payloadcms/ui'

/**
 * Computes amountPhp and profit in real-time as admin fills in exchangeRate and markup.
 * Formula: amountPhp = (amountUsdt × exchangeRate) + markup
 * Profit = markup (fixed fee)
 */
export function ExchangeRateCalculator() {
  const amountPhp = useFormFields(([fields]) => fields['amountPhp']?.value as number | undefined)
  const exchangeRateId = useFormFields(
    ([fields]) => fields['exchangeRate']?.value as string | undefined,
  )
  const txType = useFormFields(([fields]) => fields['type']?.value as string | undefined)
  const { dispatchFields } = useForm()
  const prevRef = useRef<{ usdtOriginal: number; usdt: number; profit: number } | null>(null)

  useEffect(() => {
    if (!amountPhp || !exchangeRateId) return

    // Fetch the exchange rate document from the API
    const fetchRate = async () => {
      try {
        const res = await fetch(`/api/exchange-rates/${exchangeRateId}`)
        if (!res.ok) return
        const rateDoc = await res.json()

        const originalRate = rateDoc.originalExchangeRate as number
        const markupRate = rateDoc.markupExchangeRate as number

        if (originalRate > 0 && markupRate > 0) {
          const usdtOriginal = amountPhp * originalRate
          const usdtFinal = amountPhp * markupRate

          const computedUsdtOriginal = Math.round(usdtOriginal * 1000000) / 1000000
          const computedUsdtFinal = Math.round(usdtFinal * 1000000) / 1000000
          
          let computedProfit = 0
          if (txType === 'crypto_to_fiat') {
            computedProfit = Math.round((usdtFinal - usdtOriginal) * 1000000) / 1000000
          } else {
            computedProfit = Math.round((usdtOriginal - usdtFinal) * 1000000) / 1000000
          }

          // Prevent infinite loops / too many rerenders
          if (
            prevRef.current?.usdtOriginal === computedUsdtOriginal &&
            prevRef.current?.usdt === computedUsdtFinal &&
            prevRef.current?.profit === computedProfit
          ) {
            return
          }
          prevRef.current = {
            usdtOriginal: computedUsdtOriginal,
            usdt: computedUsdtFinal,
            profit: computedProfit,
          }

          // Dispatch visual updates to the form fields
          dispatchFields({
            type: 'UPDATE',
            path: 'amountUsdtOriginal',
            value: computedUsdtOriginal,
          })
          dispatchFields({
            type: 'UPDATE',
            path: 'amountUsdt',
            value: computedUsdtFinal,
          })
          dispatchFields({
            type: 'UPDATE',
            path: 'profit',
            value: computedProfit,
          })
        }
      } catch (err) {
        console.error('Error fetching exchange rate:', err)
      }
    }

    fetchRate()
  }, [amountPhp, exchangeRateId, txType, dispatchFields])

  return null
}
