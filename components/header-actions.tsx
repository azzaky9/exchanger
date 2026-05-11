"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUpDownIcon,
  Notification03Icon,
  ChevronDown,
  Notification01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export function ExchangeRatePill() {
  const [isUsdtFirst, setIsUsdtFirst] = React.useState(true)
  const rate = 60.04

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#1A1A1A] p-1.5 pl-3 shadow-2xl">
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          <div className="absolute size-2.5 rounded-full bg-active/20 blur-[2px]" />
          <div className="size-1.5 rounded-full bg-active" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] tracking-tight text-muted-foreground uppercase">
            {isUsdtFirst ? "USDT/PHP" : "PHP/USDT"}
          </span>
          <span className="text-[13px] tracking-tight text-white">
            {isUsdtFirst ? rate : (1 / rate).toFixed(4)}
          </span>
        </div>
      </div>
      <button
        onClick={() => setIsUsdtFirst(!isUsdtFirst)}
        className="flex size-7 items-center justify-center rounded-lg border-1 border-active/40 bg-[#242424] text-active transition-all hover:bg-[#2A2A2A] active:scale-95"
      >
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}

export function HeaderActions() {
  return (
    <div className="flex items-center gap-4">
      <ExchangeRatePill />

      <div className="h-6 w-px bg-white/[0.08]" />

      <button className="flex size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-white transition-all hover:bg-[#242424] hover:text-white active:scale-95">
        <HugeiconsIcon icon={Notification01Icon} size={20} strokeWidth={1.5} />
      </button>

      <div className="flex items-center gap-3 pl-1">
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[13px] leading-none font-bold text-white">
            admin@vault.io
          </span>
          <span className="text-[11px] leading-none font-semibold text-muted-foreground">
            Admin
          </span>
        </div>
        <button className="flex items-center justify-center text-muted-foreground/60 transition-colors hover:text-white">
          <HugeiconsIcon icon={ChevronDown} size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
