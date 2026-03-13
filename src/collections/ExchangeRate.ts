import type { CollectionConfig } from 'payload'
import { getPhpToUsdRate } from '../lib/exchangeRate'
import { APIError } from 'payload'
export const ExchangeRate: CollectionConfig = {
  slug: 'exchange-rates',
  labels: {
    singular: 'Exchange Rate',
    plural: 'Exchange Rates',
  },
  admin: {
    useAsTitle: 'id',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    update: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    delete: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
  },
  endpoints: [
    {
      path: '/live',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          throw new APIError('Unauthorized', 401)
        }
        
        try {
          const rate = await getPhpToUsdRate()
          return Response.json({ rate })
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 })
        }
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.originalExchangeRate && data.markupExchangeRate) {
          // When using PHP/USD (e.g. 0.0177), a lower markup rate (e.g. 0.0170) means MORE profit.
          // To display this as a positive percentage to the user, we calculate the profit margin:
          // (original - markup) / original * 100
          const diff = data.originalExchangeRate - data.markupExchangeRate
          const percentage = (diff / data.originalExchangeRate) * 100
          data.markupPercentage = Math.round(percentage * 100) / 100
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
      name: 'originalExchangeRate',
      label: 'Original Exchange Rate',
      type: 'number',
      required: true,
    },
    {
      name: 'markupExchangeRate',
      label: 'Markup Exchange Rate',
      type: 'number',
      required: true,
    },
    {
      name: 'markupPercentage',
      label: 'Markup Percentage (%)',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Auto-calculated percentage difference',
      },
    },
  ],
  timestamps: true,
}
