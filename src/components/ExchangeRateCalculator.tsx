'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useFormFields, useForm } from '@payloadcms/ui'

interface RateDoc {
  referenceRate: number
  usdtToPhpRate: number
  phpToUsdtRate: number
}

/**
 * Invisible calculator component mounted in the Transaction edit view.
 *
 * Strategy:
 *  - Fetch + cache the rate document whenever `exchangeRateId` changes (not on every keystroke).
 *  - Debounce (400 ms) the recomputation whenever `amountPhp` or `type` changes so the
 *    Calculated and Total fields update in real-time as the user types, without flooding the API.
 */
export function ExchangeRateCalculator() {
  const amountPhp = useFormFields(([fields]) => fields['amountPhp']?.value as number | undefined)
  const exchangeRateId = useFormFields(
    ([fields]) => fields['exchangeRate']?.value as string | undefined,
  )
  const txType = useFormFields(([fields]) => fields['type']?.value as string | undefined)
  const { dispatchFields } = useForm()

  // Cache the fetched rate doc so amount changes don't trigger API calls
  const cachedRate = useRef<RateDoc | null>(null)
  const prevRef = useRef<{ usdtOriginal: number; usdt: number; profit: number } | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Effect 1: fetch rate doc when exchange rate selection changes ──────────
  useEffect(() => {
    if (!exchangeRateId) {
      cachedRate.current = null
      return
    }

    const fetchRate = async () => {
      try {
        const res = await fetch(`/api/exchange-rates/${exchangeRateId}`)
        if (!res.ok) return
        const doc = await res.json()
        cachedRate.current = {
          referenceRate: doc.referenceRate as number,
          usdtToPhpRate: doc.usdtToPhpRate as number,
          phpToUsdtRate: doc.phpToUsdtRate as number,
        }
      } catch (err) {
        console.error('[ExchangeRateCalculator] Failed to fetch rate:', err)
      }
    }

    fetchRate()
  }, [exchangeRateId])

  // ── Effect 2: debounced recalculation whenever amount or type changes ─────
  const compute = useCallback(() => {
    const rate = cachedRate.current
    if (!rate || !amountPhp || amountPhp <= 0) return

    const { referenceRate, usdtToPhpRate, phpToUsdtRate } = rate

    let usdtOriginal = 0
    let usdtFinal = 0
    let profit = 0

    if (txType === 'crypto_to_fiat') {
      // User inputs USDT → compute PHP they receive at each rate
      // amountOriginal field = PHP at reference rate (display only)
      // amountUsdt field     = PHP the user actually receives at markup rate
      usdtOriginal = amountPhp * referenceRate   // USDT × (PHP/USDT) = PHP
      usdtFinal    = amountPhp * usdtToPhpRate   // USDT × (PHP/USDT) = PHP
      profit       = usdtOriginal - usdtFinal    // admin keeps the spread
    } else {
      // fiat_to_crypto: user inputs PHP → compute USDT they receive at each rate
      usdtOriginal = amountPhp / referenceRate   // PHP ÷ (PHP/USDT) = USDT
      usdtFinal    = amountPhp * phpToUsdtRate   // PHP × (USDT/PHP) = USDT
      profit       = usdtOriginal - usdtFinal    // admin keeps the spread
    }

    const computedUsdtOriginal = Math.round(usdtOriginal * 1_000_000) / 1_000_000
    const computedUsdtFinal = Math.round(usdtFinal * 1_000_000) / 1_000_000
    const computedProfit = Math.round(profit * 1_000_000) / 1_000_000

    // Skip dispatch if nothing changed to avoid re-render loops
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

    dispatchFields({ type: 'UPDATE', path: 'amountUsdtOriginal', value: computedUsdtOriginal })
    dispatchFields({ type: 'UPDATE', path: 'amountUsdt', value: computedUsdtFinal })
    dispatchFields({ type: 'UPDATE', path: 'profit', value: computedProfit })
  }, [amountPhp, txType, dispatchFields])

  useEffect(() => {
    // Clear any pending debounce
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    // Schedule recalculation 400 ms after the user stops typing
    debounceTimer.current = setTimeout(() => {
      compute()
    }, 400)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [compute])

  return null
}
