import { auth } from "@/auth/auth"
import { isAfter, subDays } from "date-fns"
import { Suspense } from "react"

import { ActionsContainer } from "@/components/actions-container"
import {
  OfframpTable,
  type OfframpTransaction,
} from "@/components/operations/offramp-table"
import { OperationStatsCard } from "@/components/operations/stats-ops-card"
import { getTransactions } from "@/services/transactions/get-transactions"
import { mapTransaction } from "@/services/transactions/map-transaction"

export default async function Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  const role = (session?.user as any)?.role?.toLowerCase()

  const searchParams = await props.searchParams
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined
  const filter =
    typeof searchParams.filter === "string" ? searchParams.filter : undefined
  const currency =
    typeof searchParams.currency === "string"
      ? searchParams.currency
      : undefined

  const dbTransactions = await getTransactions({
    type: "crypto_to_fiat",
    q,
    filter,
    currency,
  })

  const safeRole = role || "admin"

  const mappedData: OfframpTransaction[] = dbTransactions.map((t) => {
    const base = mapTransaction(t, safeRole) as OfframpTransaction
    const appliedRateFromSnapshot = Number(
      t.applied_rate_snapshot || t.rate_snapshot || 0
    )
    const appliedRateFromRateSnapshot = Number(t.usdt_to_php_rate_snapshot || 0)
    const referenceRate = Number(
      t.reference_rate_snapshot || t.exchange_rate?.usdt_to_php_reference_rate || 0
    )
    const spinzoFee = Number(t.exchange_rate?.usdt_to_php_spinzo_fee) || 0
    const gicFee = Number(t.exchange_rate?.usdt_to_php_gic_fee) || 0
    const markupRate = referenceRate > 0
      ? referenceRate - spinzoFee - gicFee
      : (appliedRateFromSnapshot || appliedRateFromRateSnapshot || 0)
    const markupExchangeRate = markupRate > 0
      ? `1 USDT = ${markupRate} PHP`
      : "-"

    const amountPhp = typeof t.amount_php?.toNumber === "function"
      ? t.amount_php.toNumber()
      : Number(t.amount_php || 0)
    const amountSentToExchange = referenceRate > 0
      ? `${(amountPhp / referenceRate).toFixed(6)} USDT`
      : "-"

    return {
      ...base,
      markupExchangeRate,
      amountSentToExchange,
    }
  })

  const txData = dbTransactions.map((t, index) => ({
    ...t,
    roleBasedProfit:
      safeRole === "gic"
        ? parseFloat(mappedData[index].gicProfit) || 0
        : Number(t.profit || 0),
  }))

  const totalTransactions = txData.length
  const totalPending = txData.filter(
    (t) => t.status === "pending"
  ).length
  const totalComplete = txData.filter(
    (t) => t.status === "complete"
  ).length
  const totalRevenueUsdt = txData.reduce(
    (acc, t) => acc + t.roleBasedProfit,
    0
  )
  const totalAmountUsdt = txData.reduce(
    (acc, t) => acc + Number(t.amount_usdt || 0),
    0
  )
  const totalMarginPercentage =
    totalAmountUsdt > 0 ? (totalRevenueUsdt / totalAmountUsdt) * 100 : 0

  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)
  const sixtyDaysAgo = subDays(now, 60)

  const currentTxs = txData.filter((t) =>
    isAfter(new Date(t.created_at), thirtyDaysAgo)
  )
  const previousTxs = txData.filter(
    (t) =>
      isAfter(new Date(t.created_at), sixtyDaysAgo) &&
      !isAfter(new Date(t.created_at), thirtyDaysAgo)
  )

  const currentRevenue = currentTxs.reduce(
    (acc, t) => acc + t.roleBasedProfit,
    0
  )
  const previousRevenue = previousTxs.reduce(
    (acc, t) => acc + t.roleBasedProfit,
    0
  )

  const currentAmount = currentTxs.reduce(
    (acc, t) => acc + Number(t.amount_usdt || 0),
    0
  )
  const previousAmount = previousTxs.reduce(
    (acc, t) => acc + Number(t.amount_usdt || 0),
    0
  )

  const currentMargin =
    currentAmount > 0 ? (currentRevenue / currentAmount) * 100 : 0
  const previousMargin =
    previousAmount > 0 ? (previousRevenue / previousAmount) * 100 : 0

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0)
      return {
        value: current > 0 ? "100.00%" : "0.00%",
        isPositive: current >= 0,
      }
    const growth = ((current - previous) / Math.abs(previous)) * 100
    return { value: `${Math.abs(growth).toFixed(2)}%`, isPositive: growth >= 0 }
  }

  const totalAmountPhp = txData.reduce(
    (acc, t) => acc + Number(t.amount_php || 0),
    0
  )

  const stats = {
    totalTransactions,
    totalPending,
    totalComplete,
    totalRevenue: totalRevenueUsdt.toFixed(2),
    totalMargin: `${totalMarginPercentage.toFixed(2)}%`,
    revenueGrowth: calculateGrowth(currentRevenue, previousRevenue),
    marginGrowth: calculateGrowth(currentMargin, previousMargin),
    transactionsGrowth: calculateGrowth(currentTxs.length, previousTxs.length),
    totalSent: totalAmountUsdt.toFixed(2), // Lotto sends USDT in crypto-to-fiat
    totalReceived: totalAmountPhp.toFixed(2), // Lotto receives PHP
    totalSentDescription: `≈ ${totalAmountPhp.toFixed(2)} PHP`,
    totalReceivedDescription: `≈ ${totalAmountUsdt.toFixed(2)} USDT`,
    sentHasUSDTIcon: true, // USDT has icon
    receivedHasUSDTIcon: false, // PHP has no icon
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 px-7.5">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">Crypto to Fiat Overview</p>
          </div>
          <OperationStatsCard stats={stats} role={safeRole} />

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
            <OfframpTable data={mappedData} role={safeRole} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
