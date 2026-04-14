import { FIAT_TO_CRYPTO_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import type { CollectionConfig } from 'payload'

export const Received: CollectionConfig = {
  slug: FIAT_TO_CRYPTO_COLLECTION_SLUG,
  labels: {
    singular: 'Fiat-to-Crypto',
    plural: 'Fiat-to-Crypto',
  },
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
          name: 'referenceNumber',
          type: 'text',
          admin: {
            width: '50%',
            condition: (data) => data.method === 'bank_transfer',
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
