"use client"

import {
  ArrowDown01Icon,
  FilterIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { type ColumnDef } from "@tanstack/react-table"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState, useTransition } from "react"

import { DataTable } from "@/components/data-table"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Transaction {
  orderId: string
  type: string
  status: "completed" | "pending" | "failed"
  received: string
  sent: string
  profit: string
  created: string
}

interface RecentTransactionsProps {
  transactions?: Transaction[]
  /** URL param keys — all optional with sensible defaults */
  searchKey?: string
  filterKey?: string
  currencyKey?: string
  currencies?: readonly string[]
  /** Debounce delay in ms for the search input (default: 350) */
  searchDelay?: number
  className?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CURRENCY_OPTIONS = ["ALL", "USDT", "PHP", "USD"] as const

const STATUS_STYLES: Record<Transaction["status"], string> = {
  completed: "text-[#83b047]",
  pending: "text-[#e38752]",
  failed: "text-[#e05252]",
}

// ─── Column definitions ───────────────────────────────────────────────────────
const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "orderId",
    header: "ORDER ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("orderId")}</span>
    ),
  },
  {
    accessorKey: "type",
    header: "TYPE",
    cell: ({ row }) => <span className="text-xs">{row.getValue("type")}</span>,
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => {
      const status = row.getValue("status") as Transaction["status"]
      return (
        <span className={cn("text-xs font-medium", STATUS_STYLES[status])}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      )
    },
  },
  {
    accessorKey: "received",
    header: "RECEIVED",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("received")}</span>
    ),
  },
  {
    accessorKey: "sent",
    header: "SENT",
    cell: ({ row }) => <span className="text-xs">{row.getValue("sent")}</span>,
  },
  {
    accessorKey: "profit",
    header: "PROFIT",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("profit")}</span>
    ),
  },
  {
    accessorKey: "created",
    header: "CREATED",
    cell: ({ row }) => (
      <span className="text-xs text-[#4e4e4e]">{row.getValue("created")}</span>
    ),
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export function RecentTransactions({
  transactions = [],
  searchKey = "q",
  filterKey = "filter",
  currencyKey = "currency",
  currencies = CURRENCY_OPTIONS,
  searchDelay = 350,
  className,
}: RecentTransactionsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const filterActive = searchParams.get(filterKey) === "1"
  const currentCurrency = searchParams.get(currencyKey) ?? "ALL"

  // ── Search: local state updates instantly, URL pushed after debounce ──────
  const [inputValue, setInputValue] = useState(searchParams.get(searchKey) ?? "")
  const debouncedSearch = useDebounce(inputValue, searchDelay)

  // ─── URL push helper ──────────────────────────────────────────────────────
  const pushParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === "") params.delete(k)
        else params.set(k, v)
      })
      startTransition(() => {
        router.push(`?${params.toString()}`, { scroll: false })
      })
    },
    [router, searchParams]
  )

  // Push debounced value to URL
  useEffect(() => {
    pushParam({ [searchKey]: debouncedSearch || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputValue(e.target.value)

  const handleFilter = () =>
    pushParam({ [filterKey]: filterActive ? null : "1" })

  const cycleCurrency = () => {
    const idx = currencies.indexOf(currentCurrency)
    const next = currencies[(idx + 1) % currencies.length]
    pushParam({ [currencyKey]: next === "ALL" ? null : next })
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-[#ededed]">
          Recent Transactions
        </p>

        {/* Actions toolbar */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <label
            className={cn(
              "flex w-60 items-center gap-2 rounded-lg border px-3 py-2",
              "border-[#282828] bg-[#1e1e1e]",
              "cursor-text transition-colors focus-within:border-[#3e3e3e]"
            )}
          >
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              strokeWidth={1.5}
              className="shrink-0 text-[#4e4e4e]"
            />
            <input
              id="transactions-search"
              type="text"
              placeholder="Search"
              value={inputValue}
              onChange={handleSearch}
              className="min-w-0 flex-1 bg-transparent text-xs font-normal text-[#ededed] outline-none placeholder:text-[#4e4e4e]"
            />
          </label>

          {/* Filter */}
          <button
            id="transactions-filter"
            type="button"
            onClick={handleFilter}
            aria-pressed={filterActive}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium",
              "border-[#282828] bg-[#1e1e1e] text-[#ededed]",
              "shadow-[inset_-2px_-2px_4px_0px_rgba(18,18,18,0.25)]",
              "transition-colors hover:border-[#3e3e3e] hover:bg-[#242424]",
              filterActive && "border-[#83b047]/40 bg-[rgba(131,176,71,0.06)]"
            )}
          >
            <HugeiconsIcon
              icon={FilterIcon}
              size={16}
              strokeWidth={1.5}
              className={filterActive ? "text-[#83b047]" : "text-[#ededed]"}
            />
            <span className={filterActive ? "text-[#83b047]" : ""}>Filter</span>
          </button>

          {/* Currency */}
          <button
            id="transactions-currency"
            type="button"
            onClick={cycleCurrency}
            aria-label={`Currency: ${currentCurrency}`}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium",
              "border-[#282828] bg-[#1e1e1e] text-[#ededed]",
              "shadow-[inset_-2px_-2px_4px_0px_rgba(18,18,18,0.25)]",
              "transition-colors hover:border-[#3e3e3e] hover:bg-[#242424]"
            )}
          >
            <span>{currentCurrency}</span>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={16}
              strokeWidth={1.5}
              className="shrink-0 text-[#ededed]"
            />
          </button>
        </div>
      </div>

      {/* ── Table (reuses the generic DataTable from components/data-table.tsx) ── */}
      <DataTable
        columns={columns}
        data={transactions}
        emptyMessage="No transactions in this period"
        pageSize={10}
      />
    </div>
  )
}
