import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Treasury } from './collections/Treasury'
import { Transaction } from './collections/Transaction'
import { Batch } from './collections/Batch'
import { Network } from './collections/Network'
import { ExchangeRate } from './collections/ExchangeRate'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
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
  collections: [Users, Media, Network, Treasury, Transaction, Batch, ExchangeRate],
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
