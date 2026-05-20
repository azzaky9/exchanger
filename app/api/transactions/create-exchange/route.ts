import { auth } from "@/auth/auth"
import { successResponse, unauthorized, withErrorHandler } from "@/lib/api-response"
import { authenticateApiRequest } from "@/lib/auth-api-key"
import { createExchangeTransaction } from "@/services/transactions/create-exchange"
import { z } from "zod"

const createExchangeSchema = z.object({
    type: z.enum(["fiat_to_crypto", "crypto_to_fiat"]),
    amount: z.number().positive("Amount must be a positive number"),
    network: z.number(),
    targetAddress: z.string().optional()
}).refine((data) => {
    if (data.type === "fiat_to_crypto" && !data.targetAddress) {
        return false
    }
    return true
}, {
    message: "targetAddress is required for fiat_to_crypto transactions",
    path: ["targetAddress"]
})

export const POST = withErrorHandler(async (req) => {
    const authResult = await authenticateApiRequest(req)

    // 1. Authentication Check
    const session = await auth()
    if (!session || !session.user || !authResult.authorized) {
        return unauthorized("You must be logged in to create a transaction")
    }

    // 2. Payload Validation
    const body = await req.json()
    const parsedData = await createExchangeSchema.parseAsync(body)

    // 3. Delegate to Service (which handles Resource Resolution & Transaction Creation)
    const result = await createExchangeTransaction({
        type: parsedData.type,
        amount: parsedData.amount,
        networkId: parsedData.network,
        targetAddress: parsedData.targetAddress
    })

    // 4. API Response
    return successResponse(result, "Transaction created successfully")
})
