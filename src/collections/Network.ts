import type { CollectionConfig } from 'payload'
import { availableNetworksEndpoint } from '../endpoints/availableNetworks'

export const Network: CollectionConfig = {
  slug: 'networks',
  endpoints: [availableNetworksEndpoint],
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'symbol', 'isActive', 'createdAt'],
    group: 'Settings',
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
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      label: 'Network Name',
      admin: {
        description: 'e.g. Ethereum, BEP20, Tron, Polygon',
      },
    },
    {
      name: 'symbol',
      type: 'text',
      required: true,
      unique: true,
      label: 'Symbol',
      admin: {
        description: 'e.g. eth, bep20, trx, polygon',
      },
    },
    {
      name: 'networkType',
      type: 'select',
      required: true,
      label: 'Network Type',
      options: [
        { label: 'Mainnet', value: 'mainnet' },
        { label: 'Testnet', value: 'testnet' },
      ],
    },
    {
      name: 'rpcUrl',
      type: 'text',
      required: true,
      label: 'RPC URL',
      admin: {
        description: 'JSON-RPC endpoint for this network (e.g. https://bsc-dataseed.binance.org)',
      },
    },
    {
      name: 'usdtContractAddress',
      type: 'text',
      required: true,
      label: 'USDT Contract Address',
      admin: {
        description: 'USDT token contract address on this network',
      },
    },
    {
      name: 'usdtDecimals',
      type: 'number',
      required: true,
      label: 'USDT Decimals',
      defaultValue: 6,
      admin: {
        description:
          'Number of decimals for USDT on this network (e.g. 6 for Ethereum/Tron, 18 for BSC)',
      },
    },
    {
      name: 'gasFeeTokenName',
      type: 'text',
      required: true,
      label: 'Gas Fee Token Name',
      admin: {
        description: 'e.g. ETH, BNB, TRX, MATIC',
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
