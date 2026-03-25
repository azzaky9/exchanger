import type { CollectionConfig } from 'payload'
import { getExchangeRateEndpoint, getExchangeRatePublic } from '@/endpoints/getExchangeRate'

const isAdmin = ({ req: { user } }: { req: { user?: { roles?: string[] } } }) =>
  user?.roles?.includes('admin') ?? false

export const ExchangeRate: CollectionConfig = {
  slug: 'exchange-rates',
  labels: {
    singular: 'Exchange Rate',
    plural: 'Exchange Rates',
  },
  admin: {
    hidden: ({ user }) => !user?.roles?.includes('admin'),
    useAsTitle: 'pair',
    defaultColumns: [
      'pair',
      'referenceRate',
      'usdtToPhpRate',
      'phpToUsdtRate',
      'usdtToPhpMarkupPercentage',
      'phpToUsdtMarkupPercentage',
      'updatedAt',
    ],
  },
  access: {
    read: () => true,
    create: isAdmin as any,
    update: isAdmin as any,
    delete: isAdmin as any,
  },
  endpoints: [getExchangeRateEndpoint, getExchangeRatePublic],
  hooks: {
    beforeChange: [
      ({ data }) => {
        const referenceRate = Number(data.referenceRate ?? 0)
        const usdtToPhpRate = Number(data.usdtToPhpRate ?? 0)
        const phpToUsdtRate = Number(data.phpToUsdtRate ?? 0)

        if (referenceRate > 0 && usdtToPhpRate > 0) {
          const diff = Math.abs(referenceRate - usdtToPhpRate)
          data.usdtToPhpMarkupPercentage = Math.round((diff / referenceRate) * 100 * 100) / 100
        }

        if (referenceRate > 0 && phpToUsdtRate > 0) {
          const impliedPhpToUsdt = 1 / referenceRate // convert referenceRate to same unit
          const diff = Math.abs(impliedPhpToUsdt - phpToUsdtRate)
          data.phpToUsdtMarkupPercentage = Math.round((diff / impliedPhpToUsdt) * 100 * 100) / 100
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'liveApiRate',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/LiveRateReference#LiveRateReference',
        },
      },
    },
    {
      name: 'pair',
      label: 'Currency Pair',
      type: 'text',
      required: true,
      defaultValue: 'USDT/PHP',
      unique: true,
      admin: {
        readOnly: true,
        description: 'Fixed pair for this exchange rate configuration.',
      },
    },
    {
      name: 'referenceRate',
      label: 'Reference Rate',
      type: 'number',
      required: true,
      admin: {
        description: 'Market/reference rate for 1 USDT in PHP.',
      },
    },
    {
      name: 'usdtToPhpRate',
      label: 'USDT → PHP Rate',
      type: 'number',
      required: true,
      admin: {
        description: 'Rate used when user sells USDT and receives PHP.',
      },
    },
    {
      name: 'phpToUsdtRate',
      label: 'PHP → USDT Rate',
      type: 'number',
      required: true,
      admin: {
        description: 'Rate used when user pays PHP and receives USDT.',
      },
    },
    {
      name: 'usdtToPhpMarkupPercentage',
      label: 'USDT → PHP Markup (%)',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Auto-calculated discount from reference rate.',
      },
    },
    {
      name: 'phpToUsdtMarkupPercentage',
      label: 'PHP → USDT Markup (%)',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Auto-calculated premium above reference rate.',
      },
    },
    {
      name: 'isActive',
      label: 'Active',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  timestamps: true,
}
