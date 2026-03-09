import type { CollectionConfig } from 'payload'
import { createExchangeEndpoint } from '../endpoints/createExchange'
import { checkSettlementEndpoint } from '../endpoints/checkSettlement'

export const Transaction: CollectionConfig = {
  slug: 'transactions',
  endpoints: [createExchangeEndpoint, checkSettlementEndpoint],
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['amountUsdt', 'network', 'status', 'createdAt'],
    group: 'Operations',
  },
  access: {
    create: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    delete: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
  },
  hooks: {
    beforeChange: [
      async ({ data }) => {
        if (!data) return data

        const amountUsdt = data.amountUsdt
        const exchangeRate = data.exchangeRate
        const markup = data.markup ?? 0

        // Compute amountPhp and profit when admin has filled in rate
        if (amountUsdt && exchangeRate && exchangeRate > 0) {
          const basePhp = Math.round(amountUsdt * exchangeRate * 100) / 100
          data.amountPhp = Math.round((basePhp + markup) * 100) / 100
          data.profit = Math.round(markup * 100) / 100
        }

        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'fiat_to_crypto',
          label: 'Transaction Type',
          options: [
            { label: 'Fiat to Crypto', value: 'fiat_to_crypto' },
            { label: 'Crypto to Fiat', value: 'crypto_to_fiat' },
          ],
          admin: {
            description: 'Direction of the exchange',
            width: '50%',
          },
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'awaiting_fiat',
          options: [
            { label: 'Awaiting Fiat', value: 'awaiting_fiat' },
            { label: 'Fiat Received', value: 'fiat_received' },
            { label: 'Crypto Transfer Pending', value: 'crypto_transfer_pending' },
            { label: 'Completed', value: 'completed' },
            { label: 'Refunded', value: 'refunded' },
            { label: 'Review Needed', value: 'review_needed' },
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
          name: 'treasury',
          type: 'relationship',
          relationTo: 'treasury',
          required: true,
          label: 'Treasury Wallet',
          admin: {
            description: 'Source treasury wallet for the transfer',
            width: '50%',
          },
        },
        {
          name: 'network',
          type: 'relationship',
          relationTo: 'networks',
          required: true,
          label: 'Network',
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
          name: 'amountUsdt',
          type: 'number',
          required: true,
          label: 'Amount (USDT)',
          admin: {
            step: 0.000001,
            description: 'Amount of USDT requested',
            width: '50%',
          },
        },
        {
          name: 'targetAddress',
          type: 'text',
          required: true,
          label: 'Target Address',
          admin: {
            description: 'Destination wallet address for the transfer',
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'exchangeRate',
          type: 'number',
          label: 'Exchange Rate (PHP per USDT)',
          admin: {
            step: 0.000001,
            description: 'PHP per 1 USDT — set by admin',
            width: '50%',
          },
        },
        {
          name: 'markup',
          type: 'number',
          label: 'Markup (Fixed Amount)',
          defaultValue: 0,
          admin: {
            step: 0.01,
            description: 'Fixed fee added on top of base PHP amount',
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'exchangeRateCalculator',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/ExchangeRateCalculator#ExchangeRateCalculator',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'amountPhp',
          type: 'number',
          label: 'Amount (PHP)',
          admin: {
            step: 0.01,
            description: 'Auto-computed: (amountUsdt × exchangeRate) + markup',
            readOnly: true,
            width: '50%',
          },
        },
        {
          name: 'profit',
          type: 'number',
          label: 'Profit',
          defaultValue: 0,
          admin: {
            step: 0.01,
            description: 'Markup fee collected as profit',
            readOnly: true,
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'gasFee',
          type: 'number',
          label: 'Gas Fee',
          admin: {
            step: 0.000001,
            description: 'Transfer fee amount',
            width: '50%',
          },
        },
        {
          name: 'txHash',
          type: 'text',
          label: 'Transaction Hash',
          index: true,
          admin: {
            description: 'On-chain transaction hash after transfer',
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'batch',
      type: 'relationship',
      relationTo: 'batches',
      label: 'Batch',
      admin: {
        description: 'Nullable initially, assigned when batched',
      },
    },
    {
      name: 'failReason',
      type: 'text',
      label: 'Failure Reason',
      admin: {
        description: 'Reason for failure or review flag',
        condition: (data) => data.status === 'review_needed' || data.status === 'refunded',
      },
    },
    {
      name: 'fiatSettlementId',
      type: 'text',
      label: 'Fiat Settlement ID',
      admin: {
        description: 'Optional reference to a fiat settlement',
      },
    },
  ],
  timestamps: true,
}
