import { NextRequest } from "next/server"
import { withErrorHandler, badRequest, successResponse, unauthorized } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth/auth"
import { enum_transactions_status } from "@/generated/prisma"

const VALID_TRANSITIONS: Record<string, enum_transactions_status[]> = {
    pending: ["confirmed", "fiat_arrival", "crypto_arrival"],
    confirmed: ["processing", "fiat_arrival", "crypto_arrival"],
    processing: ["complete", "fiat_arrival", "crypto_arrival"],
    fiat_arrival: ["processing", "complete"],
    crypto_arrival: ["processing", "complete"],
}

export const PATCH = withErrorHandler(async (req: NextRequest) => {
    const session = await auth()
    if (!session || !session.user) {
        return unauthorized("Requires authentication")
    }

    const body = await req.json()
    const { transactionId, status } = body as {
        transactionId: number
        status: enum_transactions_status
    }

    if (!transactionId || !status) {
        return badRequest("transactionId and status are required")
    }

    // Fetch current transaction
    const transaction = await prisma.transactions.findUnique({
        where: { id: transactionId },
    })

    if (!transaction) {
        return badRequest("Transaction not found")
    }

    // Validate status transition
    const allowed = VALID_TRANSITIONS[transaction.status]
    if (!allowed || !allowed.includes(status)) {
        return badRequest(
            `Cannot transition from "${transaction.status}" to "${status}"`
        )
    }

    // Update the transaction
    const updated = await prisma.transactions.update({
        where: { id: transactionId },
        data: {
            status,
            updated_at: new Date(),
        },
    })

    return successResponse(
        { id: updated.id, status: updated.status },
        `Transaction status updated to "${status}"`
    )
})
