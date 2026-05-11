import { Suspense } from "react"

import { ActionsContainer } from "@/components/actions-container"
import { OnrampTable } from "@/components/operations/onramp-table"
import { OperationStatsCard } from "@/components/operations/stats-ops-card"

export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 px-7.5">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">Fiat to Crypto Overview</p>
          </div>
          <OperationStatsCard />

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

          <OnrampTable />
        </div>
      </div>
    </div>
  )
}

