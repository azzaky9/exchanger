import {
  CRYPTO_TO_FIAT_COLLECTION_SLUG,
  FIAT_TO_CRYPTO_COLLECTION_SLUG,
} from '@/lib/collectionSlugs'
import crypto from 'node:crypto'
import type { CollectionConfig } from 'payload'
import { checkSettlementEndpoint } from '../endpoints/checkSettlement'
import { confirmTransactionArrivalEndpoint } from '../endpoints/confirmTransactionArrival'
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
    confirmTransactionArrivalEndpoint,
  ],
  admin: {
    useAsTitle: 'id',
    hidden: ({ user }) => !user?.roles?.includes('admin'),
    defaultColumns: [
      'id',
      'type',
      'status',
      'confirmArrivalAction',
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
    // Keep edit form read-only; updates should happen through controlled endpoints/workers.
    update: () => false,
    delete: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data

        // Freeze and reuse rates captured at transaction creation so later edits to
        // the exchange-rate document do not retroactively alter old transactions.
        if (operation === 'create' && data.exchangeRate) {
          try {
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

              const txType = data.type as 'fiat_to_crypto' | 'crypto_to_fiat' | undefined

              if (txType === 'crypto_to_fiat') {
                data.referenceRateSnapshot = usdtToPhpReferenceRate
                data.rateSnapshot = usdtToPhpReferenceRate
                data.appliedRateSnapshot = usdtToPhpRate
              } else if (txType === 'fiat_to_crypto') {
                data.referenceRateSnapshot = phpToUsdtReferenceRate
                data.rateSnapshot = phpToUsdtReferenceRate
                data.appliedRateSnapshot = phpToUsdtRate
              }
            }
          } catch (err) {
            req.payload.logger.error(`Error resolving exchange rate values: ${err}`)
          }
        }

        const amountSource = Number(data.amountPhp ?? originalDoc?.amountPhp ?? 0)
        const txType = (data.type ?? originalDoc?.type) as
          | 'fiat_to_crypto'
          | 'crypto_to_fiat'
          | undefined
        const legacyUsdtToPhpReferenceRate = Number(
          data.usdtToPhpReferenceRateSnapshot ?? originalDoc?.usdtToPhpReferenceRateSnapshot ?? 0,
        )
        const legacyPhpToUsdtReferenceRate = Number(
          data.phpToUsdtReferenceRateSnapshot ?? originalDoc?.phpToUsdtReferenceRateSnapshot ?? 0,
        )
        const legacyUsdtToPhpRate = Number(
          data.usdtToPhpRateSnapshot ?? originalDoc?.usdtToPhpRateSnapshot ?? 0,
        )
        const legacyPhpToUsdtRate = Number(
          data.phpToUsdtRateSnapshot ?? originalDoc?.phpToUsdtRateSnapshot ?? 0,
        )

        const referenceRate = Number(
          data.rateSnapshot ??
            originalDoc?.rateSnapshot ??
            data.referenceRateSnapshot ??
            originalDoc?.referenceRateSnapshot ??
            (txType === 'crypto_to_fiat'
              ? legacyUsdtToPhpReferenceRate
              : legacyPhpToUsdtReferenceRate),
        )
        const appliedRate = Number(
          data.appliedRateSnapshot ??
            originalDoc?.appliedRateSnapshot ??
            (txType === 'crypto_to_fiat' ? legacyUsdtToPhpRate : legacyPhpToUsdtRate) ??
            data.rateSnapshot ??
            originalDoc?.rateSnapshot ??
            0,
        )

        if (amountSource > 0 && txType && (referenceRate > 0 || appliedRate > 0)) {
          let amountAtOriginalRate = 0
          let amountFinal = 0
          let profit = 0

          if (txType === 'crypto_to_fiat') {
            // User sends USDT (amountPhp), receives PHP (amountUsdt)
            // Keep this field in USDT for both transaction types.
            // For crypto_to_fiat, this tracks the original-rate USDT equivalent
            // of the final PHP payout, so it can be lower than user input when
            // applied rate is below the reference rate.
            amountFinal = amountSource * appliedRate
            amountAtOriginalRate = referenceRate > 0 ? amountFinal / referenceRate : amountSource
            const amountFinalAtReferenceRatePhp = amountSource * referenceRate
            const profitPhp = amountFinalAtReferenceRatePhp - amountFinal

            // Profit is always stored in USDT for consistency across transaction types.
            // Convert PHP spread back to USDT using the reference/original rate snapshot.
            profit = referenceRate > 0 ? profitPhp / referenceRate : 0

            // USDT handles 6 decimal places
            data.amountUsdtOriginal = Math.round(amountAtOriginalRate * 1000000) / 1000000
            data.amountUsdt = Math.round(amountFinal * 100) / 100
            data.profit = Math.round(profit * 1000000) / 1000000
          } else {
            // User sends PHP (amountPhp), receives USDT (amountUsdt)
            amountAtOriginalRate = amountSource * referenceRate
            amountFinal = amountSource * appliedRate
            profit = amountAtOriginalRate - amountFinal

            // USDT handles 6 decimal places
            data.amountUsdtOriginal = Math.round(amountAtOriginalRate * 1000000) / 1000000
            data.amountUsdt = Math.round(amountFinal * 1000000) / 1000000
            data.profit = Math.round(profit * 1000000) / 1000000
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
          status: 'pending' as const,
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
              const receivedUpdateData = {
                currency: fiatToCryptoReceivedData.currency,
                transaction: fiatToCryptoReceivedData.transaction,
                method: fiatToCryptoReceivedData.method,
                txHash: fiatToCryptoReceivedData.txHash,
                ...(typeof fiatToCryptoReceivedData.amount === 'number'
                  ? { amount: fiatToCryptoReceivedData.amount }
                  : {}),
              }

              await payload.update({
                collection: FIAT_TO_CRYPTO_COLLECTION_SLUG,
                id: receivedRecordId,
                data: receivedUpdateData,
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
              const sendingUpdateData = {
                currency: cryptoToFiatSendingData.currency,
                transaction: cryptoToFiatSendingData.transaction,
                method: cryptoToFiatSendingData.method,
                txHash: cryptoToFiatSendingData.txHash,
                ...(typeof cryptoToFiatSendingData.amount === 'number'
                  ? { amount: cryptoToFiatSendingData.amount }
                  : {}),
              }

              await payload.update({
                collection: CRYPTO_TO_FIAT_COLLECTION_SLUG,
                id: sendingRecordId,
                data: sendingUpdateData,
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
    beforeDelete: [
      async ({ req, id }) => {
        if (!id) return

        // Remove dependent operation records first to avoid FK/relation delete conflicts.
        await req.payload.delete({
          collection: FIAT_TO_CRYPTO_COLLECTION_SLUG,
          where: {
            transaction: {
              equals: id,
            },
          },
          req,
          overrideAccess: true,
        })

        await req.payload.delete({
          collection: CRYPTO_TO_FIAT_COLLECTION_SLUG,
          where: {
            transaction: {
              equals: id,
            },
          },
          req,
          overrideAccess: true,
        })
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
          type: 'textarea',
          label: 'Bank Details',
          admin: {
            condition: (data) => data.type === 'crypto_to_fiat',
            description: 'Structured payout details (Account Name and Account Number).',
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
          label: 'Amount Sent to Exchange (USDT)',
          access: {
            read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
          },
          hooks: {
            afterRead: [
              ({ value, siblingData }) => {
                const txType = siblingData?.type as 'fiat_to_crypto' | 'crypto_to_fiat' | undefined
                const numeric = Number(value ?? 0)

                // Prefer stored value. This preserves computed values for crypto_to_fiat
                // where amountUsdtOriginal may be lower than user input after spread.
                if (numeric > 0) {
                  return Math.round(numeric * 1000000) / 1000000
                }

                // Legacy fallback for old rows missing amountUsdtOriginal.
                if (txType === 'crypto_to_fiat') {
                  const amountFinalPhp = Number(siblingData?.amountUsdt ?? 0)
                  const referenceRate = Number(
                    siblingData?.referenceRateSnapshot ??
                      siblingData?.usdtToPhpReferenceRateSnapshot ??
                      0,
                  )

                  if (amountFinalPhp > 0 && referenceRate > 0) {
                    return Math.round((amountFinalPhp / referenceRate) * 1000000) / 1000000
                  }
                }

                return value
              },
            ],
          },
          admin: {
            step: 0.000001,
            description: 'USDT amount sent to exchange at original/reference context.',
            readOnly: true,
            width: '50%',
            components: {
              Label: '/components/DynamicAmountLabel#AmountOriginalLabel',
              Cell: '/components/AmountSentToExchangeUsdtCell#AmountSentToExchangeUsdtCell',
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
      type: 'row',
      fields: [
        {
          name: 'rateSnapshot',
          type: 'number',
          label: 'Rate',
          admin: {
            readOnly: true,
            width: '50%',
            components: {
              Label: '/components/DynamicAmountLabel#RateLabel',
              Field: '/components/RateSnapshotField#RateSnapshotField',
              Cell: '/components/RateSnapshotCell#RateSnapshotCell',
            },
          },
        },
        {
          name: 'referenceRateSnapshot',
          type: 'number',
          admin: {
            hidden: true,
            readOnly: true,
            condition: () => false,
          },
        },
        {
          name: 'appliedRateSnapshot',
          type: 'number',
          admin: {
            hidden: true,
            readOnly: true,
            condition: () => false,
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'usdtToPhpReferenceRateSnapshot',
          type: 'number',
          admin: {
            hidden: true,
            readOnly: true,
            condition: () => false,
          },
        },
        {
          name: 'usdtToPhpRateSnapshot',
          type: 'number',
          admin: {
            hidden: true,
            readOnly: true,
            condition: () => false,
          },
        },
        {
          name: 'phpToUsdtReferenceRateSnapshot',
          type: 'number',
          admin: {
            hidden: true,
            readOnly: true,
            condition: () => false,
          },
        },
        {
          name: 'phpToUsdtRateSnapshot',
          type: 'number',
          admin: {
            hidden: true,
            readOnly: true,
            condition: () => false,
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
              Cell: '/components/ProfitUsdtCell#ProfitUsdtCell',
            },
          },
        },
      ],
    },
    {
      name: 'confirmArrivalAction',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (data, _, { user }) =>
          Boolean(data?.id) &&
          Boolean(user?.roles?.includes('admin')) &&
          (data?.status === 'fiat_received' ||
            data?.status === 'crypto_received' ||
            data?.status === 'processing' ||
            data?.status === 'confirmed' ||
            data?.status === 'completed'),
        components: {
          Field: '/components/ConfirmArrivalStatusButton#ConfirmArrivalStatusButton',
          Cell: '/components/ConfirmArrivalStatusCell#ConfirmArrivalStatusCell',
        },
      },
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
      name: 'invoiceImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Invoice Image',
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (data) => Boolean(data?.id),
        description: 'Attached from Confirm Sending or Confirm Done actions.',
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
        hidden: true,
      },
    },
  ],
  timestamps: true,
}
