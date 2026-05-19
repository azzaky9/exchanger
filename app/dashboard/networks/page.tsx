import { Suspense } from "react"
import { auth } from "@/auth/auth"
import { redirect } from "next/navigation"

import { ActionsContainer } from "@/components/actions-container"
import { Button } from "@/components/ui/button"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { getNetworks } from "@/services/networks/get-network"
import { ClientNetworksList } from "./client-networks-list"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  const role = (session?.user as any)?.role?.toLowerCase()

  if (role === "gic" || role === "lotto") {
    redirect("/dashboard/operations/fiat-to-crypto")
  }
  // Await search params for Next.js 15+ support
  const resolvedParams = await searchParams

  const page = Number(resolvedParams.page) || 1
  const limit = Number(resolvedParams.limit) || 10
  const filterByRaw = (resolvedParams.filter as string) || "all"
  const filterBy = ["all", "active", "disable"].includes(filterByRaw)
    ? (filterByRaw as "all" | "active" | "disable")
    : "all"

  // 1. Fetch data on the server for instant page load
  const initialData = await getNetworks(limit, 0, page, filterBy)

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 px-7.5">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-[#ededed]">
              Available Chain Networks
            </p>
            <div className="flex items-center gap-3">
              <Suspense>
                <ActionsContainer
                  searchKey="q"
                  filterKey="filter"
                  currencyKey="network"
                  currencies={["ALL", "EVM", "SVM", "BTC"]}
                />
              </Suspense>
              <Button variant="outline" asChild>
                <Link href={"/dashboard/networks/create"}>
                  Create New
                  <HugeiconsIcon icon={Add01Icon} />
                </Link>
              </Button>
            </div>
          </div>

          {/* Table Container powered by React Query */}
          <Suspense>
            {/* We pass the server-fetched data as initialData to seamlessly hydrate React Query */}
            <ClientNetworksList initialData={initialData as any} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
