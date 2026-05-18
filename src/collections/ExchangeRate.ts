import {
  getExchangeRateEndpoint,
  getExchangeRatePublic,
  getExchangeReferenceRate,
} from '@/endpoints/getExchangeRate'
import type { Access, CollectionConfig } from 'payload'

const isAdmin: Access = ({ req: { user } }) => user?.roles?.includes('admin') ?? false
const isAdminOrGic: Access = ({ req: { user } }) =>
  (user?.roles?.includes('admin') || user?.roles?.includes('gic')) ?? false

const roundToSixDecimals = (value: number) => Math.round(value * 1000000) / 1000000

const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100

export const ExchangeRate: CollectionConfig = {
  slug: 'exchange-rates',
  labels: {
    singular: 'Exchange Rate',
    plural: 'Exchange Rates',
  },
  admin: {
    hidden: ({ user }) =>
      !(user?.roles?.includes('admin') || user?.roles?.includes('gic')),
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
    read: isAdminOrGic,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  endpoints: [getExchangeRateEndpoint, getExchangeRatePublic, getExchangeReferenceRate],
  hooks: {
    /**
     * beforeChange computes the final rate for both directions using global flat fees.
     *
     * Formula (both sides):
     *   finalRate = referenceRate - spinzoFee - gicFee
     *
     * The custom UI component stamps `_lastEdited` onto the submission so
     * the hook knows which field was the source of truth:
     *   'spinzoFee' | 'gicFee' | 'usdtToPhpReferenceRate' | 'phpToUsdtReferenceRate'
     *     → fee or reference changed; derive the final rate
     *   'usdtToPhpRate' | 'phpToUsdtRate'
     *     → rate was typed directly (advanced override)
     *
     * If `_lastEdited` is absent (e.g. API calls without the UI) we fall back
     * to deriving the rate from fees (fee-first behaviour).
     */
    beforeChange: [
      ({ data }) => {
        const usdtToPhpReferenceRate = Number(data.usdtToPhpReferenceRate ?? 0)
        const phpToUsdtReferenceRate = Number(data.phpToUsdtReferenceRate ?? 0)
        const lastEdited: string | undefined = data._lastEdited
        delete data._lastEdited // never persist this sentinel

        // ── USDT → PHP side ──────────────────────────────────────────────────
        const usdtSpinzo = Number(data.usdtToPhpSpinzoFee ?? 0)
        const usdtGic = Number(data.usdtToPhpGicFee ?? 0)
        const usdtTotalFee = usdtSpinzo + usdtGic
        // Fees are flat rate-point adjustments. Direct subtraction from PHP rate.
        if (usdtToPhpReferenceRate > 0) {
          if (lastEdited === 'usdtToPhpRate') {
            // Admin typed the rate directly — do NOT override it.
          } else {
            // finalRate = refRate - spinzoFee - gicFee
            data.usdtToPhpRate = roundToSixDecimals(usdtToPhpReferenceRate - usdtTotalFee)
          }

          // spread = spinzoFee + gicFee (in rate-points / PHP)
          data.usdtToPhpSpread = roundToSixDecimals(usdtTotalFee)
          // spreadPct = (totalFee / usdtToPhpRefRate) * 100
          data.usdtToPhpSpreadPercentage = roundToTwoDecimals(
            (usdtTotalFee / usdtToPhpReferenceRate) * 100,
          )
        }

        // ── PHP → USDT side ──────────────────────────────────────────────────
        const phpSpinzo = Number(data.phpToUsdtSpinzoFee ?? 0)
        const phpGic = Number(data.phpToUsdtGicFee ?? 0)
        const phpTotalFee = phpSpinzo + phpGic
        // Fees are in the USDT→PHP unit. Convert proportionally so the spread
        // percentage is symmetric and the small USDT/PHP rate can't go negative.
        // Formula: finalRate = refRate × (1 - totalFee / usdtToPhpRefRate)
        if (phpToUsdtReferenceRate > 0 && usdtToPhpReferenceRate > 0) {
          const feeFraction = phpTotalFee / usdtToPhpReferenceRate

          if (lastEdited === 'phpToUsdtRate') {
            // Admin typed the rate directly — do NOT override it.
          } else {
            data.phpToUsdtRate = roundToSixDecimals(phpToUsdtReferenceRate * (1 - feeFraction))
          }

          // spread converted to USDT-per-PHP
          const phpToUsdtSpread = phpToUsdtReferenceRate * feeFraction
          data.phpToUsdtSpread = roundToSixDecimals(phpToUsdtSpread)
          // spreadPct is symmetric with USDT→PHP side
          data.phpToUsdtSpreadPercentage = roundToTwoDecimals(feeFraction * 100)
        }

        return data
      },
    ],
    /**
     * afterRead masks the Spinzo fee for GIC users.
     * GIC sees: referenceRate = (actual referenceRate - spinzoFee)
     *           spinzoFee = 0 (hidden)
     *           spread/spreadPct recalculated from gicFee only
     * The final rate stays the same — only the "baseline" shifts.
     */
    afterRead: [
      ({ doc, req }) => {
        const user = req.user
        if (!user) return doc
        // Only mask for GIC users; admins see everything
        if (user.roles?.includes('admin') || !user.roles?.includes('gic')) return doc

        const usdtToPhpSpinzo = Number(doc.usdtToPhpSpinzoFee ?? 0)
        const usdtToPhpGic = Number(doc.usdtToPhpGicFee ?? 0)
        const phpToUsdtSpinzo = Number(doc.phpToUsdtSpinzoFee ?? 0)
        const usdtToPhpRef = Number(doc.usdtToPhpReferenceRate ?? 0)
        const phpToUsdtRef = Number(doc.phpToUsdtReferenceRate ?? 0)

        // Mask USDT→PHP: shift reference down by spinzoFee
        if (usdtToPhpRef > 0) {
          doc.usdtToPhpReferenceRate = roundToSixDecimals(usdtToPhpRef - usdtToPhpSpinzo)
          doc.usdtToPhpSpread = roundToSixDecimals(usdtToPhpGic)
          doc.usdtToPhpSpreadPercentage = roundToTwoDecimals(
            (usdtToPhpGic / (usdtToPhpRef - usdtToPhpSpinzo)) * 100,
          )
        }

        // Mask PHP→USDT: proportional shift
        if (phpToUsdtRef > 0 && usdtToPhpRef > 0) {
          const spinzoFraction = phpToUsdtSpinzo / usdtToPhpRef
          const maskedPhpToUsdtRef = roundToSixDecimals(
            phpToUsdtRef * (1 - spinzoFraction),
          )
          doc.phpToUsdtReferenceRate = maskedPhpToUsdtRef
          const phpToUsdtGic = Number(doc.phpToUsdtGicFee ?? 0)
          const gicFraction = phpToUsdtGic / (usdtToPhpRef - phpToUsdtSpinzo)
          const phpToUsdtSpread = maskedPhpToUsdtRef * gicFraction
          doc.phpToUsdtSpread = roundToSixDecimals(phpToUsdtSpread)
          doc.phpToUsdtSpreadPercentage = roundToTwoDecimals(gicFraction * 100)
        }

        // Hide spinzoFee entirely
        doc.usdtToPhpSpinzoFee = 0
        doc.phpToUsdtSpinzoFee = 0

        return doc
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

    // ── Per-direction flat fee fields ──────────────────────────────────────────
    {
      name: 'usdtToPhpSpinzoFee',
      label: 'USDT→PHP Spinzo Fee',
      type: 'number',
      defaultValue: Number(process.env.SPINZO_DEFAULT_FEE ?? 0),
      required: true,
      access: {
        read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
      },
      admin: {
        hidden: true,
        description: 'Flat fee deducted from the USDT→PHP reference rate.',
      },
    },
    {
      name: 'usdtToPhpGicFee',
      label: 'USDT→PHP GIC Fee',
      type: 'number',
      defaultValue: Number(process.env.GIC_DEFAULT_FEE ?? 0),
      required: true,
      admin: {
        hidden: true,
        description: 'Flat fee deducted from the USDT→PHP reference rate.',
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
        condition: (_, __, { user }) => Boolean(user?.roles?.includes('admin')),
        components: {
          // Linked rate + fee editor for the USDT→PHP side
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
    // ── DEPRECATED: kept nullable until migration is done ──
    {
      name: 'usdtToPhpMarkupPercentage',
      label: 'USDT → PHP Markup (%) [DEPRECATED]',
      type: 'number',
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
      name: 'phpToUsdtSpinzoFee',
      label: 'PHP→USDT Spinzo Fee',
      type: 'number',
      defaultValue: Number(process.env.SPINZO_DEFAULT_FEE ?? 0),
      required: true,
      access: {
        read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
      },
      admin: {
        hidden: true,
        description: 'Flat fee deducted from the PHP→USDT reference rate.',
      },
    },
    {
      name: 'phpToUsdtGicFee',
      label: 'PHP→USDT GIC Fee',
      type: 'number',
      defaultValue: Number(process.env.GIC_DEFAULT_FEE ?? 0),
      required: true,
      admin: {
        hidden: true,
        description: 'Flat fee deducted from the PHP→USDT reference rate.',
      },
    },
    {
      name: 'phpToUsdtRateGroup',
      type: 'ui',
      admin: {
        condition: (_, __, { user }) => Boolean(user?.roles?.includes('admin')),
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
    // ── DEPRECATED: kept nullable until migration is done ──
    {
      name: 'phpToUsdtMarkupPercentage',
      label: 'PHP → USDT Markup (%) [DEPRECATED]',
      type: 'number',
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
     * Values: 'usdtToPhpRate' | 'phpToUsdtRate'
     *       | 'usdtToPhpReferenceRate' | 'phpToUsdtReferenceRate'
     *       | 'spinzoFee' | 'gicFee'
     *       | 'usdtToPhpSpinzoFee' | 'usdtToPhpGicFee'
     *       | 'phpToUsdtSpinzoFee' | 'phpToUsdtGicFee'
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
