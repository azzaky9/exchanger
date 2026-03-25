import type { CollectionConfig } from 'payload'
import crypto from 'node:crypto'
import { createExchangeEndpoint } from '../endpoints/createExchange'
import { checkSettlementEndpoint } from '../endpoints/checkSettlement'
import { settlementStatusEndpoint } from '../endpoints/settlementStatus'

export const Transaction: CollectionConfig = {
  slug: 'transactions',
  endpoints: [createExchangeEndpoint, checkSettlementEndpoint, settlementStatusEndpoint],
  admin: {
    useAsTitle: 'orderId',
    defaultColumns: ['orderId', 'amountUsdt', 'network', 'status', 'createdAt'],
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
      async ({ data, req }) => {
        if (!data) return data

        // Auto-calculate USDT based on PHP and the selected exchange rate
        if (data.amountPhp && data.exchangeRate) {
          try {
            // exchangeRate could be an ID string or object depending on depth, fetch it via local API
            const exchangeRateId =
              typeof data.exchangeRate === 'object' ? data.exchangeRate.id : data.exchangeRate

            if (exchangeRateId) {
              const rateDoc = await req.payload.findByID({
                collection: 'exchange-rates',
                id: exchangeRateId,
                depth: 0,
                req,
              })

              const originalRate = rateDoc.referenceRate as number
              const usdtToPhpRate = rateDoc.usdtToPhpRate as number
              const phpToUsdtRate = rateDoc.phpToUsdtRate as number

              if (originalRate > 0) {
                const usdtOriginal = data.amountPhp / originalRate
                let usdtFinal = 0
                let profit = 0

                if (data.type === 'crypto_to_fiat') {
                  // User sends USDT, gets PHP
                  // They must send (amountPhp / usdtToPhpRate)
                  usdtFinal = data.amountPhp / usdtToPhpRate
                  profit = usdtFinal - usdtOriginal
                } else {
                  // User sends PHP, gets USDT (fiat_to_crypto)
                  // We send them (amountPhp * phpToUsdtRate)
                  usdtFinal = data.amountPhp * phpToUsdtRate
                  profit = usdtOriginal - usdtFinal
                }

                data.amountUsdtOriginal = Math.round(usdtOriginal * 1000000) / 1000000
                data.amountUsdt = Math.round(usdtFinal * 1000000) / 1000000
                data.profit = Math.round(profit * 1000000) / 1000000
              }
            }
          } catch (err) {
            req.payload.logger.error(`Error resolving exchange rate values: ${err}`)
          }
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'orderId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Auto-generated Order ID',
      },
      hooks: {
        beforeValidate: [
          ({ value, operation }) => {
            if (operation === 'create' && !value) {
              return crypto.randomUUID()
            }
            return value
          },
        ],
      },
    },
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
          name: 'amountPhp',
          type: 'number',
          required: true,
          label: 'Amount (PHP)',
          admin: {
            step: 0.01,
            description: 'Amount of PHP received from the customer',
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
          name: 'amountUsdtOriginal',
          type: 'number',
          label: 'Calculated USDT (Original Rate)',
          access: {
            read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
          },
          admin: {
            step: 0.000001,
            description: 'Auto-computed: amountPhp × originalExchangeRate',
            readOnly: true,
            width: '50%',
          },
        },
        {
          name: 'amountUsdt',
          type: 'number',
          label: 'Total USDT (To Send/Receive)',
          admin: {
            step: 0.000001,
            description: 'Auto-computed: amountPhp × markupExchangeRate',
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
          name: 'exchangeRate',
          type: 'relationship',
          relationTo: 'exchange-rates',
          required: true,
          label: 'Exchange Rate',
          access: {
            read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
          },
          admin: {
            description: 'Select the exchange rate to use for this transaction',
            width: '100%',
          },
        },
      ],
    },
    {
      name: 'exchangeRateCalculator',
      type: 'ui',
      admin: {
        condition: (_, __, { user }) => Boolean(user?.roles?.includes('admin')),
        components: {
          Field: '/components/ExchangeRateCalculator#ExchangeRateCalculator',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'profit',
          type: 'number',
          label: 'Profit (USDT Default)',
          defaultValue: 0,
          access: {
            read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
          },
          admin: {
            step: 0.000001,
            description: 'Calculated difference based on transaction type',
            readOnly: true,
            width: '100%',
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
