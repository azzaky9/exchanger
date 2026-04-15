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
  plugins: [
    ...(shouldUseS3Storage
      ? [
          s3Storage({
            collections: {
              media: true,
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
