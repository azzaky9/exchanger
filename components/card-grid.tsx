import { cn } from "@/lib/utils"
import * as React from "react"

interface CardGridProps {
  /** Maximum number of columns at the widest breakpoint (default: 4) */
  cols?: 1 | 2 | 3 | 4
  className?: string
  children: React.ReactNode
}

const colsMap: Record<number, string> = {
  1: "",
  2: "@xl/main:grid-cols-2",
  3: "@xl/main:grid-cols-2 @5xl/main:grid-cols-3",
  4: "@xl/main:grid-cols-2 @5xl/main:grid-cols-4",
}

/**
 * A responsive grid container that stretches children to equal height.
 * Drop any card components inside — they will automatically fill their column.
 *
 * @example
 * <CardGrid cols={4}>
 *   <RevenueCard ... />
 *   <RevenueCard ... />
 * </CardGrid>
 */
export function CardGrid({ cols = 4, className, children }: CardGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-stretch gap-4",
        colsMap[cols],
        className
      )}
    >
      {children}
    </div>
  )
}
