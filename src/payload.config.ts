import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Batch } from './collections/Batch'
import { Sending } from './collections/CryptoToFiat'
import { ExchangeRate } from './collections/ExchangeRate'
import { Received } from './collections/FiatToCrypto'
import { Media } from './collections/Media'
import { Network } from './collections/Network'
import { Transaction } from './collections/Transaction'
import { Treasury } from './collections/Treasury'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const s3Bucket = process.env.S3_BUCKET
const s3AccessKey = process.env.S3_ACCESS_KEY || process.env.S3_ACCESS_KEY_ID
const s3SecretKey = process.env.S3_SECRET_KEY || process.env.S3_SECRET_ACCESS_KEY
const s3Endpoint = process.env.S3_HOST
const s3PublicHost = process.env.S3_HOST_BUCKET

const shouldUseS3Storage = Boolean(
  s3Bucket && s3AccessKey && s3SecretKey && (s3Endpoint || s3PublicHost),
)

export default buildConfig({
  admin: {
    user: Users.slug,
    theme: 'dark',
    components: {
      graphics: {
        Logo: '/components/AdminBranding#AdminLogo',
        Icon: '/components/AdminBranding#AdminIcon',
      },
      views: {
        financeDashboard: {
          Component: '/components/FinanceDashboard#FinanceDashboardView',
          path: '/finance',
        },
      },
      beforeNavLinks: ['/components/FinanceNavLink#FinanceNavLink'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Media,
    Network,
    Treasury,
    Transaction,
    Batch,
    ExchangeRate,
    Received,
    Sending,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  jobs: {
    tasks: [
      {
        slug: 'disableExchangeRate',
        handler: async ({ req }) => {
          // `req.payload` is the correct way to access the Payload Local API inside a task handler.
          // `input` only contains data you explicitly pass when queuing the job — not payload itself.
          const { payload } = req
          const exchangeRateRes = await payload.find({
            collection: 'exchange-rates',
            limit: 1,
            sort: '-updatedAt',
            overrideAccess: true,
          })
          if (exchangeRateRes.docs.length === 0) {
            throw new Error('No exchange rate configured')
          }

          if (!exchangeRateRes.docs[0].isActive) {
            payload.logger.info(
              '[disableExchangeRate] Exchange rate is already disabled per 15 minutes.',
            )
            return { output: { success: true } }
          }

          const currentRate = exchangeRateRes.docs[0]
          await payload.update({
            collection: 'exchange-rates',
            id: currentRate.id,
            data: { isActive: false },
            overrideAccess: true,
          })

          payload.logger.info(`[disableExchangeRate] Exchange rate ${currentRate.pair} disabled.`)
          return { output: { success: true } }
        },
        onSuccess: async ({ req }) => {
          req.payload.logger.info('[disableExchangeRate] Task completed successfully.')
        },
        schedule: [
          {
            // Jobs are queued to 'scheduled' every minute by this cron.
            // They only *execute* once autoRun (below) polls the queue.
            cron: '*/15 * * * *',
            queue: 'scheduled',
          },
        ],
      },
    ],
    // autoRun polls the 'scheduled' queue every minute and actually executes pending jobs.
    // Without this, jobs accumulate in the database but never run.
    autoRun: [
      {
        cron: '*/15 * * * *',
        queue: 'scheduled',
      },
    ],
  },

  plugins: [
    ...(shouldUseS3Storage
      ? [
          s3Storage({
            collections: {
              media: {
                prefix: process.env.S3_ROOT_PATH
              },
            },
            bucket: s3Bucket || '',
            config: {
              // Vultr Object Storage uses an S3-compatible endpoint.
              region: process.env.S3_REGION || 'auto',
              endpoint: s3Endpoint
                ? `https://${s3Endpoint}`
                : s3PublicHost
                  ? `https://${s3PublicHost}`
                  : undefined,
              forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
              credentials: {
                accessKeyId: s3AccessKey || '',
                secretAccessKey: s3SecretKey || '',
              },
            },
          }),
        ]
      : []),
  ],
})
