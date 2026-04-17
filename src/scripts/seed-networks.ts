import 'dotenv/config'
import payload from 'payload'
import config from '../payload.config'

// ─────────────────────────────────────────────
// Network seed data – EVM mainnet networks
// Includes ETH, BASE, BNB, POLYGON
// Each entry carries both USDT & USDC addresses
// ─────────────────────────────────────────────

interface NetworkSeed {
  name: string
  symbol: string
  networkType: 'mainnet' | 'testnet'
  rpcUrl: string
  chainId: number
  usdtContractAddress: string
  usdtDecimals: number
  usdcContractAddress?: string // informational – extend schema if needed
  usdcDecimals?: number
  gasFeeTokenName: string
  isActive: boolean
}

const networks: NetworkSeed[] = [
  // ── Ethereum Mainnet ──────────────────────────────────────────────────────
  {
    name: 'Ethereum',
    symbol: 'eth',
    networkType: 'mainnet',
    rpcUrl: 'https://ethereum.publicnode.com',
    chainId: 1,
    // USDT (Tether) on Ethereum – 6 decimals
    usdtContractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    usdtDecimals: 6,
    // USDC on Ethereum – 6 decimals
    usdcContractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdcDecimals: 6,
    gasFeeTokenName: 'ETH',
    isActive: true,
  },

  // ── Base Mainnet (Coinbase L2) ────────────────────────────────────────────
  {
    name: 'Base',
    symbol: 'base',
    networkType: 'mainnet',
    rpcUrl: 'https://mainnet.base.org',
    chainId: 8453,
    // USDT on Base – 6 decimals
    usdtContractAddress: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    usdtDecimals: 6,
    // USDC on Base (native) – 6 decimals
    usdcContractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    usdcDecimals: 6,
    gasFeeTokenName: 'ETH',
    isActive: true,
  },

  // ── BNB Smart Chain (BSC) Mainnet ─────────────────────────────────────────
  {
    name: 'BNB Smart Chain',
    symbol: 'bep20',
    networkType: 'mainnet',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    chainId: 56,
    // USDT on BSC – 18 decimals (unusual for USDT but correct for BEP-20)
    usdtContractAddress: '0x55d398326f99059fF775485246999027B3197955',
    usdtDecimals: 18,
    // USDC on BSC – 18 decimals
    usdcContractAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    usdcDecimals: 18,
    gasFeeTokenName: 'BNB',
    isActive: true,
  },

  // ── Polygon (MATIC) Mainnet ───────────────────────────────────────────────
  {
    name: 'Polygon',
    symbol: 'polygon',
    networkType: 'mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137,
    // USDT on Polygon – 6 decimals
    usdtContractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    usdtDecimals: 6,
    // USDC on Polygon (native bridged) – 6 decimals
    usdcContractAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    usdcDecimals: 6,
    gasFeeTokenName: 'POL',
    isActive: true,
  },

  // ── Tron Mainnet ──────────────────────────────────────────────────────────
  {
    name: 'Tron',
    symbol: 'trc20',
    networkType: 'mainnet',
    rpcUrl: 'https://api.trongrid.io', // standard public RPC for Tron
    chainId: 728126428, // Informational (Tron mainnet)
    // USDT on Tron – 6 decimals
    usdtContractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    usdtDecimals: 6,
    // USDC on Tron – 6 decimals
    usdcContractAddress: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
    usdcDecimals: 6,
    gasFeeTokenName: 'TRX',
    isActive: true,
  },

  // ── Arbitrum One Mainnet ──────────────────────────────────────────────────
  {
    name: 'Arbitrum One',
    symbol: 'arbitrum',
    networkType: 'mainnet',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
    // USDT on Arbitrum – 6 decimals
    usdtContractAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    usdtDecimals: 6,
    // USDC on Arbitrum (native) – 6 decimals
    usdcContractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    usdcDecimals: 6,
    gasFeeTokenName: 'ETH',
    isActive: true,
  },

  // ── Optimism Mainnet ──────────────────────────────────────────────────────
  {
    name: 'Optimism',
    symbol: 'optimism',
    networkType: 'mainnet',
    rpcUrl: 'https://mainnet.optimism.io',
    chainId: 10,
    // USDT on Optimism – 6 decimals
    usdtContractAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    usdtDecimals: 6,
    // USDC on Optimism (native) – 6 decimals
    usdcContractAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    usdcDecimals: 6,
    gasFeeTokenName: 'ETH',
    isActive: true,
  },

  // ── Avalanche C-Chain ─────────────────────────────────────────────────────
  {
    name: 'Avalanche C-Chain',
    symbol: 'avalanche',
    networkType: 'mainnet',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    chainId: 43114,
    // USDT on Avalanche – 6 decimals
    usdtContractAddress: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    usdtDecimals: 6,
    // USDC on Avalanche – 6 decimals
    usdcContractAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    usdcDecimals: 6,
    gasFeeTokenName: 'AVAX',
    isActive: true,
  },

  // ── Solana Mainnet ────────────────────────────────────────────────────────
  {
    name: 'Solana',
    symbol: 'solana',
    networkType: 'mainnet',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    chainId: 101, // Informational genesis hash identifier pseudo-chainId
    // USDT on Solana – 6 decimals
    usdtContractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    usdtDecimals: 6,
    // USDC on Solana – 6 decimals
    usdcContractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    usdcDecimals: 6,
    gasFeeTokenName: 'SOL',
    isActive: true,
  },
]

// ─────────────────────────────────────────────
// Seed runner
// ─────────────────────────────────────────────

async function seed() {
  await payload.init({ config })

  console.log('\n🌱  Seeding networks...\n')

  for (const network of networks) {
    const { usdcContractAddress, usdcDecimals, chainId: _chainId, ...payloadFields } = network

    try {
      // Check for existing record to avoid duplicates
      const existing = await payload.find({
        collection: 'networks',
        where: { symbol: { equals: payloadFields.symbol } },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        console.log(`  ⚠️  Skipped  – ${payloadFields.name} (already exists)`)
        continue
      }

      await payload.create({
        collection: 'networks',
        data: payloadFields,
      })

      console.log(`  ✅ Inserted – ${payloadFields.name} (${payloadFields.symbol.toUpperCase()})`)
      console.log(
        `      USDT: ${payloadFields.usdtContractAddress}  [${payloadFields.usdtDecimals} decimals]`,
      )
      if (usdcContractAddress) {
        console.log(`      USDC: ${usdcContractAddress}  [${usdcDecimals} decimals]`)
      }
    } catch (err) {
      console.error(`  ❌ Failed  – ${payloadFields.name}:`, err)
    }
  }

  console.log('\n✨  Done seeding networks.\n')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed script crashed:', err)
  process.exit(1)
})
