'use client'

import { useAuth } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'
import { ExchangeAdminStatusActionCell } from './ExchangeAdminStatusActionCell'
import { MarkSendingReceivedCell } from './MarkSendingReceivedCell'

export function ExchangeActionCryptoToFiatCell(props: DefaultCellComponentProps) {
  const { user } = useAuth()
  const roles = (user as { roles?: string[] } | null)?.roles ?? []

  if (roles.includes('admin')) {
    return <ExchangeAdminStatusActionCell {...props} />
  }

  if (roles.includes('user')) {
    return <MarkSendingReceivedCell {...props} />
  }

  return null
}
