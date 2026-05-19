import { prisma } from "@/lib/prisma"
import { TUpdateNetworkSchema } from "./dto-network"
import { enum_networks_network_type } from "@/generated/prisma"

export async function updateNetwork(id: number, payload: TUpdateNetworkSchema) {

    const network = await prisma.networks.update({
        where: {
            id,
        },
        data: {
            gas_fee_token_name: payload.feeToken,
            network_type: payload.type as enum_networks_network_type,
            name: payload.name,
            rpc_url: payload.rpcUrl,
            symbol: payload.symbol,
            usdt_contract_address: payload.contractAddress,
            usdt_decimals: payload.currencyDecimals,
            is_active: payload.isActive,
        },
    })



    return network
}
