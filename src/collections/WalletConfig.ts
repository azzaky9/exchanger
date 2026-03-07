import type { CollectionConfig } from 'payload'

export const WalletConfig: CollectionConfig = {
  slug: 'wallet-config',
  admin: {
    useAsTitle: 'targetUsdtAddress',
    defaultColumns: ['targetUsdtAddress', 'admin', 'isActive', 'updatedAt'],
    group: 'Wallets',
    hidden: ({ user }) => !user?.roles?.includes('admin'),
  },
  access: {
    create: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    update: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    delete: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
  },
  fields: [
    {
      name: 'admin',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Admin',
    },
    {
      name: 'targetUsdtAddress',
      type: 'text',
      required: true,
      label: 'Target USDT Address',
      admin: {
        description: 'Admin-specified destination address',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Is Active',
    },
  ],
  timestamps: true,
}
