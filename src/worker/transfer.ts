import {
  createWalletClient,
  http,
  nonceManager,
  parseUnits,
  encodeFunctionData,
  type Hex,
  type Address,
  type WalletClient,
  type Transport,
  type Chain,
} from 'viem'
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import type { TransferJobData } from './queues.js'

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

// Cache account instances per private key so concurrent transfers share the same nonceManager
const accountCache = new Map<string, PrivateKeyAccount>()
// Cache wallet clients per account+rpc combination
const clientCache = new Map<string, WalletClient<Transport, Chain | undefined, PrivateKeyAccount>>()

function getOrCreateAccount(decryptedPrivateKey: string): PrivateKeyAccount {
  const privateKeyHex = (
    decryptedPrivateKey.startsWith('0x') ? decryptedPrivateKey : `0x${decryptedPrivateKey}`
  ) as Hex

  const existing = accountCache.get(privateKeyHex)
  if (existing) return existing

  const account = privateKeyToAccount(privateKeyHex, { nonceManager })
  accountCache.set(privateKeyHex, account)
  return account
}

function getOrCreateClient(
  account: PrivateKeyAccount,
  rpcUrl: string,
): WalletClient<Transport, Chain | undefined, PrivateKeyAccount> {
  const cacheKey = `${account.address}:${rpcUrl}`
  const existing = clientCache.get(cacheKey)
  if (existing) return existing

  const client = createWalletClient({
    account,
    transport: http(rpcUrl),
  })
  clientCache.set(cacheKey, client)
  return client
}

/**
 * Execute a USDT transfer on the specified EVM network using viem.
 * The decrypted private key is provided in the job data.
 *
 * Account and client instances are cached so that concurrent transfers
 * from the same wallet share viem's built-in nonceManager, preventing
 * "nonce already known" errors.
 */
export async function executeTransfer(data: TransferJobData): Promise<{ txHash: string }> {
  const {
    networkSymbol,
    networkRpcUrl,
    targetAddress,
    amountUsdt,
    treasuryWalletAddress,
    usdtContractAddress,
    usdtDecimals,
    decryptedPrivateKey,
  } = data

  console.log(`[Transfer] Executing on ${networkSymbol}:`)
  console.log(`  From: ${treasuryWalletAddress}`)
  console.log(`  To: ${targetAddress}`)
  console.log(`  Amount: ${amountUsdt} USDT`)
  console.log(`  Contract: ${usdtContractAddress}`)

  const account = getOrCreateAccount(decryptedPrivateKey)
  const client = getOrCreateClient(account, networkRpcUrl)

  // Encode ERC-20 transfer call: transfer(to, amount)
  const decimals = usdtDecimals ?? 6
  console.log(
    `[Transfer] Encoding transfer call with amount in smallest unit: ${parseUnits(amountUsdt.toString(), decimals)} (${decimals} decimals)`,
  )
  const callData = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [targetAddress as Address, parseUnits(amountUsdt.toString(), decimals)],
  })

  const txHash = await client.sendTransaction({
    to: usdtContractAddress as Address,
    data: callData,
    chain: null, // let the RPC determine chain ID
  })

  return { txHash }
}
