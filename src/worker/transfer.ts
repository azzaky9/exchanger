import {
  createWalletClient,
  http,
  parseUnits,
  encodeFunctionData,
  type Hex,
  type Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
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

/**
 * Execute a USDT transfer on the specified EVM network using viem.
 * The decrypted private key is provided in the job data.
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

  // Build viem account from decrypted private key
  const privateKeyHex = (
    decryptedPrivateKey.startsWith('0x') ? decryptedPrivateKey : `0x${decryptedPrivateKey}`
  ) as Hex

  const account = privateKeyToAccount(privateKeyHex)

  const client = createWalletClient({
    account,
    transport: http(networkRpcUrl),
  })

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
