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
        const appliedRateFromSnapshot = Number(
            t.applied_rate_snapshot || t.rate_snapshot || 0
        )
        const appliedRateFromRateSnapshot = Number(
            isFiatToCrypto
                ? t.php_to_usdt_rate_snapshot || 0
                : t.usdt_to_php_rate_snapshot || 0
        )
        const refRate = Number(
            t.reference_rate_snapshot ||
            (isFiatToCrypto
                ? t.exchange_rate?.php_to_usdt_reference_rate
                : t.exchange_rate?.usdt_to_php_reference_rate) ||
            0
        )
        const spinzoFee = Number(
            isFiatToCrypto
                ? t.exchange_rate?.php_to_usdt_spinzo_fee
                : t.exchange_rate?.usdt_to_php_spinzo_fee
        ) || 0
        const gicFee = Number(
            isFiatToCrypto
                ? t.exchange_rate?.php_to_usdt_gic_fee
                : t.exchange_rate?.usdt_to_php_gic_fee
        ) || 0
        const markupRate = refRate > 0
            ? refRate - spinzoFee - gicFee
            : (appliedRateFromSnapshot || appliedRateFromRateSnapshot || 0)
        const markupExchangeRate = markupRate > 0
            ? (isFiatToCrypto
                ? `1 PHP = ${markupRate} USDT`
                : `1 USDT = ${markupRate} PHP`)
            : "-"

        const amountPhp = typeof t.amount_php?.toNumber === "function"
            ? t.amount_php.toNumber()
            : Number(t.amount_php || 0)
        const amountSentToExchange = refRate > 0
            ? `${(amountPhp / refRate).toFixed(6)} USDT`
            : "-"

        return {
            ...base,
            markupExchangeRate,
            amountSentToExchange,
        }
    })

    return successResponse(mappedData)
})
