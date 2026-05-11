import { CardGrid } from "../card-grid"
import { RevenueCard } from "../revenue-card"

export function DashboardStatsCard() {
  return (
    <>
      <CardGrid cols={4}>
        <RevenueCard
          title="TOTAL REVENUE"
          amount="0.00"
          percentageChange="3.27%"
          isPositive={true}
          description="Fiat → Crypto transactions"
        />
        <RevenueCard
          title="TOTAL VOLUME"
          amount="0.00"
          percentageChange="1.54%"
          isPositive={true}
          description="All processed transactions"
        />
        <RevenueCard
          title="ACTIVE USERS"
          amount="0"
          percentageChange="0.80%"
          isPositive={false}
          description="Registered & verified accounts"
        />
        <RevenueCard
          title="TRANSACTIONS"
          amount="0"
          percentageChange="2.10%"
          isPositive={true}
          description="Completed this period"
        />
      </CardGrid>
      <CardGrid cols={2}>
        <RevenueCard
          title="ACTIVE USERS"
          amount="0"
          percentageChange="0.80%"
          isPositive={false}
          withEndLabel={false}
          withUSDTIcon={false}
          description="Registered & verified accounts"
        />
        <RevenueCard
          title="TRANSACTIONS"
          amount="0"
          percentageChange="2.10%"
          isPositive={true}
          withEndLabel={false}
          withUSDTIcon={false}
          description="Completed this period"
        />
      </CardGrid>
    </>
  )
}
