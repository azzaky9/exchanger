import { Suspense } from "react"
import { format, subDays, isAfter } from "date-fns"
import { auth } from "@/auth/auth"
import { redirect } from "next/navigation"

import { ActionsContainer } from "@/components/actions-container"
import { OperationStatsCard } from "@/components/operations/stats-ops-card"
import { OfframpTable, type OfframpTransaction } from "@/components/operations/offramp-table"
import { getTransactions } from "@/services/transactions/get-transactions"

export default async function Page(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth()
  const role = (session?.user as any)?.role?.toLowerCase()

  if (role === "lotto") {
    redirect("/dashboard/operations/fiat-to-crypto")
  }

  const searchParams = await props.searchParams
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined
  const filter = typeof searchParams.filter === "string" ? searchParams.filter : undefined
  const currency = typeof searchParams.currency === "string" ? searchParams.currency : undefined

  const dbTransactions = await getTransactions({
    type: "crypto_to_fiat",
    q,
    filter,
    currency,
  })

  const mappedData: OfframpTransaction[] = dbTransactions.map(t => {
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
      treasuryAddress: (t as any).treasury?.wallet_address || "-",
      txHash: t.tx_hash || "-",
      createdAt: format(new Date(t.created_at), "MMM d, yyyy h:mm a"),
      lastUpdated: format(new Date(t.updated_at), "MMM d, yyyy h:mm a"),
      lastUpdatedBy: "Admin", // Static for now
    }
  })

  const totalTransactions = dbTransactions.length
  const totalPending = dbTransactions.filter((t) => t.status === "pending").length
  const totalComplete = dbTransactions.filter((t) => t.status === "complete").length
  const totalRevenueUsdt = dbTransactions.reduce((acc, t) => acc + Number(t.profit || 0), 0)
  const totalAmountUsdt = dbTransactions.reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0)
  const totalMarginPercentage = totalAmountUsdt > 0 ? (totalRevenueUsdt / totalAmountUsdt) * 100 : 0

  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)
  const sixtyDaysAgo = subDays(now, 60)

  const currentTxs = dbTransactions.filter(t => isAfter(new Date(t.created_at), thirtyDaysAgo))
  const previousTxs = dbTransactions.filter(t => isAfter(new Date(t.created_at), sixtyDaysAgo) && !isAfter(new Date(t.created_at), thirtyDaysAgo))

  const currentRevenue = currentTxs.reduce((acc, t) => acc + Number(t.profit || 0), 0)
  const previousRevenue = previousTxs.reduce((acc, t) => acc + Number(t.profit || 0), 0)
  
  const currentAmount = currentTxs.reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0)
  const previousAmount = previousTxs.reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0)

  const currentMargin = currentAmount > 0 ? (currentRevenue / currentAmount) * 100 : 0
  const previousMargin = previousAmount > 0 ? (previousRevenue / previousAmount) * 100 : 0

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return { value: current > 0 ? "100.00%" : "0.00%", isPositive: current >= 0 }
    const growth = ((current - previous) / Math.abs(previous)) * 100
    return { value: `${Math.abs(growth).toFixed(2)}%`, isPositive: growth >= 0 }
  }

  const stats = {
    totalTransactions,
    totalPending,
    totalComplete,
    totalRevenue: totalRevenueUsdt.toFixed(2),
    totalMargin: `${totalMarginPercentage.toFixed(2)}%`,
    revenueGrowth: calculateGrowth(currentRevenue, previousRevenue),
    marginGrowth: calculateGrowth(currentMargin, previousMargin),
    transactionsGrowth: calculateGrowth(currentTxs.length, previousTxs.length),
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 px-7.5">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">Crypto to Fiat Overview</p>
          </div>
          <OperationStatsCard stats={stats} />

          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">Transactions</p>
            <Suspense>
              <ActionsContainer
                searchKey="q"
                filterKey="filter"
                currencyKey="currency"
              />
            </Suspense>
          </div>

          <Suspense>
            <OfframpTable data={mappedData} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
