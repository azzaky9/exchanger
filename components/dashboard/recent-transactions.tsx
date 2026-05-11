"use client"

import {
  ArrowDown01Icon,
  ArrowUpDownIcon,
  FilterIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"

import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────
export type SortDirection = "asc" | "desc" | null

export type TransactionSortKey =
  | "type"
  | "status"
  | "received"
  | "sent"
  | "profit"
  | "created"

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
  sortKeyParam?: string
  sortDirParam?: string
  currencies?: readonly string[]
  className?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CURRENCY_OPTIONS = ["ALL", "USDT", "PHP", "USD"] as const

const COLUMNS: {
  key: TransactionSortKey | null
  label: string
  sortable: boolean
}[] = [
  { key: null, label: "ORDER ID", sortable: false },
  { key: "type", label: "TYPE", sortable: true },
  { key: "status", label: "STATUS", sortable: true },
  { key: "received", label: "RECEIVED", sortable: true },
  { key: "sent", label: "SENT", sortable: true },
  { key: "profit", label: "PROFIT", sortable: true },
  { key: "created", label: "CREATED", sortable: true },
]

const STATUS_STYLES: Record<Transaction["status"], string> = {
  completed: "text-[#83b047]",
  pending: "text-[#e38752]",
  failed: "text-[#e05252]",
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDirection }) {
  return (
    <HugeiconsIcon
      icon={ArrowUpDownIcon}
      size={12}
      strokeWidth={1.5}
      className={cn(
        "shrink-0 transition-colors",
        active ? "text-[#ededed]" : "text-[#4e4e4e]"
      )}
    />
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <p className="text-[12px] font-normal text-[#4e4e4e]">
        No transactions in this period
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function RecentTransactions({
  transactions = [],
  searchKey = "q",
  filterKey = "filter",
  currencyKey = "currency",
  sortKeyParam = "sort",
  sortDirParam = "dir",
  currencies = CURRENCY_OPTIONS,
  className,
}: RecentTransactionsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // ─── Read URL state ───────────────────────────────────────────────────────
  const currentSearch = searchParams.get(searchKey) ?? ""
  const filterActive = searchParams.get(filterKey) === "1"
  const currentCurrency = searchParams.get(currencyKey) ?? "ALL"
  const currentSortKey = searchParams.get(sortKeyParam) ?? ""
  const currentSortDir = (searchParams.get(sortDirParam) ??
    null) as SortDirection

  // ─── Push URL params ──────────────────────────────────────────────────────
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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) =>
    pushParam({ [searchKey]: e.target.value || null })

  const handleFilter = () =>
    pushParam({ [filterKey]: filterActive ? null : "1" })

  const cycleCurrency = () => {
    const idx = currencies.indexOf(currentCurrency)
    const next = currencies[(idx + 1) % currencies.length]
    pushParam({ [currencyKey]: next === "ALL" ? null : next })
  }

  const handleSort = (key: TransactionSortKey) => {
    if (currentSortKey !== key) {
      pushParam({ [sortKeyParam]: key, [sortDirParam]: "asc" })
    } else if (currentSortDir === "asc") {
      pushParam({ [sortKeyParam]: key, [sortDirParam]: "desc" })
    } else {
      pushParam({ [sortKeyParam]: null, [sortDirParam]: null })
    }
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
              value={currentSearch}
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

      {/* ── Table ── */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-[#282828]">
        {/* Column headers */}
        <div className="flex items-center justify-between bg-[#1e1e1e] px-4 py-2">
          {COLUMNS.map(({ key, label, sortable }) => (
            <div
              key={label}
              className={cn(
                "flex items-center gap-0.5",
                sortable && "cursor-pointer select-none"
              )}
              onClick={() => sortable && key && handleSort(key)}
            >
              <span className="text-[12px] font-medium text-[#ededed]">
                {label}
              </span>
              {sortable && key && (
                <SortIcon
                  active={currentSortKey === key}
                  dir={currentSortKey === key ? currentSortDir : null}
                />
              )}
            </div>
          ))}
        </div>

        {/* Rows / Empty state */}
        {transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col divide-y divide-[#1e1e1e]">
            {transactions.map((tx) => (
              <div
                key={tx.orderId}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#1a1a1a]"
              >
                <span className="font-mono text-[12px] text-[#ededed]">
                  {tx.orderId}
                </span>
                <span className="text-[12px] text-[#ededed]">{tx.type}</span>
                <span
                  className={cn(
                    "text-[12px] font-medium",
                    STATUS_STYLES[tx.status]
                  )}
                >
                  {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                </span>
                <span className="text-[12px] text-[#ededed]">
                  {tx.received}
                </span>
                <span className="text-[12px] text-[#ededed]">{tx.sent}</span>
                <span className="text-[12px] text-[#ededed]">{tx.profit}</span>
                <span className="text-[12px] text-[#4e4e4e]">{tx.created}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
