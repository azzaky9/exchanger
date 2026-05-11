"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

interface RevenueCardProps {
  title?: string
  amount?: string
  percentageChange?: string
  isPositive?: boolean
  description?: string
  className?: string
  withEndLabel?: boolean
  withUSDTIcon?: boolean
}

export function RevenueCard({
  title = "TOTAL REVENUE",
  amount = "0.00",
  percentageChange = "3.27%",
  isPositive = true,
  description,
  className,
  withEndLabel = true,
  withUSDTIcon = true,
}: RevenueCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-between overflow-hidden rounded-lg border p-3",
        // Match Figma: bg #181818, border #2e2e2e
        "border-[#2e2e2e] bg-[#181818]",
        className
      )}
    >
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        <p className="text-base leading-normal font-semibold tracking-wide whitespace-nowrap text-[#ededed]">
          {title}
        </p>

        {/* Percentage change badge */}
        {withEndLabel && (
          <div
            className={cn(
              "flex items-center gap-1 rounded border px-2 py-1.5 text-xs font-medium whitespace-nowrap",
              isPositive
                ? "border-[#090f01] bg-[rgba(131,176,71,0.04)] text-[#83b047]"
                : "border-[#3e1c1c] bg-[rgba(255,80,80,0.04)] text-[#E38752]"
            )}
          >
            {/* Up/Down arrow icon */}
            <span className="relative block size-3 shrink-0">
              <Image
                alt="arrow_up"
                src={isPositive ? "/trending_up.svg" : "/trending_down.svg"}
                width={16}
                height={16}
              />
            </span>
            <span>{percentageChange}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="mt-6 flex w-full flex-col gap-3 pr-2">
        {/* Amount row */}
        <div className="flex w-full items-center justify-between">
          <p className="text-[28px] leading-normal font-semibold whitespace-nowrap text-[#ededed]">
            {amount}
          </p>
          {/* USDT icon */}
          {withUSDTIcon && (
            <div className="relative size-8 shrink-0 overflow-hidden rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="USDT"
                className="absolute inset-0 block size-full"
                src={"/icon_usdt.png"}
              />
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm leading-normal font-medium whitespace-nowrap text-[#4e4e4e]">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
