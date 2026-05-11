"use client"

import { type ColumnDef } from "@tanstack/react-table"

import { cn } from "@/lib/utils"

import { DataTable } from "../data-table"

export interface OnrampTransaction {
  id: string
  type: string
  status: "completed" | "pending" | "failed"
  confirmArrivalAction: string
  totalAmountSent: string
  totalReceived: string
  profitUsdt: string
  profitPercentage: string
}

const STATUS_STYLES: Record<OnrampTransaction["status"], string> = {
  completed: "text-[#83b047]",
  pending: "text-[#e38752]",
  failed: "text-[#e05252]",
}

const columns: ColumnDef<OnrampTransaction>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("id")}</span>
    ),
  },
  {
    accessorKey: "type",
    header: "TRANSACTION TYPE",
    cell: ({ row }) => <span className="text-xs">{row.getValue("type")}</span>,
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => {
      const status = row.getValue("status") as OnrampTransaction["status"]
      return (
        <span className={cn("text-xs font-medium", STATUS_STYLES[status])}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      )
    },
  },
  {
    accessorKey: "confirmArrivalAction",
    header: "CONFIRM ARRIVAL ACTION",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("confirmArrivalAction")}</span>
    ),
  },
  {
    accessorKey: "totalAmountSent",
    header: "TOTAL AMOUNT SENT",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("totalAmountSent")}</span>
    ),
  },
  {
    accessorKey: "totalReceived",
    header: "TOTAL RECEIVED",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("totalReceived")}</span>
    ),
  },
  {
    accessorKey: "profitUsdt",
    header: "PROFIT ( USDT )",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("profitUsdt")}</span>
    ),
  },
  {
    accessorKey: "profitPercentage",
    header: "PROFIT PERCENTAGE",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("profitPercentage")}</span>
    ),
  },
]

export function OfframpTable() {
  return (
    <DataTable
      columns={columns}
      data={[]}
      emptyMessage="No treasuries in this period"
      pageSize={10}
    />
  )
}
