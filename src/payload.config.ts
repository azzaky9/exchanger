import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
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

export default buildConfig({
  admin: {
    user: Users.slug,
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
  plugins: [],
})
