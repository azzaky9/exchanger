import { CRYPTO_TO_FIAT_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import type { CollectionConfig } from 'payload'
import { markSendingReceivedEndpoint } from '../endpoints/markSendingReceived'

const formatBankDetails = (raw?: string | null) => {
  const value = raw?.trim()
  if (!value) return null

  // New format is already multiline and readable.
  if (value.includes('\n')) return value

  // Backward compatibility for older comma-separated format.
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return value

  return parts.join('\n')
}

export const Sending: CollectionConfig = {
  slug: CRYPTO_TO_FIAT_COLLECTION_SLUG,
  labels: {
    singular: 'Crypto-to-Fiat',
    plural: 'Crypto-to-Fiat',
  },
  endpoints: [markSendingReceivedEndpoint],
  admin: {
    useAsTitle: 'id',
    components: {
      beforeListTable: [
        '/components/ExchangeOperationsSummaryBanner#ExchangeOperationsSummaryBanner',
        '/components/ListRowClickToDetail#ListRowClickToDetail',
      ],
    },
    defaultColumns: [
      'createdAt',
      'id',
      'userSendsDetail',
      'amountSentToExchangeOriginalRateDetail',
      'amountReceivedFromExchangeDetail',
      'userReceivesDetail',
      'invoiceImageProof',
      'profitAmountDetail',
      'profitPercentageDetail',
      'rateDetail',
      'sentToReference',
      'status',
      'transaction',
      'exchangeAction',
    ],
    group: 'Operations',
    hidden: ({ user }) => !(user?.roles?.includes('user') || user?.roles?.includes('admin')),
  },
  access: {
    create: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    // read: ({ req: { user } }) => user?.roles?.includes('user') ?? false,
    read: () => true,
    update: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    delete: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
  },
  fields: [
    {
      name: 'exchangeAction',
      type: 'ui',
      label: 'Action',
      admin: {
        position: 'sidebar',
        condition: (data, _, { user }) =>
          Boolean(data?.id) &&
          Boolean(user?.roles?.includes('admin') || user?.roles?.includes('user')),
        components: {
          Cell: '/components/ExchangeActionCryptoToFiatCell#ExchangeActionCryptoToFiatCell',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'amount',
          type: 'number',
          required: true,
          label: 'User Sends (USDT)',
          admin: {
            step: 0.000001,
            width: '50%',
            description:
              'Crypto to Fiat flow: user sends USDT, then receives Philippine Peso (₱) in the linked transaction.',
          },
          validate: (value: number | number[] | null | undefined, args: unknown) => {
            const operation = (args as { operation?: string } | undefined)?.operation

            if (Array.isArray(value)) {
              return 'Amount must be a positive number.'
            }

            // During partial updates, amount may be omitted from the incoming payload.
            if (operation === 'update' && (value === null || typeof value === 'undefined')) {
              return true
            }

            if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
              return 'Amount must be a positive number.'
            }

            return true
          },
          hooks: {
            beforeValidate: [
              ({ value, siblingData }) => {
                if (typeof value !== 'number') return value
                const currency = siblingData?.currency
                if (currency === 'PHP') {
                  return Math.round(value * 100) / 100
                }
                if (currency === 'USDT') {
                  return Math.round(value * 1000000) / 1000000
                }
                return value
              },
            ],
          },
        },
        {
          name: 'currency',
          type: 'select',
          required: true,
          defaultValue: 'USDT',
          label: 'Send Currency',
          admin: {
            width: '50%',
          },
          options: [{ label: 'USDT', value: 'USDT' }],
          validate: (value: string | null | undefined) => {
            if (value !== 'USDT') {
              return 'Crypto to Fiat records must use USDT for the sent currency.'
            }

            return true
          },
        },
      ],
    },
    {
      name: 'userSendsDetail',
      type: 'text',
      virtual: true,
      label: 'User Sends',
      admin: {
        readOnly: true,
        condition: () => false,
      },
      hooks: {
        afterRead: [
          ({ siblingData }) => {
            const amount = siblingData?.amount
            if (typeof amount !== 'number') return 'USDT amount unavailable'

            return `${amount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })} USDT`
          },
        ],
      },
    },
    {
      name: 'amountSentToExchangeOriginalRateDetail',
      type: 'text',
      virtual: true,
      label: 'Amount Sent to Exchange ',
      access: {
        read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
      },
      admin: {
        readOnly: true,
        condition: (_, __, { user }) => Boolean(user?.roles?.includes('admin')),
      },
      hooks: {
        afterRead: [
          async ({ req, siblingData }) => {
            const transactionRef = siblingData?.transaction
            const transactionId =
              typeof transactionRef === 'object' ? transactionRef?.id : transactionRef

            if (!transactionId) return 'USDT amount unavailable'

            const transaction =
              typeof transactionRef === 'object'
                ? transactionRef
                : await req.payload.findByID({
                    collection: 'transactions',
                    id: transactionId,
                    depth: 0,
                    req,
                    overrideAccess: false,
                  })

            const amountUsdtOriginal = (transaction as { amountUsdtOriginal?: number | null })
              ?.amountUsdtOriginal

            if (typeof amountUsdtOriginal !== 'number') return 'USDT amount unavailable'

            return `${amountUsdtOriginal.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })} USDT`
          },
        ],
      },
    },
    {
      name: 'amountReceivedFromExchangeDetail',
      type: 'text',
      virtual: true,
      label: 'Amount Received from Exchange ',
      access: {
        read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
      },
      admin: {
        readOnly: true,
        condition: (_, __, { user }) => Boolean(user?.roles?.includes('admin')),
      },
      hooks: {
        afterRead: [
          async ({ req, siblingData }) => {
            const transactionRef = siblingData?.transaction
            const transactionId =
              typeof transactionRef === 'object' ? transactionRef?.id : transactionRef

            if (!transactionId) return '₱ amount unavailable'

            const transaction =
              typeof transactionRef === 'object'
                ? transactionRef
                : await req.payload.findByID({
                    collection: 'transactions',
                    id: transactionId,
                    depth: 0,
                    req,
                    overrideAccess: false,
                  })

            const amountUsdtOriginal = (transaction as { amountUsdtOriginal?: number | null })
              ?.amountUsdtOriginal
            const referenceRate =
              (transaction as { referenceRateSnapshot?: number | null })?.referenceRateSnapshot ??
              (transaction as { usdtToPhpReferenceRateSnapshot?: number | null })
                ?.usdtToPhpReferenceRateSnapshot

            if (
              typeof amountUsdtOriginal !== 'number' ||
              Number.isNaN(amountUsdtOriginal) ||
              typeof referenceRate !== 'number' ||
              Number.isNaN(referenceRate)
            ) {
              return '₱ amount unavailable'
            }

            const amountPhpOriginal = amountUsdtOriginal * referenceRate

            return `₱ ${amountPhpOriginal.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          },
        ],
      },
    },
    {
      name: 'rateDetail',
      type: 'text',
      virtual: true,
      label: 'Rate',
      admin: {
        readOnly: true,
      },
      hooks: {
        afterRead: [
          async ({ req, siblingData }) => {
            const transactionRef = siblingData?.transaction
            const transactionId =
              typeof transactionRef === 'object' ? transactionRef?.id : transactionRef

            if (!transactionId) return 'Rate unavailable'

            const transaction =
              typeof transactionRef === 'object'
                ? transactionRef
                : await req.payload.findByID({
                    collection: 'transactions',
                    id: transactionId,
                    depth: 0,
                    req,
                    overrideAccess: false,
                  })

            const snapshotRate =
              (
                transaction as {
                  appliedRateSnapshot?: number | null
                  usdtToPhpRateSnapshot?: number | null
                }
              )?.appliedRateSnapshot ??
              (transaction as { usdtToPhpRateSnapshot?: number | null })?.usdtToPhpRateSnapshot

            if (typeof snapshotRate === 'number' && snapshotRate > 0) {
              return `${snapshotRate.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })} PHP/USDT`
            }

            const amountSentUsdt = (transaction as { amountPhp?: number | null })?.amountPhp
            const amountReceivePhp = (transaction as { amountUsdt?: number | null })?.amountUsdt

            if (
              typeof amountSentUsdt !== 'number' ||
              typeof amountReceivePhp !== 'number' ||
              amountSentUsdt <= 0
            ) {
              return 'Rate unavailable'
            }

            const rate = amountReceivePhp / amountSentUsdt
            return `${rate.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })} PHP/USDT`
          },
        ],
      },
    },
    {
      name: 'profitAmountDetail',
      type: 'text',
      virtual: true,
      label: 'Profit Amount',
      access: {
        read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
      },
      admin: {
        readOnly: true,
        condition: (_, __, { user }) => Boolean(user?.roles?.includes('admin')),
      },
      hooks: {
        afterRead: [
          async ({ req, siblingData }) => {
            const transactionRef = siblingData?.transaction
            const transactionId =
              typeof transactionRef === 'object' ? transactionRef?.id : transactionRef

            if (!transactionId) return '—'

            const transaction =
              typeof transactionRef === 'object'
                ? transactionRef
                : await req.payload.findByID({
                    collection: 'transactions',
                    id: transactionId,
                    depth: 0,
                    req,
                    overrideAccess: false,
                  })

            const txStatus = (transaction as { status?: string | null })?.status
            if (txStatus !== 'completed') return '—'

            const profitUsdt = (transaction as { profit?: number | null })?.profit

            if (typeof profitUsdt !== 'number' || Number.isNaN(profitUsdt)) {
              return '—'
            }

            return `${profitUsdt.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })} USDT`
          },
        ],
      },
    },
    {
      name: 'profitPercentageDetail',
      type: 'text',
      virtual: true,
      label: 'Profit %',
      access: {
        read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
      },
      admin: {
        readOnly: true,
        condition: (_, __, { user }) => Boolean(user?.roles?.includes('admin')),
      },
      hooks: {
        afterRead: [
          async ({ req, siblingData }) => {
            const transactionRef = siblingData?.transaction
            const transactionId =
              typeof transactionRef === 'object' ? transactionRef?.id : transactionRef

            if (!transactionId) return '—'

            const transaction =
              typeof transactionRef === 'object'
                ? transactionRef
                : await req.payload.findByID({
                    collection: 'transactions',
                    id: transactionId,
                    depth: 0,
                    req,
                    overrideAccess: false,
                  })

            const txStatus = (transaction as { status?: string | null })?.status
            if (txStatus !== 'completed') return '—'

            const referenceRate = (transaction as { referenceRateSnapshot?: number | null })
              ?.referenceRateSnapshot
            const appliedRate = (transaction as { appliedRateSnapshot?: number | null })
              ?.appliedRateSnapshot

            if (
              typeof referenceRate === 'number' &&
              !Number.isNaN(referenceRate) &&
              referenceRate > 0 &&
              typeof appliedRate === 'number' &&
              !Number.isNaN(appliedRate)
            ) {
              const pctFromRate = (Math.abs(referenceRate - appliedRate) / referenceRate) * 100
              return `${pctFromRate.toFixed(2)}%`
            }

            const profit = (transaction as { profit?: number | null })?.profit
            const baselineUsdt = (transaction as { amountUsdtOriginal?: number | null })
              ?.amountUsdtOriginal

            if (
              typeof profit !== 'number' ||
              Number.isNaN(profit) ||
              typeof baselineUsdt !== 'number' ||
              Number.isNaN(baselineUsdt) ||
              baselineUsdt <= 0
            ) {
              return '—'
            }

            const pct = (profit / baselineUsdt) * 100
            return `${pct.toFixed(2)}%`
          },
        ],
      },
    },
    {
      name: 'userReceivesDetail',
      type: 'text',
      virtual: true,
      label: 'User Receives',
      admin: {
        readOnly: true,
        condition: () => false,
      },
      hooks: {
        afterRead: [
          async ({ req, siblingData }) => {
            const transactionRef = siblingData?.transaction
            const transactionId =
              typeof transactionRef === 'object' ? transactionRef?.id : transactionRef

            if (!transactionId) return '₱ amount unavailable'

            const transaction =
              typeof transactionRef === 'object'
                ? transactionRef
                : await req.payload.findByID({
                    collection: 'transactions',
                    id: transactionId,
                    depth: 0,
                    req,
                    overrideAccess: false,
                  })

            const amountPhp = (transaction as { amountUsdt?: number | null })?.amountUsdt
            if (typeof amountPhp !== 'number') return '₱ amount unavailable'

            return `₱ ${amountPhp.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          },
        ],
      },
    },
    {
      name: 'invoiceImageProof',
      type: 'text',
      virtual: true,
      label: 'Invoice Image',
      admin: {
        readOnly: true,
        components: {
          Cell: '/components/InvoiceImagePreviewCell#InvoiceImagePreviewCell',
        },
      },
      hooks: {
        afterRead: [
          async ({ req, siblingData }) => {
            const transactionRef = siblingData?.transaction
            const transactionId =
              typeof transactionRef === 'object' ? transactionRef?.id : transactionRef

            if (!transactionId) return null

            const transaction =
              typeof transactionRef === 'object'
                ? transactionRef
                : await req.payload.findByID({
                    collection: 'transactions',
                    id: transactionId,
                    depth: 0,
                    req,
                    overrideAccess: false,
                  })

            const invoiceImageRef = (
              transaction as {
                invoiceImage?:
                  | number
                  | string
                  | { id?: number | string; url?: string | null; filename?: string | null }
                  | null
              }
            )?.invoiceImage

            if (!invoiceImageRef) return null

            if (typeof invoiceImageRef === 'object') {
              const directUrl = invoiceImageRef.url?.trim()
              if (directUrl) return directUrl
            }

            const mediaId =
              typeof invoiceImageRef === 'object' ? invoiceImageRef.id : invoiceImageRef
            if (!mediaId) return null

            const media = await req.payload.findByID({
              collection: 'media',
              id: mediaId,
              depth: 0,
              req,
              overrideAccess: false,
            })

            const mediaUrl = (media as { url?: string | null })?.url
            if (typeof mediaUrl === 'string' && mediaUrl.trim()) {
              return mediaUrl
            }

            const filename = (media as { filename?: string | null })?.filename
            if (typeof filename === 'string' && filename.trim()) {
              return `/media/${filename}`
            }

            return null
          },
        ],
      },
    },
    {
      name: 'sentToReference',
      type: 'text',
      virtual: true,
      label: 'Sent To Reference',
      admin: {
        readOnly: true,
        condition: () => false,
        components: {
          Cell: '/components/BankDetailsPopupCell#BankDetailsPopupCell',
        },
      },
      hooks: {
        afterRead: [
          async ({ req, siblingData }) => {
            const transactionRef = siblingData?.transaction
            const transactionId =
              typeof transactionRef === 'object' ? transactionRef?.id : transactionRef

            if (!transactionId) return siblingData?.receiverDetails || 'Bank details unavailable'

            const transaction =
              typeof transactionRef === 'object'
                ? transactionRef
                : await req.payload.findByID({
                    collection: 'transactions',
                    id: transactionId,
                    depth: 0,
                    req,
                    overrideAccess: false,
                  })

            const bankDetails = (transaction as { bankDetails?: string | null })?.bankDetails
            const formattedBankDetails = formatBankDetails(bankDetails)

            return (
              formattedBankDetails || siblingData?.receiverDetails || 'Bank details unavailable'
            )
          },
        ],
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'transaction',
          type: 'relationship',
          relationTo: 'transactions',
          required: true,
          index: true,
          admin: {
            width: '50%',
          },
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'pending',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Confirmed', value: 'confirmed' },
            { label: 'Processing', value: 'processing' },
            { label: 'Completed', value: 'completed' },
            { label: 'Failed', value: 'failed' },
          ],
          admin: {
            width: '50%',
            components: {
              Cell: '/components/StatusBadgeCell#StatusBadgeCell',
            },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'method',
          type: 'select',
          options: [
            { label: 'Bank Transfer', value: 'bank_transfer' },
            { label: 'Crypto', value: 'crypto' },
          ],
          admin: {
            width: '50%',
          },
        },
        {
          name: 'txHash',
          type: 'text',
          admin: {
            width: '50%',
            description: 'Optional blockchain hash once crypto send is confirmed.',
            condition: (data) => data.method === 'crypto' && data.status !== 'pending',
          },
        },
      ],
    },
    {
      name: 'receiverDetails',
      type: 'text',
      admin: {
        description: 'Optional fiat payout destination details.',
      },
    },
  ],
  timestamps: true,
}
