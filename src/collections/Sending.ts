import { CRYPTO_TO_FIAT_COLLECTION_SLUG } from '@/lib/collectionSlugs'
import type { CollectionConfig } from 'payload'
import { markSendingReceivedEndpoint } from '../endpoints/markSendingReceived'

export const Sending: CollectionConfig = {
  slug: CRYPTO_TO_FIAT_COLLECTION_SLUG,
  endpoints: [markSendingReceivedEndpoint],
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['amount', 'currency', 'status', 'method', 'createdAt', 'markAsReceivedAction'],
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
        condition: (data, _, { user }) =>
          Boolean(data?.id) && Boolean(user?.roles?.includes('user')),
        components: {
          Cell: '/components/MarkSendingReceivedCell#MarkSendingReceivedCell',
        },
      },
    },
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
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
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
      name: 'txHash',
      type: 'text',
      admin: {
        condition: (data) => data.method === 'crypto',
      },
    },
    {
      name: 'receiverDetails',
      type: 'text',
    },
  ],
  timestamps: true,
}
