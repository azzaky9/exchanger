"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { useSearchParams } from "next/navigation"
import * as React from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"

import { TransactionStatusChip } from "@/components/operations/transaction-status-chip"
import { UploadInvoiceModal } from "@/components/operations/upload-invoice-modal"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CheckmarkCircle02Icon,
  FilesIcon,
  MoreHorizontalCircle01Icon,
  PackageReceiveIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { getExplorerName, getExplorerTxUrl } from "@/lib/explorer"
import { useSession } from "next-auth/react"
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
  networkSymbol: string
  txHash: string
  createdAt: string
  lastUpdated: string
  lastUpdatedBy: string
  exchangeRate: string
  markupExchangeRate?: string
  amountSentToExchange?: string
  invoiceUrl?: string | null
}

/* ── Lightbox for image preview ── */
function ImagePreviewCell({ url }: { url: string | null | undefined }) {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!url) {
    return <span className="text-xs text-[#4e4e4e]">-</span>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative size-10 overflow-hidden rounded border border-[#282828] transition-all hover:border-[#4e4e4e]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Invoice"
          className="size-full object-cover transition-transform group-hover:scale-110"
        />
      </button>

      {/* Lightbox overlay */}
      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg border border-[#282828] bg-[#121212] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                ✕
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Invoice preview"
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

const baseColumns: ColumnDef<OfframpTransaction>[] = [
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
    accessorKey: "markupExchangeRate",
    header: "MARKUP EXCHANGE RATE",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("markupExchangeRate")}</span>
    ),
  },
  {
    accessorKey: "amountSentToExchange",
    header: "AMOUNT SENT TO EXCHANGE",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("amountSentToExchange")}</span>
    ),
  },
  {
    accessorKey: "exchangeRate",
    header: "REFERENCE RATE",
    cell: ({ row }) => {

      console.log("ROW DATA", row.original)
      const role = (row as any).table?.options?.meta?.role
      const value = role === "lotto"
        ? row.original.markupExchangeRate
        : row.getValue("exchangeRate")
      return <span className="text-xs">{value as string}</span>
    },
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
    id: "invoicePreview",
    header: "INVOICE",
    size: 80,
    cell: ({ row }) => <ImagePreviewCell url={row.original.invoiceUrl} />,
  },
  {
    accessorKey: "txHash",
    header: "PROOF (TX HASH)",
    cell: ({ row }) => {
      const tx = row.getValue("txHash") as string
      const networkSymbol = row.original.networkSymbol
      const explorerUrl = getExplorerTxUrl(networkSymbol, tx)
      const explorerName = getExplorerName(networkSymbol)

      if (!tx || tx === "-") {
        return <span className="font-mono text-xs text-[#4e4e4e]">-</span>
      }

      if (explorerUrl) {
        return (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`View on ${explorerName}`}
            className="group inline-flex items-center gap-1 font-mono text-xs text-[#83b047] transition-colors hover:text-[#a0d060]"
          >
            <span>{tx.slice(0, 10)}...</span>
            <svg
              className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10M10 2h4v4M7 9l7-7" />
            </svg>
          </a>
        )
      }

      return (
        <span className="font-mono text-xs">
          {tx.slice(0, 10)}...
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

function getColumns(role?: string): ColumnDef<OfframpTransaction>[] {
  const statusColumn: ColumnDef<OfframpTransaction> = {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => (
      <TransactionStatusChip status={row.getValue("status") as string} role={role} />
    ),
  }

  if (role === "gic" || role === "lotto") {
    const hiddenKeys = [
      "profitUsdt",
      "profitPercentage",
      "spinzoProfit",
      "transactionProfitSpread",
      ...(role === "lotto"
        ? ["markupExchangeRate", "amountSentToExchange", "gicProfit"]
        : [])
    ];
    return baseColumns
      .map(c => ((c as any).accessorKey === "status" ? statusColumn : c))
      .filter(c => {
        const key = (c as any).accessorKey || c.id;
        return !hiddenKeys.includes(key);
      });
  }
  return baseColumns.map(c => ((c as any).accessorKey === "status" ? statusColumn : c));
}

/* ── Dropdown action cell ── */
function OfframpActionCell({ row }: { row: any }) {
  const session = useSession()

  const role = session.data?.user ? (session.data.user as any).role : null
  const [loading, setLoading] = React.useState<string | null>(null)
  const [txHashOpen, setTxHashOpen] = React.useState(false)
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const queryClient = useQueryClient()
  const status = row.original.status as string
  const transactionId = parseInt(row.original.id, 10)
  const isInvoiceUploaded = !!row.original.invoiceUrl

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

  console.log("DATA SESSION", session)
  console.log("ROLE: ", role)

  if (role === "gic") {
    return null; // GIC is strictly read-only
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

  // Admin dropdown
  return (
    <>
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
          {role === "admin" ? (
            <DropdownMenuItem
              className="disabled:cursor-not-allowed"
              onClick={() => setUploadOpen(true)}
              disabled={isInvoiceUploaded}
            >
              <HugeiconsIcon icon={FilesIcon} className="mr-2 h-4 w-4" />
              Upload Invoice
            </DropdownMenuItem>
          ) : <>
            <DropdownMenuItem
              className="disabled:cursor-not-allowed"
              onClick={() => setTxHashOpen(true)}
              disabled={loading !== null || !!(row.original.txHash && row.original.txHash !== "-")}
            >
              <HugeiconsIcon icon={FilesIcon} className="mr-1.5 h-3 w-3" />
              Upload Tx Hash
            </DropdownMenuItem>
            <UploadTxHashModal

              orderId={row.original.orderId}
              open={txHashOpen}
              onOpenChange={setTxHashOpen}
              transactionId={transactionId}
            />
          </>}
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

      <UploadInvoiceModal
        transactionId={row.original.id}
        orderId={row.original.orderId}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      >
        <span />
      </UploadInvoiceModal>
    </>
  )
}

interface OfframpTableProps {
  data?: OfframpTransaction[]
  role?: string
}

export function OfframpTable({ data: initialData = [], role }: OfframpTableProps) {
  const session = useSession()
  const resolvedRole = role || (session.data?.user ? (session.data.user as any).role : undefined)
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

  const columns = React.useMemo(() => getColumns(resolvedRole), [resolvedRole])

  return (
    <DataTable
      columns={columns}
      data={data || []}
      emptyMessage={
        isLoading ? "Loading transactions..." : "No transactions in this period"
      }
      pageSize={10}
      meta={{ role: resolvedRole }}
    />
  )
}
