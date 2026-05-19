import { Suspense } from "react"
import { ActionsContainer } from "@/components/actions-container"
import {
  ExchangeRatesTable,
  type ExchangeRate,
} from "@/components/exchange-rates"
import { Button } from "@/components/ui/button"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { getExchangeRates } from "@/services/exchange-rates/get-rates"

import { auth } from "@/auth/auth"
import { redirect } from "next/navigation"

export default async function Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  const role = (session?.user as any)?.role?.toLowerCase()

  if (role === "gic" || role === "lotto") {
    redirect("/dashboard/operations/fiat-to-crypto")
  }

  const searchParams = await props.searchParams
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined
  const filter =
    typeof searchParams.filter === "string" ? searchParams.filter : undefined
  const currency =
    typeof searchParams.currency === "string"
      ? searchParams.currency
      : undefined

  const dbRates = await getExchangeRates({
    q,
    filter,
    currency,
    role: session?.user ? (session.user as any).role : undefined,
  })

  const mappedData: ExchangeRate[] = dbRates.map((r) => ({
    id: r.id.toString(),
    currencyPair: r.pair,
    usdtPhpRefRate: r.usdt_to_php_reference_rate.toString(),
    usdtPhpFinalRate: r.usdt_to_php_rate.toString(),
    usdtPhpProfitSpread: r.usdt_to_php_spread?.toString() || "0",
    usdtPhpSpinzoFee: r.usdt_to_php_spinzo_fee?.toString() || "0",
    usdtPhpGicFee: r.usdt_to_php_gic_fee?.toString() || "0",
    phpUsdtRefRate: r.php_to_usdt_reference_rate.toString(),
    phpUsdtRate: r.php_to_usdt_rate.toString(),
    phpUsdtProfitSpread: r.php_to_usdt_spread?.toString() || "0",
    phpUsdtSpinzoFee: r.php_to_usdt_spinzo_fee?.toString() || "0",
    phpUsdtGicFee: r.php_to_usdt_gic_fee?.toString() || "0",
    active: r.is_active || false,
  }))

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 px-7.5">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-[#ededed]">
              Exchange Rates List
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href={"/dashboard/exchange-rates/create"}>
                  Create New
                  <HugeiconsIcon icon={Add01Icon} />
                </Link>
              </Button>
            </div>
          </div>

          {/* Table */}
          <Suspense>
            <ExchangeRatesTable data={mappedData} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
