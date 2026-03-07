import type { CollectionConfig } from 'payload'
import { convertPhpToUsdt } from '../lib/exchangeRate'
import { createExchangeEndpoint } from '../endpoints/createExchange'
import { fiatSettlementWebhookEndpoint } from '../endpoints/fiatSettlementWebhook'

export const Transaction: CollectionConfig = {
  slug: 'transactions',
  endpoints: [createExchangeEndpoint, fiatSettlementWebhookEndpoint],
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['amountPhp', 'amountUsdt', 'network', 'status', 'createdAt'],
    group: 'Operations',
  },
  access: {
    create: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    delete: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (!data?.amountPhp) return data

        const shouldCalculate =
          operation === 'create' || (operation === 'update' && data.amountPhp && !data.exchangeRate)

        if (!shouldCalculate) return data

        try {
          const conversion = await convertPhpToUsdt(data.amountPhp)

          console.log(
            `[Exchange] Converted ${data.amountPhp} PHP → ${conversion.amountUsdt} USDT (fee: ${conversion.feePercent}%, net: ${conversion.netAmountUsdt} USDT)`,
          )

          return {
            ...data,
            exchangeRate: conversion.rate,
            amountUsdt: conversion.amountUsdt,
            exchangeFeePercent: conversion.feePercent,
            exchangeFeeUsdt: conversion.feeUsdt,
            netAmountUsdt: conversion.netAmountUsdt,
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.error(`[Exchange] Failed to fetch rate: ${message}`)
          throw new Error(`Failed to fetch exchange rate: ${message}`)
        }
      },
    ],
  },
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
      },
    },
    {
      name: 'treasury',
      type: 'relationship',
      relationTo: 'treasury',
      required: true,
      label: 'Treasury Wallet',
      admin: {
        description: 'Source treasury wallet for the transfer',
      },
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
      name: 'amountPhp',
      type: 'number',
      required: true,
      label: 'Amount (PHP)',
      admin: {
        step: 0.01,
        description: 'Incoming PHP amount',
      },
    },
    {
      name: 'exchangeRate',
      type: 'number',
      label: 'Exchange Rate',
      admin: {
        step: 0.000001,
        description: 'Auto-fetched from ExchangeRate API (PHP to USD/USDT)',
        readOnly: true,
      },
    },
    {
      name: 'amountUsdt',
      type: 'number',
      label: 'Amount (USDT)',
      admin: {
        step: 0.000001,
        description: 'Gross USDT before company fee',
        readOnly: true,
      },
    },
    {
      name: 'exchangeFeePercent',
      type: 'number',
      label: 'Exchange Fee (%)',
      admin: {
        step: 0.01,
        description: 'Company exchange fee percentage',
        readOnly: true,
      },
    },
    {
      name: 'exchangeFeeUsdt',
      type: 'number',
      label: 'Exchange Fee (USDT)',
      admin: {
        step: 0.000001,
        description: 'Fee amount deducted in USDT',
        readOnly: true,
      },
    },
    {
      name: 'netAmountUsdt',
      type: 'number',
      label: 'Net Amount (USDT)',
      admin: {
        step: 0.000001,
        description: 'Amount sent to user after fee deduction',
        readOnly: true,
      },
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
      name: 'gasFee',
      type: 'number',
      label: 'Gas Fee',
      admin: {
        step: 0.000001,
        description: 'Transfer fee amount',
      },
    },
    {
      name: 'network',
      type: 'relationship',
      relationTo: 'networks',
      required: true,
      label: 'Network',
    },
    {
      name: 'targetAddress',
      type: 'text',
      required: true,
      label: 'Target Address',
      admin: {
        description: 'Destination wallet address for the transfer',
      },
    },
    {
      name: 'txHash',
      type: 'text',
      label: 'Transaction Hash',
      index: true,
      admin: {
        description: 'On-chain transaction hash after transfer',
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
