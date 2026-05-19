"use client"

import { type ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams, useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalCircle01Icon } from "@hugeicons/core-free-icons"
import { deleteExchangeRateAction } from "@/app/dashboard/exchange-rates/actions"
import { toast } from "sonner"

export interface ExchangeRate {
  id: string
  currencyPair: string
  usdtPhpRefRate: string
  usdtPhpFinalRate: string
  usdtPhpProfitSpread: string
  usdtPhpSpinzoFee: string
  usdtPhpGicFee: string
  phpUsdtRefRate: string
  phpUsdtRate: string
  phpUsdtSpinzoFee: string
  phpUsdtGicFee: string
  active: boolean
}

interface ExchangeRatesTableProps {
  data: ExchangeRate[]
}

const columns: ColumnDef<ExchangeRate>[] = [
  {
    accessorKey: "currencyPair",
    header: "CURRENCY PAIR",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("currencyPair")}</span>
    ),
  },
  {
    accessorKey: "active",
    header: "ACTIVE",
    cell: ({ row }) => {
      const active = row.getValue("active") as boolean
      return (
        <span
          className={`text-xs font-medium ${
            active ? "text-[#83b047]" : "text-[#4e4e4e]"
          }`}
        >
          {active ? "Active" : "Inactive"}
        </span>
      )
    },
  },
  {
    id: "spinzoMarkup",
    header: "SPINZO MARKUP",
    cell: ({ row }) => {
      const usdtPhp = row.original.usdtPhpSpinzoFee
      const phpUsdt = row.original.phpUsdtSpinzoFee
      return (
        <div className="flex flex-col gap-1 text-xs">
          <span>USDT→PHP: {usdtPhp}</span>
          <span>PHP→USDT: {phpUsdt}</span>
        </div>
      )
    },
  },
  {
    id: "gicMarkup",
    header: "GIC MARKUP",
    cell: ({ row }) => {
      const usdtPhp = row.original.usdtPhpGicFee
      const phpUsdt = row.original.phpUsdtGicFee
      return (
        <div className="flex flex-col gap-1 text-xs">
          <span>USDT→PHP: {usdtPhp}</span>
          <span>PHP→USDT: {phpUsdt}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "usdtPhpRefRate",
    header: "USDT → PHP REFERENCE RATE",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("usdtPhpRefRate")}</span>
    ),
  },
  {
    accessorKey: "usdtPhpFinalRate",
    header: "USDT → PHP FINAL RATE",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("usdtPhpFinalRate")}</span>
    ),
  },
  {
    accessorKey: "usdtPhpProfitSpread",
    header: "USDT → PHP PROFIT / SPREAD",
    cell: ({ row }) => (
      <span className="text-xs">
        {row.getValue("usdtPhpProfitSpread") + " " + "PHP"}
      </span>
    ),
  },
  {
    accessorKey: "phpUsdtRefRate",
    header: "PHP → USDT REFERENCE RATE",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("phpUsdtRefRate")}</span>
    ),
  },
  {
    accessorKey: "phpUsdtRate",
    header: "PHP → USDT RATE",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("phpUsdtRate")}</span>
    ),
  },
  {
    accessorKey: "phpUsdtProfitSpread",
    header: "PHP → USDT PROFIT / SPREAD",
    cell: ({ row }) => (
      <span className="text-xs">
        {row.getValue("phpUsdtProfitSpread") + " " + "USDT/USD"}
      </span>
    ),
  },

  {
    id: "actions",
    cell: ({ row }) => <ExchangeRateActions row={row} />,
  },
]

function ExchangeRateActions({ row }: { row: any }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const rate = row.original as ExchangeRate

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete this exchange rate?`)) {
      const res = await deleteExchangeRateAction(rate.id)
      if (res.success) {
        toast.success(res.message)
        queryClient.invalidateQueries({ queryKey: ["exchange-rates"] })
      } else {
        toast.error(res.message)
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <HugeiconsIcon
            icon={MoreHorizontalCircle01Icon}
            className="h-4 w-4"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            router.push(`/dashboard/exchange-rates/${rate.id}/edit`)
          }
        >
          Edit Rate
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-red-500 focus:text-red-500"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ExchangeRatesTable({
  data: initialData,
}: ExchangeRatesTableProps) {
  console.log({ initialData }, "initial data")

  const searchParams = useSearchParams()
  const q = searchParams.get("q") || ""
  const filter = searchParams.get("filter") || ""
  const currency = searchParams.get("currency") || ""

  const { data, isLoading } = useQuery({
    queryKey: ["exchange-rates", q, filter, currency],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (q) params.append("q", q)
      if (filter) params.append("filter", filter)
      if (currency) params.append("currency", currency)

      const res = await fetch(`/api/exchange-rate?${params.toString()}`)
      const json = await res.json()
      return json.data as ExchangeRate[]
    },
    initialData,
  })

  console.log({ data }, "Exchange rate table data: ")

  return (
    <DataTable
      columns={columns}
      data={data || []}
      emptyMessage={
        isLoading ? "Loading exchange rates..." : "No exchange rates found"
      }
      pageSize={10}
      pinnedColumns={{ right: ["actions"] }}
    />
  )
}
