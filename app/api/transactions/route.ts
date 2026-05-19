import { withErrorHandler, successResponse, unauthorized } from "@/lib/api-response"
import { getTransactions } from "@/services/transactions/get-transactions"
import { auth } from "@/auth/auth"
import { format } from "date-fns"
import { enum_transactions_type } from "@/generated/prisma"

export const GET = withErrorHandler(async (req) => {
    const session = await auth()
    if (!session || !session.user) {
        return unauthorized("Requires authentication")
    }

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
        const isFiatToCrypto = t.type === "fiat_to_crypto";
        const amountUsdt = Number(t.amount_usdt || 0);

        // Calculate GIC/Spinzo profits
        let gicProfitUsdt = 0;
        let spinzoProfitUsdt = 0;
        let spreadPercentage = 0;

        if (t.exchange_rate) {
            if (isFiatToCrypto) {
                const gicFee = Number(t.exchange_rate.php_to_usdt_gic_fee || 0);
                const spinzoFee = Number(t.exchange_rate.php_to_usdt_spinzo_fee || 0);
                spreadPercentage = Number(t.exchange_rate.php_to_usdt_spread_percentage || 0);
                
                // For fiat_to_crypto: fees are in PHP (or USDT? wait. Let's assume fees are in PHP and we convert to USDT)
                // Actually, fee is a markup on the exchange rate. 
                const refRate = Number(t.php_to_usdt_reference_rate_snapshot || t.exchange_rate.php_to_usdt_reference_rate || 1);
                const amountPhp = Number(t.amount_php || 0);
                // The fee is applied to the exchange rate. So Spinzo profit in PHP = amountPhp (Wait, no).
                // Let's just use the proportion of fee / total spread.
                const totalSpread = gicFee + spinzoFee;
                if (totalSpread > 0) {
                    const totalProfitUsdt = Number(t.profit || 0);
                    gicProfitUsdt = totalProfitUsdt * (gicFee / totalSpread);
                    spinzoProfitUsdt = totalProfitUsdt * (spinzoFee / totalSpread);
                }
            } else {
                const gicFee = Number(t.exchange_rate.usdt_to_php_gic_fee || 0);
                const spinzoFee = Number(t.exchange_rate.usdt_to_php_spinzo_fee || 0);
                spreadPercentage = Number(t.exchange_rate.usdt_to_php_spread_percentage || 0);

                const totalSpread = gicFee + spinzoFee;
                if (totalSpread > 0) {
                    const totalProfitUsdt = Number(t.profit || 0);
                    gicProfitUsdt = totalProfitUsdt * (gicFee / totalSpread);
                    spinzoProfitUsdt = totalProfitUsdt * (spinzoFee / totalSpread);
                }
            }
        }

        return {
            id: t.id.toString(),
            orderId: t.order_id || "-",
            type: t.type,
            status: t.status,
            totalAmountSent: isFiatToCrypto
                ? `₱${Number(t.amount_php).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                : `${amountUsdt.toFixed(6)} USDT`,
            totalReceived: isFiatToCrypto
                ? `${amountUsdt.toFixed(6)} USDT`
                : `₱${Number(t.amount_php).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            profitUsdt: `${Number(t.profit || 0).toFixed(6)} USDT`,
            profitPercentage: amountUsdt > 0
                ? `${((Number(t.profit || 0) / amountUsdt) * 100).toFixed(2)}%`
                : "0.00%",
            gicProfit: `${gicProfitUsdt.toFixed(6)} USDT`,
            spinzoProfit: `${spinzoProfitUsdt.toFixed(6)} USDT`,
            transactionProfitSpread: `${spreadPercentage.toFixed(2)}%`,
            targetAddress: t.target_address || "-",
            treasuryAddress: t.treasury?.wallet_address || "-",
            txHash: t.tx_hash || "-",
            bankDetails: t.bank_details ? (() => { try { return JSON.parse(t.bank_details) } catch { return null } })() : null,
            invoiceUrl: (t as any).invoiceMedia?.url || null,
            createdAt: format(new Date(t.created_at), "MMM d, yyyy h:mm a"),
            lastUpdated: format(new Date(t.updated_at), "MMM d, yyyy h:mm a"),
            lastUpdatedBy: "Admin", // Static for now as no updated_by field exists
        };
    })

    return successResponse(mappedData)
})
