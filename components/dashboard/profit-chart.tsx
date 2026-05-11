"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ProfitDataPoint {
  date: string
  usdt: number
  php: number
}

interface ProfitChartProps {
  data?: ProfitDataPoint[]
  className?: string
}

// ─── Chart config (colors match Figma legend dots) ───────────────────────────
const chartConfig = {
  usdt: {
    label: "USDT Profit",
    color: "#83b047", // green
  },
} satisfies ChartConfig

// ─── Placeholder data (zeros while real data loads) ──────────────────────────
const PLACEHOLDER_DATA: ProfitDataPoint[] = Array.from(
  { length: 7 },
  (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
    usdt: 0,
    php: 0,
  })
)

// ─── Legend Indicator ────────────────────────────────────────────────────────
function LegendIndicator({
  color,
  label,
  sub,
}: {
  color: string
  label: string
  sub: string
}) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="block size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-[12px] font-medium text-[#ededed]">{label}</span>
      <span className="text-[12px] text-[#4e4e4e]">{sub}</span>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ProfitChart({
  data = PLACEHOLDER_DATA,
  className,
}: ProfitChartProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 rounded-lg border p-4",
        "border-[#2e2e2e] bg-[#121212]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-[#ededed]">
          Daily Profit Breakdown
        </p>

        {/* Legend */}
        <div className="flex items-center gap-3">
          <LegendIndicator
            color={chartConfig.usdt.color}
            label="USDT Profit"
            sub="Flat → Crypto"
          />
        </div>
      </div>

      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gradUsdt" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={chartConfig.usdt.color}
                stopOpacity={0.15}
              />
              <stop
                offset="95%"
                stopColor={chartConfig.usdt.color}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke="#2e2e2e"
            strokeDasharray="4 4"
          />

          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#4e4e4e", fontSize: 10 }}
            tickFormatter={(v: string) =>
              new Date(v).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
            interval="preserveStartEnd"
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#4e4e4e", fontSize: 10 }}
            tickFormatter={(v: number) => v.toFixed(2)}
            width={40}
          />

          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(v) =>
                  new Date(v).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                }
              />
            }
          />

          <Area
            type="monotone"
            dataKey="usdt"
            stroke={chartConfig.usdt.color}
            strokeWidth={1.5}
            fill="url(#gradUsdt)"
            dot={false}
            activeDot={{ r: 4, fill: chartConfig.usdt.color }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
