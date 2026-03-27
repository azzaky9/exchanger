import type { CollectionConfig } from 'payload'
import { encrypt } from '../lib/encryption'
import { depositAddressEndpoint } from '@/endpoints/getDepositAddress'

export const Treasury: CollectionConfig = {
  slug: 'treasury',
  admin: {
    useAsTitle: 'walletAddress',
    defaultColumns: ['walletAddress', 'network', 'currentBalance', 'latestTransactionAt'],
    group: 'Wallets',
    hidden: ({ user }) => !user?.roles?.includes('admin'),
  },
  endpoints: [depositAddressEndpoint],
  access: {
    create: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    update: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    delete: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (!data) return data

        // Encrypt privateKey on create or when explicitly updated
        if (data.privateKey && (operation === 'create' || !data.privateKey.startsWith('enc:'))) {
          return {
            ...data,
            privateKey: 'enc:' + encrypt(data.privateKey),
          }
        }

        return data
      },
    ],
    afterRead: [
      ({ doc, context }) => {
        // Mask the private key in API responses — never expose raw or encrypted value
        // Allow internal reads (e.g. collector worker) to access the encrypted key
        if (doc.privateKey && !context?.skipPrivateKeyMask) {
          doc.privateKey = '••••••••'
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'walletName',
      type: 'text',
      label: 'Wallet Name or Identifier',
      unique: true,
      required: true,
      defaultValue: () => `Wallet-${Date.now()}`,
      admin: {
        description: "A friendly name to identify this wallet (e.g. 'Main USDT Wallet')",
      },
    },
    {
      name: 'walletAddress',
      type: 'text',
      required: true,
      unique: true,
      label: 'Wallet Address',
      admin: {
        description: 'Public address of your system wallet',
      },
    },
    {
      name: 'privateKey',
      type: 'text',
      required: false,
      label: 'Private Key',
      admin: {
        description: 'Encrypted at rest. Enter the raw private key — it will be encrypted on save.',
      },
      access: {
        read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
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
      name: 'currentBalance',
      type: 'number',
      label: 'Current Balance',
      admin: {
        description: 'Track available funds',
        step: 0.000001,
      },
    },
    {
      name: 'latestTransactionAt',
      type: 'date',
      label: 'Latest Transaction At',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Latest transaction from this wallet',
      },
    },
  ],
}
