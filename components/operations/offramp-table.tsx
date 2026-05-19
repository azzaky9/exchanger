"use client"

import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { TransactionStatusChip } from "@/components/operations/transaction-status-chip"
import { Button } from "@/components/ui/button"
import { UploadInvoiceModal } from "@/components/operations/upload-invoice-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  MoreHorizontalCircle01Icon,
  FilesIcon,
  PackageReceiveIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"

import { DataTable } from "../data-table"
import { UploadTxHashModal } from "./input-txhash-modal"

export interface OfframpTransaction {
  id: string
  orderId: string
  type: string
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "complete"
    | "fiat_arrival"
    | "crypto_arrival"
  totalAmountSent: string
  totalReceived: string
  profitUsdt: string
  profitPercentage: string
  gicProfit: string
  spinzoProfit: string
  transactionProfitSpread: string
  targetAddress: string
  treasuryAddress: string
  txHash: string
  createdAt: string
  lastUpdated: string
  lastUpdatedBy: string
}

const columns: ColumnDef<OfframpTransaction>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("id")}</span>
    ),
  },
  {
    accessorKey: "orderId",
    header: "ORDER ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-[#4e4e4e]">
        {(row.getValue("orderId") as string).slice(0, 8)}...
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => (
      <TransactionStatusChip status={row.getValue("status") as string} />
    ),
  },
  {
    accessorKey: "totalAmountSent",
    header: "LOTTO SENT",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("totalAmountSent")}</span>
    ),
  },
  {
    accessorKey: "totalReceived",
    header: "LOTTO RECEIVED",
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
    accessorKey: "gicProfit",
    header: "GIC PROFIT",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("gicProfit")}</span>
    ),
  },
  {
    accessorKey: "spinzoProfit",
    header: "SPINZO PROFIT",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("spinzoProfit")}</span>
    ),
  },
  {
    accessorKey: "transactionProfitSpread",
    header: "PROFIT SPREAD %",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("transactionProfitSpread")}</span>
    ),
  },
  {
    accessorKey: "treasuryAddress",
    header: "TREASURY ADDRESS",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.getValue("treasuryAddress")}
      </span>
    ),
  },
  {
    accessorKey: "txHash",
    header: "PROOF (TX HASH)",
    cell: ({ row }) => {
      const tx = row.getValue("txHash") as string
      return (
        <span className="font-mono text-xs">
          {tx && tx !== "-" ? `${tx.slice(0, 10)}...` : tx || "-"}
        </span>
      )
    },
  },
  {
    accessorKey: "lastUpdated",
    header: "LAST UPDATED",
    cell: ({ row }) => (
      <span className="text-xs whitespace-nowrap">
        {row.getValue("lastUpdated")}
      </span>
    ),
  },
  {
    accessorKey: "lastUpdatedBy",
    header: "UPDATED BY",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("lastUpdatedBy")}</span>
    ),
  },
  {
    id: "actions",
    header: "ACTIONS",
    cell: ({ row }) => <OfframpActionCell row={row} />,
  },
]

/* ── Dropdown action cell ── */
function OfframpActionCell({ row }: { row: any }) {
  const [loading, setLoading] = React.useState<string | null>(null)
  const [txHashOpen, setTxHashOpen] = React.useState(false)
  const queryClient = useQueryClient()
  const status = row.original.status as string
  const transactionId = parseInt(row.original.id, 10)

  const updateStatus = async (newStatus: string) => {
    setLoading(newStatus)
    try {
      const res = await fetch("/api/transactions/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update status")
      }
      toast.success(json.message)
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(null)
    }
  }

  if (status === "complete") {
    return <span className="text-xs text-[#83b047]">✓ Done</span>
  }

  const canConfirmArrival =
    status !== "fiat_arrival" &&
    status !== "crypto_arrival" &&
    status !== "complete"
  const canMarkComplete =
    status === "crypto_arrival" ||
    status === "processing" ||
    status === "fiat_arrival"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          disabled={loading !== null}
        >
          <span className="sr-only">Open menu</span>
          {loading ? (
            <span className="animate-spin text-xs">⏳</span>
          ) : (
            <HugeiconsIcon
              icon={MoreHorizontalCircle01Icon}
              className="h-4 w-4"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem onClick={() => setTxHashOpen(true)}>
          <HugeiconsIcon icon={FilesIcon} className="mr-2 h-4 w-4" />
          Upload Tx Hash
        </DropdownMenuItem>
        {canConfirmArrival && (
          <DropdownMenuItem onClick={() => updateStatus("crypto_arrival")}>
            <HugeiconsIcon icon={PackageReceiveIcon} className="mr-2 h-4 w-4" />
            Confirm Arrival
          </DropdownMenuItem>
        )}
        {canMarkComplete && (
          <DropdownMenuItem
            onClick={() => updateStatus("complete")}
            className="text-[#83b047] focus:text-[#83b047]"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="mr-2 h-4 w-4"
            />
            Mark as Done
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface OfframpTableProps {
  data?: OfframpTransaction[]
}

export function OfframpTable({ data: initialData = [] }: OfframpTableProps) {
  const searchParams = useSearchParams()
  const q = searchParams.get("q") || ""
  const filter = searchParams.get("filter") || ""
  const currency = searchParams.get("currency") || ""

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", "crypto_to_fiat", q, filter, currency],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append("type", "crypto_to_fiat")
      if (q) params.append("q", q)
      if (filter) params.append("filter", filter)
      if (currency) params.append("currency", currency)

      const res = await fetch(`/api/transactions?${params.toString()}`)
      const json = await res.json()
      return json.data as OfframpTransaction[]
    },
    initialData: initialData.length > 0 ? initialData : undefined,
  })

  return (
    <DataTable
      columns={columns}
      data={data || []}
      emptyMessage={
        isLoading ? "Loading transactions..." : "No transactions in this period"
      }
      pageSize={10}
    />
  )
}
