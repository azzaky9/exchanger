import { prisma } from "@/lib/prisma";
import { TCreateNetworkSchema } from "./dto-network";
import { enum_networks_network_type } from "@/generated/prisma";
import { logger } from "@/lib/logger";

export async function createNetwork(payload: TCreateNetworkSchema) {
    try {
        const network = await prisma.networks.create({
            data: {
                gas_fee_token_name: payload.feeToken,
                network_type: payload.type as enum_networks_network_type,
                name: payload.name,
                rpc_url: payload.rpcUrl,
                symbol: payload.symbol,
                usdt_contract_address: payload.contractAddress,
                usdt_decimals: payload.currencyDecimals,
                is_active: payload.isActive
            }
        })

        return network
    } catch (error) {
        if (error instanceof Error) {
            logger.error({ message: error.message }, "Failed to create network")
        }

        return null
    }
}