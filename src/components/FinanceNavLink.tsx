'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@payloadcms/ui'

export function FinanceNavLink() {
  const { user } = useAuth()
  const pathname = usePathname()

  // Admin only
  if (!(user as { roles?: string[] } | null)?.roles?.includes('admin')) return null

  const active = pathname === '/admin/finance'

  return (
    <Link
      href="/admin/finance"
      className={['nav__link', active && 'nav__link--active'].filter(Boolean).join(' ')}
      style={{ textDecoration: 'none' }}
    >
      Summary
    </Link>
  )
}
