import { CardGrid } from "../card-grid"
import { RevenueCard } from "../revenue-card"

export function OperationStatsCard() {
  return (
    <CardGrid cols={5}>
      <RevenueCard
        title="TOTAL TRANSACTION"
        amount="0"
        withEndLabel={false}
        withUSDTIcon={false}
      />
      <RevenueCard
        title="TOTAL PENDING"
        amount="0.00"
        withEndLabel={false}
        withUSDTIcon={false}
      />
      <RevenueCard
        title="TOTAL COMPLETE"
        amount="0.00"
        withEndLabel={false}
        withUSDTIcon={false}
      />
      <RevenueCard title="TOTAL REVENUE" amount="0.00" isPositive={true} />
      <RevenueCard title="TOTAL MARGIN" amount="0.00" isPositive={true} />
    </CardGrid>
  )
}
