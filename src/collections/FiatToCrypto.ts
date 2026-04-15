import { FIAT_TO_CRYPTO_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import type { CollectionConfig } from 'payload'
import { markFiatToCryptoSendingEndpoint } from '../endpoints/markFiatToCryptoSending'

export const Received: CollectionConfig = {
  slug: FIAT_TO_CRYPTO_COLLECTION_SLUG,
  labels: {
    singular: 'Fiat-to-Crypto',
    plural: 'Fiat-to-Crypto',
  },
  admin: {
    useAsTitle: 'id',
    components: {
      beforeListTable: [
        '/components/ExchangeOperationsSummaryBanner#ExchangeOperationsSummaryBanner',
        '/components/ListRowClickToDetail#ListRowClickToDetail',
        '/components/RowHoverHighlight#RowHoverHighlight',
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
    group: 'Transactions',
    hidden: ({ user }) => !(user?.roles?.includes('user') || user?.roles?.includes('admin')),
  },
  endpoints: [markFiatToCryptoSendingEndpoint],
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
        condition: (data, _, { user }) =>
          Boolean(data?.id) &&
          Boolean(user?.roles?.includes('admin') || user?.roles?.includes('user')),
        components: {
          Cell: '/components/ExchangeActionFiatToCryptoCell#ExchangeActionFiatToCryptoCell',
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
          label: 'User Receives (USDT)',
          admin: {
            step: 0.000001,
            width: '50%',
            description:
              'Fiat to Crypto flow: user sends Philippine Peso (₱), then receives USDT in this record.',
          },
          validate: (value: number | number[] | null | undefined, args: unknown) => {
            const operation = (args as { operation?: string } | undefined)?.operation

            if (Array.isArray(value)) {
              return 'Amount must be a positive number.'
            }

            // During partial updates (e.g. status/invoice only), amount may be omitted.
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
          label: 'Receive Currency',
          admin: {
            width: '50%',
          },
          options: [{ label: 'USDT', value: 'USDT' }],
          validate: (value: string | null | undefined) => {
            if (value !== 'USDT') {
              return 'Fiat to Crypto records must use USDT for the received currency.'
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

            const amountPhp = (transaction as { amountPhp?: number | null })?.amountPhp
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
      name: 'amountSentToExchangeOriginalRateDetail',
      type: 'text',
      virtual: true,
      label: 'Amount Sent to Exchange',
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
              (transaction as { phpToUsdtReferenceRateSnapshot?: number | null })
                ?.phpToUsdtReferenceRateSnapshot
            const fallbackAmountPhp = (transaction as { amountPhp?: number | null })?.amountPhp

            if (
              typeof amountUsdtOriginal === 'number' &&
              !Number.isNaN(amountUsdtOriginal) &&
              typeof referenceRate === 'number' &&
              !Number.isNaN(referenceRate) &&
              referenceRate > 0
            ) {
              const amountPhpOriginal = amountUsdtOriginal / referenceRate

              return `₱ ${amountPhpOriginal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            }

            if (typeof fallbackAmountPhp !== 'number' || Number.isNaN(fallbackAmountPhp)) {
              return '₱ amount unavailable'
            }

            return `₱ ${fallbackAmountPhp.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          },
        ],
      },
    },
    {
      name: 'amountReceivedFromExchangeDetail',
      type: 'text',
      virtual: true,
      label: 'Amount Received from Exchange',
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
                  phpToUsdtRateSnapshot?: number | null
                }
              )?.appliedRateSnapshot ??
              (transaction as { phpToUsdtRateSnapshot?: number | null })?.phpToUsdtRateSnapshot

            if (typeof snapshotRate === 'number' && snapshotRate > 0) {
              return `${snapshotRate.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })} USDT/PHP`
            }

            const amountSentPhp = (transaction as { amountPhp?: number | null })?.amountPhp
            const amountReceiveUsdt = (transaction as { amountUsdt?: number | null })?.amountUsdt

            if (
              typeof amountSentPhp !== 'number' ||
              typeof amountReceiveUsdt !== 'number' ||
              amountSentPhp <= 0
            ) {
              return 'Rate unavailable'
            }

            const rate = amountReceiveUsdt / amountSentPhp
            return `${rate.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })} USDT/₱`
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
            const directInvoiceRef = siblingData?.invoiceImage

            const resolveMediaUrl = async (
              mediaRef:
                | number
                | string
                | { id?: number | string; url?: string | null; filename?: string | null }
                | null
                | undefined,
            ) => {
              if (!mediaRef) return null

              if (typeof mediaRef === 'object') {
                const directUrl = mediaRef.url?.trim()
                if (directUrl) return directUrl
              }

              const mediaId = typeof mediaRef === 'object' ? mediaRef.id : mediaRef
              if (!mediaId) return null

              const media = await req.payload.findByID({
                collection: 'media',
                id: mediaId,
                depth: 0,
                req,
                overrideAccess: false,
              })

              const mediaUrl = (media as { url?: string | null })?.url
              if (typeof mediaUrl === 'string' && mediaUrl.trim()) return mediaUrl

              const filename = (media as { filename?: string | null })?.filename
              if (typeof filename === 'string' && filename.trim()) {
                return `/media/${filename}`
              }

              return null
            }

            const directInvoiceUrl = await resolveMediaUrl(directInvoiceRef)
            if (directInvoiceUrl) return directInvoiceUrl

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

            const transactionInvoiceRef = (
              transaction as {
                invoiceImage?:
                  | number
                  | string
                  | { id?: number | string; url?: string | null; filename?: string | null }
                  | null
              }
            )?.invoiceImage

            return resolveMediaUrl(transactionInvoiceRef)
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
      },
      hooks: {
        afterRead: [
          async ({ req, siblingData }) => {
            const transactionRef = siblingData?.transaction
            const transactionId =
              typeof transactionRef === 'object' ? transactionRef?.id : transactionRef

            if (!transactionId) return 'Target address unavailable'

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

            const targetAddress = (transaction as { targetAddress?: string | null })?.targetAddress

            return targetAddress?.trim() || 'Target address unavailable'
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
          name: 'invoiceImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Invoice Image',
          admin: {
            width: '50%',
            description: 'Required after confirming fiat send.',
            condition: (data) => data.status === 'confirmed',
          },
          validate: (value: unknown, { siblingData }: { siblingData?: unknown }) => {
            const status = (siblingData as { status?: string } | undefined)?.status
            if (status === 'confirmed' && !value) {
              return 'Invoice image is required when status is Confirmed.'
            }

            return true
          },
        },
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
          name: 'referenceNumber',
          type: 'text',
          admin: {
            width: '50%',
            condition: (data) => data.method === 'bank_transfer' && data.status === 'confirmed',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'senderAddress',
          type: 'text',
          admin: {
            width: '50%',
            condition: (data) => data.method === 'crypto',
          },
        },
        {
          name: 'txHash',
          type: 'text',
          admin: {
            width: '50%',
            condition: (data) => data.method === 'crypto',
          },
        },
      ],
    },
  ],
  timestamps: true,
}
