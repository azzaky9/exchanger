import { validateQueryParams } from "@/lib/api-request";
import { BadRequestError, successResponse, unauthorized, withErrorHandler } from "@/lib/api-response";
import { authenticateApiRequest } from "@/lib/auth-api-key";
import { createNetwork } from "@/services/networks/create-network";
import { CreateNetworkSchema, GetNetworkParamsSchema } from "@/services/networks/dto-network";
import { getNetworks } from "@/services/networks/get-network";

export const POST = withErrorHandler(async (req) => {
    const payload = await req.json();
    const validate = await CreateNetworkSchema.safeParseAsync(payload)
    if (!validate.success) throw new BadRequestError("Failed to validate request")
    const data = await createNetwork(validate.data)
    return successResponse(data)
})

export const GET = withErrorHandler(async (req) => {
    const authResult = await authenticateApiRequest(req)
    if (!authResult.authorized) return unauthorized("Requires authentication")

    const params = validateQueryParams(req, GetNetworkParamsSchema)
    const results = await getNetworks(params.limit, params.offset, params.page, params.filterBy)
    return successResponse(results)
})
