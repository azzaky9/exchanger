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
    read: () => true,
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
        const referenceRate = Number(data.referenceRate ?? 0)
        const lastEdited: string | undefined = data._lastEdited
        delete data._lastEdited // never persist this sentinel

        // ── USDT → PHP side ──────────────────────────────────────────────────
        if (referenceRate > 0) {
          if (lastEdited === 'usdtToPhpMarkupPercentage') {
            // Percentage changed → derive rate
            const pct = Number(data.usdtToPhpMarkupPercentage ?? 0)
            // Selling USDT: user gets LESS PHP than market (discount for platform)
            data.usdtToPhpRate = Math.round(referenceRate * (1 - pct / 100) * 10000) / 10000
          } else {
            // Rate changed (or no sentinel) → derive percentage
            const usdtToPhpRate = Number(data.usdtToPhpRate ?? 0)
            if (usdtToPhpRate > 0) {
              const diff = Math.abs(referenceRate - usdtToPhpRate)
              data.usdtToPhpMarkupPercentage = Math.round((diff / referenceRate) * 100 * 100) / 100
            }
          }
        }

        // ── PHP → USDT side ──────────────────────────────────────────────────
        if (referenceRate > 0) {
          // Base: how many USDT per 1 PHP at market rate
          const impliedPhpToUsdt = 1 / referenceRate

          if (lastEdited === 'phpToUsdtMarkupPercentage') {
            // Percentage changed → derive rate
            const pct = Number(data.phpToUsdtMarkupPercentage ?? 0)
            // Buying USDT: user gets LESS USDT per PHP than market (platform keeps margin)
            data.phpToUsdtRate = Math.round(impliedPhpToUsdt * (1 - pct / 100) * 1e8) / 1e8
          } else {
            // Rate changed (or no sentinel) → derive percentage
            const phpToUsdtRate = Number(data.phpToUsdtRate ?? 0)
            if (phpToUsdtRate > 0) {
              const diff = Math.abs(impliedPhpToUsdt - phpToUsdtRate)
              data.phpToUsdtMarkupPercentage =
                Math.round((diff / impliedPhpToUsdt) * 100 * 100) / 100
            }
          }
        }

        return data
      },
    ],
  },
  fields: [
    // Live rate banner (read-only UI component)
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
      label: 'Reference Rate (1 USDT = ? PHP)',
      type: 'number',
      required: true,
      admin: {
        description:
          'Market/reference rate for 1 USDT in PHP. Changing this recalculates both rates automatically.',
      },
    },

    // ── USDT → PHP group ───────────────────────────────────────────────────
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
        description: 'Final rate used when user sells USDT and receives PHP.',
      },
    },
    {
      name: 'usdtToPhpSpread',
      label: 'USDT → PHP Profit / Spread',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Real-time difference between the reference and final rate.',
      },
    },
    {
      name: 'usdtToPhpSpreadPercentage',
      label: 'USDT → PHP Spread (%)',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Spread expressed as a percentage of the reference rate.',
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
     *       | 'phpToUsdtRate' | 'phpToUsdtMarkupPercentage'
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
