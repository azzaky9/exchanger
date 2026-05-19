import { prisma } from "@/lib/prisma"
import { enum_transactions_type } from "@/generated/prisma"

export async function getTransactions(params?: {
  type?: enum_transactions_type
  q?: string
  filter?: string
  currency?: string
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  // Filter by transaction type (fiat_to_crypto or crypto_to_fiat)
  if (params?.type) {
    where.type = params.type
  }

  // Filter by status if provided
  if (params?.filter) {
    where.status = params.filter
  }

  // Search by order_id, target_address, or tx_hash
  if (params?.q) {
    where.OR = [
      { order_id: { contains: params.q, mode: "insensitive" } },
      { target_address: { contains: params.q, mode: "insensitive" } },
      { tx_hash: { contains: params.q, mode: "insensitive" } },
    ]
  }

  const transactions = await prisma.transactions.findMany({
    where,
    orderBy: {
      created_at: "desc",
    },
    include: {
      exchange_rate: true,
    }
  })

  // Since there is no explicit relation to treasury in the schema, let's fetch treasuries manually
  const treasuryIds = [...new Set(transactions.map(t => t.treasury_id).filter(Boolean))]
  const treasuries = await prisma.treasury.findMany({
    where: {
      id: { in: treasuryIds }
    }
  })
  const treasuryMap = new Map(treasuries.map(t => [t.id, t]))

  // Fetch media records for invoice images
  const mediaIds = [...new Set(transactions.map(t => t.invoice_image_id).filter((id): id is number => id !== null))]
  const mediaRecords = mediaIds.length > 0
    ? await prisma.media.findMany({ where: { id: { in: mediaIds } } })
    : []
  const mediaMap = new Map(mediaRecords.map(m => [m.id, m]))

  return transactions.map(t => ({
    ...t,
    treasury: treasuryMap.get(t.treasury_id) || null,
    invoiceMedia: t.invoice_image_id ? mediaMap.get(t.invoice_image_id) || null : null,
  }))
}
