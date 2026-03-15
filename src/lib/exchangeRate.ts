/**
 * Exchange Rate API utility
 * Fetches PHP to USD rate from exchangerate-api.com
 * USDT is pegged 1:1 to USD, so PHP/USD rate = PHP/USDT rate
 */

const API_URL = process.env.EXCHANGE_RATE_API_URL || 'https://v6.exchangerate-api.com/v6'
const API_KEY = process.env.EXCHANGE_RATE_API_KEY

interface ExchangeRateResponse {
  result: 'success' | 'error'
  base_code: string
  target_code: string
  conversion_rate: number
  time_last_update_utc: string
  'error-type'?: string
}

export interface ConversionResult {
  rate: number
  amountUsdt: number
  feePercent: number
  feeUsdt: number
  netAmountUsdt: number
  timestamp: string
}

/**
 * Fetches the current PHP to USD (USDT) exchange rate
 * @returns The conversion rate (how many USD per 1 PHP)
 */
export async function getPhpToUsdRate(): Promise<number> {
  if (!API_KEY) {
    throw new Error('EXCHANGE_RATE_API_KEY is not configured')
  }

  const url = `${API_URL}/${API_KEY}/pair/PHP/USD`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Exchange rate API error: ${response.status} ${response.statusText}`)
  }

  const data: ExchangeRateResponse = await response.json()

  if (data.result !== 'success') {
    throw new Error(`Exchange rate API error: ${data['error-type'] || 'Unknown error'}`)
  }

  return data.conversion_rate
}

export interface ExchangeRateMarkup {
  phpToUsdRate: number
  usdToPhpRate: number
}

const DEFAULT_FEE_PERCENT = Number(process.env.EXCHANGE_FEE_PERCENT) || 2

/**
 * Converts PHP amount to USDT using live exchange rate, applying company fee
 * @param amountPhp - The amount in Philippine Peso
 * @param feePercent - Company exchange fee percentage (defaults to env EXCHANGE_FEE_PERCENT or 2%)
 * @returns Conversion result with rate, gross USDT, fee, and net USDT
 */
export async function convertPhpToUsdt(
  amountPhp: number,
  feePercent: number = DEFAULT_FEE_PERCENT,
): Promise<ConversionResult> {
  const rate = await getPhpToUsdRate()
  const amountUsdt = Math.round(amountPhp * rate * 1000000) / 1000000
  const feeUsdt = Math.round(amountUsdt * (feePercent / 100) * 1000000) / 1000000
  const netAmountUsdt = Math.round((amountUsdt - feeUsdt) * 1000000) / 1000000

  return {
    rate,
    amountUsdt,
    feePercent,
    feeUsdt,
    netAmountUsdt,
    timestamp: new Date().toISOString(),
  }
}
