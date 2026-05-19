import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { EditExchangeRateForm } from "./edit-form"

export default async function EditExchangeRatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const rateId = parseInt(resolvedParams.id, 10)

  if (isNaN(rateId)) {
    notFound()
  }

  const rate = await prisma.exchange_rates.findUnique({ where: { id: rateId } })

  if (!rate) {
    notFound()
  }

  // Serialize Prisma Decimal objects to strings
  const serializedRate = {
    id: rate.id,
    usdtToPhpReferenceRate: rate.usdt_to_php_reference_rate.toString(),
    usdtToPhpRate: rate.usdt_to_php_rate.toString(),
    usdtToPhpSpread: rate.usdt_to_php_spread?.toString() || "0",
    usdtToPhpSpreadPercentage:
      rate.usdt_to_php_spread_percentage?.toString() || "0",
    phpToUsdtReferenceRate: rate.php_to_usdt_reference_rate.toString(),
    phpToUsdtRate: rate.php_to_usdt_rate.toString(),
    phpToUsdtSpread: rate.php_to_usdt_spread?.toString() || "0",
    phpToUsdtSpreadPercentage:
      rate.php_to_usdt_spread_percentage?.toString() || "0",
    phpToUsdtSpinzoFee: rate.php_to_usdt_spinzo_fee?.toString() || "0",
    phpToUsdtGicFee: rate.php_to_usdt_gic_fee?.toString() || "0",
    usdtToPhpSpinzoFee: rate.usdt_to_php_spinzo_fee?.toString() || "0",
    usdtToPhpGicFee: rate.usdt_to_php_gic_fee?.toString() || "0",

    isActive: rate.is_active || false,
  }

  console.log({ serializedRate })

  return (
    <div className="flex flex-1 flex-col p-8 text-[#ededed]">
      <div className="mb-8 border-b border-[#282828] pb-4">
        <h1 className="text-xl font-semibold">Edit Exchange Rate</h1>
        <p className="mt-1 text-sm text-[#4e4e4e]">Update rates manually.</p>
      </div>
      <EditExchangeRateForm rate={serializedRate} />
    </div>
  )
}
