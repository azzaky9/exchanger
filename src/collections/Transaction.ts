import type { CollectionConfig } from 'payload'
import crypto from 'node:crypto'
import { createExchangeEndpoint } from '../endpoints/createExchange'
import { checkSettlementEndpoint } from '../endpoints/checkSettlement'
import { settlementStatusEndpoint } from '../endpoints/settlementStatus'
import { financeSummaryEndpoint } from '../endpoints/finance-summary'

export const Transaction: CollectionConfig = {
  slug: 'transactions',
  endpoints: [
    createExchangeEndpoint,
    checkSettlementEndpoint,
    settlementStatusEndpoint,
    financeSummaryEndpoint,
  ],
  admin: {
    useAsTitle: 'id',
    defaultColumns: [
      'id',
      'type',
      'status',
      'amountUsdt',
      'amountPhp',
      'profit',
      'profitPercentage',
      'targetAddress',
      'txHash',
      'createdAt',
    ],
    group: 'Operations',
    components: {
      beforeListTable: [
        '/components/TransactionSummaryBanner#TransactionSummaryBanner',
        '/components/TransactiontypeFilter#TransactionTypeFilter',
      ],
    },
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
                let amountAtOriginalRate = 0
                let amountFinal = 0
                let profit = 0

                if (data.type === 'crypto_to_fiat') {
                  // amountPhp field holds the USDT amount the user sends.
                  // Convert USDT → PHP using both rates.
                  amountAtOriginalRate = data.amountPhp * originalRate // PHP at reference rate
                  amountFinal = data.amountPhp * usdtToPhpRate // PHP user actually receives
                  profit = amountAtOriginalRate - amountFinal // PHP profit (exchanger keeps spread)
                } else {
                  // fiat_to_crypto: amountPhp = PHP the user sends.
                  // Convert PHP → USDT using both rates.
                  amountAtOriginalRate = data.amountPhp / originalRate // USDT at reference rate
                  amountFinal = data.amountPhp * phpToUsdtRate // USDT user actually receives
                  profit = amountAtOriginalRate - amountFinal // USDT profit (exchanger keeps spread)
                }

                data.amountUsdtOriginal = Math.round(amountAtOriginalRate * 1000000) / 1000000
                data.amountUsdt = Math.round(amountFinal * 1000000) / 1000000
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
          defaultValue: 'pending',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Confirmed', value: 'confirmed' },
            { label: 'Processing', value: 'processing' },
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
          label: 'Total Received (₱/USDT)',
          admin: {
            step: 0.01,
            description: 'Amount in source currency (PHP for fiat→crypto, USDT for crypto→fiat)',
            width: '50%',
            components: {
              Label: '/components/DynamicAmountLabel#AmountLabel',
              Cell: '/components/AmountSentCell#AmountSentCell',
            },
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
          label: 'Calculated Amount (Original Rate)',
          access: {
            read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
          },
          admin: {
            step: 0.000001,
            description: 'Auto-computed at the reference/original exchange rate',
            readOnly: true,
            width: '50%',
            components: {
              Label: '/components/DynamicAmountLabel#AmountOriginalLabel',
              Cell: '/components/AmountReceivedCell#AmountReceivedCell',
            },
          },
        },
        {
          name: 'amountUsdt',
          type: 'number',
          label: 'Total Amount sent (USDT/₱)',
          admin: {
            step: 0.000001,
            description: 'Auto-computed at the markup/applied exchange rate',
            readOnly: true,
            width: '50%',
            components: {
              Label: '/components/DynamicAmountLabel#AmountFinalLabel',
              Cell: '/components/AmountReceivedCell#AmountReceivedCell',
            },
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
          label: 'Profit',
          defaultValue: 0,
          access: {
            read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
          },
          admin: {
            step: 0.000001,
            description: 'Calculated difference based on transaction type',
            readOnly: true,
            width: '100%',
            components: {
              Label: '/components/DynamicAmountLabel#ProfitLabel',
              Cell: '/components/AmountReceivedCell#AmountReceivedCell',
            },
          },
        },
      ],
    },
    {
      name: 'profitPercentage',
      type: 'ui',
      admin: {
        condition: (_, __, { user }) => Boolean(user?.roles?.includes('admin')),
        components: {
          // Field: '/components/ProfitPercentageCell#ProfitPercentageCell',
          Cell: '/components/ProfitPercentageCell#ProfitPercentageCell',
        },
      },
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
