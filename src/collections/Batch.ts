import type { CollectionConfig } from 'payload'
import { retryBatchEndpoint } from '../endpoints/retryBatch'

export const Batch: CollectionConfig = {
  slug: 'batches',
  admin: {
    useAsTitle: 'id',
    defaultColumns: [
      'transactionCount',
      'totalUsdtBatched',
      'totalNetUsdt',
      'totalTrxSuccess',
      'totalTrxFail',
      'status',
      'createdAt',
    ],
    group: 'Operations',
    hidden: ({ user }) => !user?.roles?.includes('admin'),
  },
  access: {
    create: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    update: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    delete: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
  },
  endpoints: [retryBatchEndpoint],
  fields: [
    {
      name: 'retryButton',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/RetryFailedButton#RetryFailedButton',
        },
        condition: (data) => data?.status === 'partial_success' || data?.status === 'failed',
      },
    },
    {
      name: 'transactionCount',
      type: 'number',
      required: true,
      label: 'Transaction Count',
      admin: {
        description: 'Total number of transactions in this batch',
        readOnly: true,
      },
    },
    {
      name: 'totalUsdtBatched',
      type: 'number',
      required: true,
      label: 'Total USDT (Gross)',
      admin: {
        step: 0.000001,
        description: 'Total gross USDT before fees',
        readOnly: true,
      },
    },
    {
      name: 'totalFeeUsdt',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Total Fees (USDT)',
      admin: {
        step: 0.000001,
        description: 'Total exchange fees collected',
        readOnly: true,
      },
    },
    {
      name: 'totalNetUsdt',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Total Net USDT',
      admin: {
        step: 0.000001,
        description: 'Total USDT sent to users after fees',
        readOnly: true,
      },
    },
    {
      name: 'totalTrxSuccess',
      type: 'number',
      defaultValue: 0,
      label: 'Successful Transfers',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'totalTrxFail',
      type: 'number',
      defaultValue: 0,
      label: 'Failed Transfers',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'processing',
      options: [
        { label: 'Processing', value: 'processing' },
        { label: 'Partial Success', value: 'partial_success' },
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'executedAt',
      type: 'date',
      label: 'Executed At',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'transactions',
      type: 'join',
      collection: 'transactions',
      on: 'batch',
      admin: {
        description: 'Transactions included in this batch',
      },
    },
  ],
  timestamps: true,
}
