import { auth } from "@/auth/auth"
import { enum_transactions_type } from "@/generated/prisma"
import { successResponse, unauthorized, withErrorHandler } from "@/lib/api-response"
import { getTransactions } from "@/services/transactions/get-transactions"
import { mapTransaction } from "@/services/transactions/map-transaction"

export const GET = withErrorHandler(async (req) => {
    const session = await auth()
    if (!session || !session.user) {
        return unauthorized("Requires authentication")
    }

    const role = (session.user as any).role || "admin"

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") as enum_transactions_type | null
    const q = searchParams.get("q") || undefined
    const filter = searchParams.get("filter") || undefined
    const currency = searchParams.get("currency") || undefined

    const dbTransactions = await getTransactions({
        type: type || undefined,
        q,
        filter,
        currency,
    })

    // Map to the format expected by the frontend table
    const mappedData = dbTransactions.map(t => {
        const base = mapTransaction(t, role)
        const isFiatToCrypto = t.type === "fiat_to_crypto"
        const appliedRate = Number(
            t.applied_rate_snapshot ||
            t.rate_snapshot ||
            (isFiatToCrypto ? t.exchange_rate?.php_to_usdt_rate : t.exchange_rate?.usdt_to_php_rate) ||
            0
        )
        const markupExchangeRate = appliedRate
            ? (isFiatToCrypto
                ? `1 PHP = ${appliedRate} USDT`
                : `1 USDT = ${appliedRate} PHP`)
            : "-"

        const amountSentToExchange = `${(t.amount_php.toNumber() * Number(t.exchange_rate?.php_to_usdt_rate ?? 0)).toFixed(6)} USDT`

        return {
            ...base,
            markupExchangeRate,
            amountSentToExchange,
        }
    })

    return successResponse(mappedData)
})
