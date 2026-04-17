'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type FilterValue = 'all' | 'fiat_to_crypto' | 'crypto_to_fiat'

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Fiat → Crypto', value: 'fiat_to_crypto' },
  { label: 'Crypto → Fiat', value: 'crypto_to_fiat' },
]

export const TransactionTypeFilter: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const getActiveFromUrl = useCallback((): FilterValue => {
    const val = searchParams.get('where[type][equals]')
    if (val === 'fiat_to_crypto' || val === 'crypto_to_fiat') return val
    return 'all'
  }, [searchParams])

  // Keep local state in sync with URL — this prevents the glitch
  const [selected, setSelected] = useState<FilterValue>(getActiveFromUrl)

  useEffect(() => {
    setSelected(getActiveFromUrl())
  }, [searchParams, getActiveFromUrl])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as FilterValue

      // Update local state immediately so the select label is correct right away
      setSelected(value)

      const params = new URLSearchParams(searchParams.toString())
      params.delete('where[type][equals]')
      params.delete('page')

      if (value !== 'all') {
        params.set('where[type][equals]', value)
      }

      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  return (
    <div style={styles.wrapper}>
      <label htmlFor="type-filter" style={styles.label}>
        Transaction Type
      </label>
      <select id="type-filter" value={selected} onChange={handleChange} style={styles.select}>
        {FILTER_OPTIONS.map(({ label, value }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 0 6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--theme-elevation-500, #6b7280)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
  },
  select: {
    fontSize: '13px',
    fontWeight: 500,
    padding: '5px 10px',
    borderRadius: '6px',
    border: '1.5px solid var(--theme-elevation-200, #e5e7eb)',
    background: 'var(--theme-elevation-0, #fff)',
    color: 'var(--theme-elevation-800, #1f2937)',
    cursor: 'pointer',
    outline: 'none',
  },
}
