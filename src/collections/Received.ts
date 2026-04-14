import { FIAT_TO_CRYPTO_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import type { CollectionConfig } from 'payload'

export const Received: CollectionConfig = {
  slug: FIAT_TO_CRYPTO_COLLECTION_SLUG,
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['amount', 'currency', 'status', 'method', 'createdAt'],
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
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        step: 0.000001,
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
      options: [
        { label: 'PHP', value: 'PHP' },
        { label: 'USDT', value: 'USDT' },
      ],
    },
    {
      name: 'transaction',
      type: 'relationship',
      relationTo: 'transactions',
      required: true,
      index: true,
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
    },
    {
      name: 'method',
      type: 'select',
      options: [
        { label: 'Bank Transfer', value: 'bank_transfer' },
        { label: 'Crypto', value: 'crypto' },
      ],
    },
    {
      name: 'referenceNumber',
      type: 'text',
      admin: {
        condition: (data) => data.method === 'bank_transfer',
      },
    },
    {
      name: 'senderAddress',
      type: 'text',
      admin: {
        condition: (data) => data.method === 'crypto',
      },
    },
    {
      name: 'txHash',
      type: 'text',
      admin: {
        condition: (data) => data.method === 'crypto',
      },
    },
  ],
  timestamps: true,
}
