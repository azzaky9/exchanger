import {
  CRYPTO_TO_FIAT_COLLECTION_SLUG,
  FIAT_TO_CRYPTO_COLLECTION_SLUG,
} from '@/lib/collectionSlugs'
import crypto from 'node:crypto'
import type { CollectionConfig } from 'payload'
import { checkSettlementEndpoint } from '../endpoints/checkSettlement'
import { createExchangeEndpoint } from '../endpoints/createExchange'
import { createExchangeBatchEndpoint } from '../endpoints/createExchangeBatch'
import { financeSummaryEndpoint } from '../endpoints/finance-summary'
import { settlementStatusEndpoint } from '../endpoints/settlementStatus'

export const Transaction: CollectionConfig = {
  slug: 'transactions',
  endpoints: [
    createExchangeEndpoint,
    createExchangeBatchEndpoint,
    checkSettlementEndpoint,
    settlementStatusEndpoint,
    financeSummaryEndpoint,
  ],
  admin: {
    useAsTitle: 'id',
    hidden: ({ user }) => !user?.roles?.includes('admin'),
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
        '/components/TransactionTypeFilter#TransactionTypeFilter',
      ],
    },
  },
  access: {
    create: ({ req }) => Boolean(req.user), // just require auth
    read: ({ req }) => Boolean(req.user),
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
                overrideAccess: true,
              })

              const rateDocData = rateDoc as {
                referenceRate?: number | null
                usdtToPhpReferenceRate?: number | null
                phpToUsdtReferenceRate?: number | null
                usdtToPhpRate?: number | null
                phpToUsdtRate?: number | null
              }

              const legacyReferenceRate = Number(rateDocData.referenceRate ?? 0)
              const usdtToPhpReferenceRate = Number(
                rateDocData.usdtToPhpReferenceRate ?? legacyReferenceRate,
              )
              const phpToUsdtReferenceRate = Number(
                rateDocData.phpToUsdtReferenceRate ??
                  (legacyReferenceRate > 0 ? 1 / legacyReferenceRate : 0),
              )
              const usdtToPhpRate = Number(rateDocData.usdtToPhpRate ?? 0)
              const phpToUsdtRate = Number(rateDocData.phpToUsdtRate ?? 0)

              if (usdtToPhpReferenceRate > 0 || phpToUsdtReferenceRate > 0) {
                let amountAtOriginalRate = 0
                let amountFinal = 0
                let profit = 0

                if (data.type === 'crypto_to_fiat') {
                  // User sends USDT (amountPhp), receives PHP (amountUsdt)
                  amountAtOriginalRate = data.amountPhp * usdtToPhpReferenceRate // PHP at reference rate
                  amountFinal = data.amountPhp * usdtToPhpRate // PHP user actually receives
                  profit = amountAtOriginalRate - amountFinal // PHP profit

                  // PHP handles 2 decimal places
                  data.amountUsdtOriginal = Math.round(amountAtOriginalRate * 100) / 100
                  data.amountUsdt = Math.round(amountFinal * 100) / 100
                  data.profit = Math.round(profit * 100) / 100
                } else {
                  // User sends PHP (amountPhp), receives USDT (amountUsdt)
                  amountAtOriginalRate = data.amountPhp * phpToUsdtReferenceRate // USDT at reference rate
                  amountFinal = data.amountPhp * phpToUsdtRate // USDT user actually receives
                  profit = amountAtOriginalRate - amountFinal // USDT profit

                  // USDT handles 6 decimal places
                  data.amountUsdtOriginal = Math.round(amountAtOriginalRate * 1000000) / 1000000
                  data.amountUsdt = Math.round(amountFinal * 1000000) / 1000000
                  data.profit = Math.round(profit * 1000000) / 1000000
                }
              }
            }
          } catch (err) {
            req.payload.logger.error(`Error resolving exchange rate values: ${err}`)
          }
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation, context }) => {
        if (context.skipSync) return

        const { payload } = req
        const isFiatToCrypto = doc.type === 'fiat_to_crypto'

        // Keep payloads flow-specific so each related collection receives valid typed values.
        const fiatToCryptoReceivedData = {
          amount: doc.amountUsdt as number,
          currency: 'USDT' as const,
          transaction: doc.id,
          status: 'confirmed' as const,
          method: 'crypto' as const,
          txHash: doc.txHash,
        }

        const cryptoToFiatSendingData = {
          amount: doc.amountPhp as number,
          currency: 'USDT' as const,
          transaction: doc.id,
          status: 'pending' as const,
          method: 'crypto' as const,
          txHash: doc.txHash,
        }

        if (operation === 'create') {
          if (isFiatToCrypto) {
            const received = await payload.create({
              collection: FIAT_TO_CRYPTO_COLLECTION_SLUG,
              data: fiatToCryptoReceivedData,
              req,
              overrideAccess: true,
            })

            await payload.update({
              collection: 'transactions',
              id: doc.id,
              data: {
                receivedRecord: received.id,
                sendingRecord: null,
              },
              req,
              context: { skipSync: true },
              overrideAccess: true,
            })
          } else {
            const sending = await payload.create({
              collection: CRYPTO_TO_FIAT_COLLECTION_SLUG,
              data: cryptoToFiatSendingData,
              req,
              overrideAccess: true,
            })

            await payload.update({
              collection: 'transactions',
              id: doc.id,
              data: {
                sendingRecord: sending.id,
                receivedRecord: null,
              },
              req,
              context: { skipSync: true },
              overrideAccess: true,
            })
          }
        } else if (operation === 'update') {
          const receivedRecordId =
            typeof doc.receivedRecord === 'object' ? doc.receivedRecord?.id : doc.receivedRecord
          const sendingRecordId =
            typeof doc.sendingRecord === 'object' ? doc.sendingRecord?.id : doc.sendingRecord

          if (isFiatToCrypto) {
            if (receivedRecordId) {
              await payload.update({
                collection: FIAT_TO_CRYPTO_COLLECTION_SLUG,
                id: receivedRecordId,
                data: {
                  amount: fiatToCryptoReceivedData.amount,
                  currency: fiatToCryptoReceivedData.currency,
                  transaction: fiatToCryptoReceivedData.transaction,
                  method: fiatToCryptoReceivedData.method,
                  txHash: fiatToCryptoReceivedData.txHash,
                },
                req,
                overrideAccess: true,
              })
            } else {
              const received = await payload.create({
                collection: FIAT_TO_CRYPTO_COLLECTION_SLUG,
                data: fiatToCryptoReceivedData,
                req,
                overrideAccess: true,
              })

              await payload.update({
                collection: 'transactions',
                id: doc.id,
                data: {
                  receivedRecord: received.id,
                  sendingRecord: null,
                },
                req,
                context: { skipSync: true },
                overrideAccess: true,
              })
            }
          } else {
            if (sendingRecordId) {
              await payload.update({
                collection: CRYPTO_TO_FIAT_COLLECTION_SLUG,
                id: sendingRecordId,
                data: {
                  amount: cryptoToFiatSendingData.amount,
                  currency: cryptoToFiatSendingData.currency,
                  transaction: cryptoToFiatSendingData.transaction,
                  method: cryptoToFiatSendingData.method,
                  txHash: cryptoToFiatSendingData.txHash,
                },
                req,
                overrideAccess: true,
              })
            } else {
              const sending = await payload.create({
                collection: CRYPTO_TO_FIAT_COLLECTION_SLUG,
                data: cryptoToFiatSendingData,
                req,
                overrideAccess: true,
              })

              await payload.update({
                collection: 'transactions',
                id: doc.id,
                data: {
                  sendingRecord: sending.id,
                  receivedRecord: null,
                },
                req,
                context: { skipSync: true },
                overrideAccess: true,
              })
            }
          }
        }
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
            { label: 'Fiat to Crypto (onramps)', value: 'fiat_to_crypto' },
            { label: 'Crypto to Fiat (offramps)', value: 'crypto_to_fiat' },
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
            { label: 'Fiat Received', value: 'fiat_received' },
            { label: 'Crypto Received', value: 'crypto_received' },
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
          label: 'Target Address',
          admin: {
            condition: (data) => data.type === 'fiat_to_crypto',
            description: 'Destination wallet address for the transfer',
            width: '50%',
          },
          validate: (val: string | null | undefined, { data }: { data: { type?: string } }) => {
            if (data?.type === 'fiat_to_crypto' && !val) {
              return 'Target address is required for fiat to crypto transfers'
            }
            return true
          },
        },
        {
          name: 'bankDetails',
          type: 'text',
          label: 'Bank Details',
          admin: {
            condition: (data) => data.type === 'crypto_to_fiat',
            description: 'Bank Name, Account Number, and Account Name',
            width: '50%',
          },
          validate: (val: string | null | undefined, { data }: { data: { type?: string } }) => {
            if (data?.type === 'crypto_to_fiat' && !val) {
              return 'Bank details are required for crypto to fiat transfers'
            }
            return true
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
    {
      name: 'notes',
      type: 'textarea',
      label: 'Description / Notes',
      admin: {
        description:
          'Optional notes for context when this transaction is created manually in admin or through API integration.',
      },
    },
    {
      name: 'receivedRecord',
      type: 'relationship',
      relationTo: FIAT_TO_CRYPTO_COLLECTION_SLUG,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'sendingRecord',
      type: 'relationship',
      relationTo: CRYPTO_TO_FIAT_COLLECTION_SLUG,
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (data) => Boolean(data?.id),
      },
    },
  ],
  timestamps: true,
}
