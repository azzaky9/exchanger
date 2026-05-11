import { Suspense } from "react"

import { ActionsContainer } from "@/components/actions-container"
import {
  DashboardStatsCard,
  ProfitChart,
  RecentTransactions,
} from "@/components/dashboard"

export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 px-7.5">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">Finance Overview</p>
            <Suspense>
              <ActionsContainer
                searchKey="q"
                filterKey="filter"
                currencyKey="currency"
              />
            </Suspense>
          </div>

          {/* Stat cards */}
          <DashboardStatsCard />

          {/* Daily Profit Breakdown chart */}
          <ProfitChart />

          {/* Recent Transactions table */}
          <Suspense>
            <RecentTransactions
              searchKey="q"
              filterKey="filter"
              currencyKey="currency"
              sortKeyParam="sort"
              sortDirParam="dir"
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

