import { getExchangeRateEndpoint, getExchangeRatePublic } from '@/endpoints/getExchangeRate'
import type { Access, CollectionConfig } from 'payload'

const isAdmin: Access = ({ req: { user } }) => user?.roles?.includes('admin') ?? false

const roundToSixDecimals = (value: number) => Math.round(value * 1000000) / 1000000

const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100

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
      'usdtToPhpReferenceRate',
      'usdtToPhpRate',
      'usdtToPhpSpread',
      'phpToUsdtReferenceRate',
      'phpToUsdtRate',
      'phpToUsdtSpread',
      'updatedAt',
    ],
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  endpoints: [getExchangeRateEndpoint, getExchangeRatePublic],
  hooks: {
    /**
     * beforeChange resolves whichever field was the "source of truth" last.
     *
     * The custom UI component stamps `_lastEdited` onto the submission:
     *   'usdtToPhpRate'           → rate was typed; recalc percentage
     *   'usdtToPhpMarkupPercentage' → percentage was typed; recalc rate
     *   'phpToUsdtRate'           → rate was typed; recalc percentage
     *   'phpToUsdtMarkupPercentage' → percentage was typed; recalc rate
     *
     * If `_lastEdited` is absent (e.g. API calls without the UI) we fall back
     * to deriving percentages from the rates (original behaviour).
     */
    beforeChange: [
      ({ data }) => {
        const usdtToPhpReferenceRate = Number(data.usdtToPhpReferenceRate ?? 0)
        const phpToUsdtReferenceRate = Number(data.phpToUsdtReferenceRate ?? 0)
        const lastEdited: string | undefined = data._lastEdited
        delete data._lastEdited // never persist this sentinel

        // ── USDT → PHP side ──────────────────────────────────────────────────
        if (usdtToPhpReferenceRate > 0) {
          if (
            lastEdited === 'usdtToPhpMarkupPercentage' ||
            lastEdited === 'usdtToPhpReferenceRate'
          ) {
            // Percentage changed → derive rate
            const pct = Number(data.usdtToPhpMarkupPercentage ?? 0)
            // Selling USDT: user gets LESS PHP than market (discount for platform)
            data.usdtToPhpRate = roundToSixDecimals(usdtToPhpReferenceRate * (1 - pct / 100))
          } else {
            // Rate changed (or no sentinel) → derive percentage
            const usdtToPhpRate = Number(data.usdtToPhpRate ?? 0)
            if (usdtToPhpRate > 0) {
              const diff = Math.abs(usdtToPhpReferenceRate - usdtToPhpRate)
              data.usdtToPhpMarkupPercentage = roundToTwoDecimals(
                (diff / usdtToPhpReferenceRate) * 100,
              )
            }
          }

          const usdtToPhpRate = Number(data.usdtToPhpRate ?? 0)
          const usdtToPhpDiff = Math.abs(usdtToPhpReferenceRate - usdtToPhpRate)
          data.usdtToPhpSpread = roundToSixDecimals(usdtToPhpDiff)
          data.usdtToPhpSpreadPercentage = roundToTwoDecimals(
            usdtToPhpReferenceRate > 0 ? (usdtToPhpDiff / usdtToPhpReferenceRate) * 100 : 0,
          )
        }

        // ── PHP → USDT side ──────────────────────────────────────────────────
        if (phpToUsdtReferenceRate > 0) {
          if (
            lastEdited === 'phpToUsdtMarkupPercentage' ||
            lastEdited === 'phpToUsdtReferenceRate'
          ) {
            // Percentage changed → derive rate
            const pct = Number(data.phpToUsdtMarkupPercentage ?? 0)
            // Buying USDT: user gets LESS USDT per PHP than market (platform keeps margin)
            data.phpToUsdtRate = roundToSixDecimals(phpToUsdtReferenceRate * (1 - pct / 100))
          } else {
            // Rate changed (or no sentinel) → derive percentage
            const phpToUsdtRate = Number(data.phpToUsdtRate ?? 0)
            if (phpToUsdtRate > 0) {
              const diff = Math.abs(phpToUsdtReferenceRate - phpToUsdtRate)
              data.phpToUsdtMarkupPercentage = roundToTwoDecimals(
                (diff / phpToUsdtReferenceRate) * 100,
              )
            }
          }

          const phpToUsdtRate = Number(data.phpToUsdtRate ?? 0)
          const phpToUsdtDiff = Math.abs(phpToUsdtReferenceRate - phpToUsdtRate)
          data.phpToUsdtSpread = roundToSixDecimals(phpToUsdtDiff)
          data.phpToUsdtSpreadPercentage = roundToTwoDecimals(
            phpToUsdtReferenceRate > 0 ? (phpToUsdtDiff / phpToUsdtReferenceRate) * 100 : 0,
          )
        }

        return data
      },
    ],
  },
  fields: [
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

    // ── USDT → PHP group ───────────────────────────────────────────────────
    {
      name: 'usdtToPhpReferenceRate',
      label: 'USDT → PHP Reference Rate',
      type: 'number',
      required: true,
      admin: {
        hidden: true,
      },
    },

    {
      name: 'usdtToPhpRateGroup',
      type: 'ui',
      admin: {
        components: {
          // Linked rate+percentage editor for the USDT→PHP side
          Field: '/components/LinkedRateField#LinkedRateField',
        },
      },
    },

    {
      name: 'usdtToPhpRate',
      label: 'USDT → PHP Final Rate',
      type: 'number',
      required: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'usdtToPhpMarkupPercentage',
      label: 'USDT → PHP Markup (%)',
      type: 'number',
      defaultValue: 0,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'usdtToPhpSpread',
      label: 'USDT → PHP Profit / Spread',
      type: 'number',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'usdtToPhpSpreadPercentage',
      label: 'USDT → PHP Spread (%)',
      type: 'number',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'phpToUsdtReferenceRate',
      label: 'PHP → USDT Reference Rate',
      type: 'number',
      required: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'phpToUsdtSpread',
      label: 'PHP → USDT Profit / Spread',
      type: 'number',
      admin: {
        hidden: true,
      },
    },

    // ── PHP → USDT group ───────────────────────────────────────────────────
    {
      name: 'phpToUsdtRateGroup',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/LinkedRateField#LinkedRateFieldPhp',
        },
      },
    },

    {
      name: 'phpToUsdtRate',
      label: 'PHP → USDT Rate',
      type: 'number',
      required: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'phpToUsdtMarkupPercentage',
      label: 'PHP → USDT Markup (%)',
      type: 'number',
      defaultValue: 0,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'phpToUsdtSpreadPercentage',
      label: 'PHP → USDT Spread (%)',
      type: 'number',
      admin: {
        hidden: true,
      },
    },

    {
      name: 'isActive',
      label: 'Active',
      type: 'checkbox',
      defaultValue: true,
    },

    /**
     * Virtual sentinel field — never stored in the DB.
     * The LinkedRateField component writes the name of whichever field the
     * admin last edited here so the beforeChange hook can resolve conflicts.
     *
     * Values: 'usdtToPhpRate' | 'usdtToPhpMarkupPercentage'
     *       | 'usdtToPhpReferenceRate'
     *       | 'phpToUsdtRate' | 'phpToUsdtMarkupPercentage'
     *       | 'phpToUsdtReferenceRate'
     */
    {
      name: '_lastEdited',
      type: 'text',
      virtual: true,
      admin: { hidden: true },
    },
  ],
  timestamps: true,
}
