import { CRYPTO_TO_FIAT_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import type { CollectionConfig } from 'payload'
import { markSendingReceivedEndpoint } from '../endpoints/markSendingReceived'

export const Sending: CollectionConfig = {
  slug: CRYPTO_TO_FIAT_COLLECTION_SLUG,
  labels: {
    singular: 'Crypto-to-Fiat',
    plural: 'Crypto-to-Fiat',
  },
  endpoints: [markSendingReceivedEndpoint],
  admin: {
    useAsTitle: 'id',
    defaultColumns: [
      'id',
      'userSendsDetail',
      'userReceivesDetail',
      'sentToReference',
      'status',
      'transaction',
      'createdAt',
      'markAsReceivedAction',
    ],
    group: 'Operations',
    hidden: ({ user }) => !user?.roles?.includes('user'),
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
      name: 'markAsReceivedAction',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (data, _, { user }) =>
          Boolean(data?.id) && Boolean(user?.roles?.includes('user')),
        components: {
          Cell: '/components/MarkSendingReceivedCell#MarkSendingReceivedCell',
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
          validate: (value: number | null | undefined) => {
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

            return bankDetails?.trim() || siblingData?.receiverDetails || 'Bank details unavailable'
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
            { label: 'Processing', value: 'processing' },
            { label: 'Completed', value: 'completed' },
            { label: 'Failed', value: 'failed' },
          ],
          admin: {
            width: '50%',
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
            condition: (data) => data.method === 'crypto',
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
