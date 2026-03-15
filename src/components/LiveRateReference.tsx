'use client'
import { useEffect, useState } from 'react'

export function LiveRateReference() {
  const [liveRate, setLiveRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLiveRate() {
      try {
        const response = await fetch('/api/exchange-rates/live')
        if (!response.ok) {
          throw new Error('Failed to fetch live API rate')
        }
        const data = await response.json()
        console.log('[LiveRateReference] Fetched live rate:', data)
        if (data.phpToUsdRate) {
          setLiveRate(data.phpToUsdRate)
        } else {
          throw new Error(data.error || 'Unknown error')
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLiveRate()
  }, [])

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-100)',
        borderRadius: '4px',
        marginBottom: '1rem',
      }}
    >
      <p
        style={{ margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <span style={{ fontSize: '18px' }}>🌐</span> Live Exchange Rate API Reference:
      </p>
      <div style={{ marginTop: '8px' }}>
        {loading && (
          <span style={{ color: 'var(--theme-elevation-400)' }}>Fetching latest rate...</span>
        )}
        {error && <span style={{ color: 'var(--theme-error-400)' }}>⚠️ Error: {error}</span>}
        {liveRate && (
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
            1 USDT = {liveRate.toFixed(4)} PHP
          </span>
        )}
      </div>
      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--theme-elevation-400)' }}>
        This rate is pulled directly from the global exchange rate API and is provided for reference
        only. Please input the final rates manually below.
      </p>
    </div>
  )
}
