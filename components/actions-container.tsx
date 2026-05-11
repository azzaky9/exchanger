"use client"

import {
  ArrowDown01Icon,
  FilterIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState, useTransition } from "react"

import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"

// ─── Currency options ────────────────────────────────────────────────────────
const CURRENCY_OPTIONS = ["ALL", "USDT", "PHP", "USD"] as const
type Currency = (typeof CURRENCY_OPTIONS)[number]

// ─── Props ───────────────────────────────────────────────────────────────────
interface ActionsContainerProps {
  /** URL search param key for the search query (default: "q") */
  searchKey?: string
  /** URL search param key for the filter toggle (default: "filter") */
  filterKey?: string
  /** URL search param key for currency selection (default: "currency") */
  currencyKey?: string
  /** Available currency options */
  currencies?: readonly string[]
  /** Debounce delay in ms for the search input (default: 350) */
  searchDelay?: number
  className?: string
}

/**
 * A reusable toolbar with a search input, filter toggle button, and a currency
 * dropdown. The search input is debounced — URL params are only pushed after
 * the user stops typing for `searchDelay` ms.
 *
 * @example
 * // In any page:
 * <ActionsContainer searchKey="q" currencyKey="currency" />
 */
export function ActionsContainer({
  searchKey = "q",
  filterKey = "filter",
  currencyKey = "currency",
  currencies = CURRENCY_OPTIONS,
  searchDelay = 350,
  className,
}: ActionsContainerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const filterActive = searchParams.get(filterKey) === "1"
  const currentCurrency = (searchParams.get(currencyKey) ?? "ALL") as Currency

  // ── Search: local state updates immediately, URL is pushed after debounce ──
  const [inputValue, setInputValue] = useState(
    searchParams.get(searchKey) ?? ""
  )
  const debouncedSearch = useDebounce(inputValue, searchDelay)

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const pushParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      startTransition(() => {
        router.push(`?${params.toString()}`, { scroll: false })
      })
    },
    [router, searchParams]
  )

  // Push debounced search value to URL
  useEffect(() => {
    pushParam(searchKey, debouncedSearch || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleFilter = () => {
    pushParam(filterKey, filterActive ? null : "1")
  }

  const cycleCurrency = () => {
    const idx = currencies.indexOf(currentCurrency)
    const next = currencies[(idx + 1) % currencies.length]
    pushParam(currencyKey, next === "ALL" ? null : next)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Search input */}
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
          id="actions-search"
          type="text"
          placeholder="Search"
          value={inputValue}
          onChange={handleSearch}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-xs font-normal text-[#4e4e4e]",
            "outline-none placeholder:text-[#4e4e4e]"
          )}
        />
      </label>

      {/* Filter button */}
      <button
        id="actions-filter"
        type="button"
        onClick={handleFilter}
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium",
          "border-[#282828] bg-[#1e1e1e] text-[#ededed]",
          "shadow-[inset_-2px_-2px_4px_0px_rgba(18,18,18,0.25)]",
          "transition-colors hover:border-[#3e3e3e] hover:bg-[#242424]",
          filterActive && "border-[#83b047]/40 bg-[rgba(131,176,71,0.06)]"
        )}
        aria-pressed={filterActive}
      >
        <HugeiconsIcon
          icon={FilterIcon}
          size={16}
          strokeWidth={1.5}
          className={filterActive ? "text-[#83b047]" : "text-[#ededed]"}
        />
        <span className={filterActive ? "text-[#83b047]" : ""}>Filter</span>
      </button>

      {/* Currency selector */}
      <button
        id="actions-currency"
        type="button"
        onClick={cycleCurrency}
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium",
          "border-[#282828] bg-[#1e1e1e] text-[#ededed]",
          "shadow-[inset_-2px_-2px_4px_0px_rgba(18,18,18,0.25)]",
          "transition-colors hover:border-[#3e3e3e] hover:bg-[#242424]"
        )}
        aria-label={`Currency: ${currentCurrency}`}
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
  )
}
