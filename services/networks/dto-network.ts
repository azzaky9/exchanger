import * as z from "zod"

const NetworkType = z.enum(["mainnet", "testnet"])

const CreateNetworkSchema = z.object({
    name: z.string().min(1, "network name is required"),
    symbol: z.string().min(3, "minimum 3 character for symbol"),
    type: NetworkType,
    rpcUrl: z.url(),
    contractAddress: z.string(),
    currencyDecimals: z.number(),
    feeToken: z.string().min(3),
    isActive: z.boolean(),
})

type TCreateNetworkSchema = z.infer<typeof CreateNetworkSchema>

const FilterByStatusEnum = z.enum(["active", "disable", "all"])

const GetNetworkParamsSchema = z.object({
    offset: z.coerce.number().max(100).default(0),
    limit: z.coerce.number().min(10).default(10),
    page: z.coerce.number().nonnegative().min(1).default(1),
    filterBy: FilterByStatusEnum.default("all")
})

type TGetNetworkByStatusSchema = z.infer<typeof GetNetworkParamsSchema>

const UpdateNetworkParamsSchema = z.object({
    id: z.number().nonnegative()
}).extend(CreateNetworkSchema.shape).partial()

type TUpdateNetworkSchema = z.infer<typeof UpdateNetworkParamsSchema>

export { CreateNetworkSchema, GetNetworkParamsSchema, UpdateNetworkParamsSchema, type TCreateNetworkSchema, type TGetNetworkByStatusSchema, type TUpdateNetworkSchema }