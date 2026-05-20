"use client"

import { useQueryClient } from "@tanstack/react-query"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UploadTxHashModalProps {
  open: boolean
  orderId: string;
  onOpenChange: (open: boolean) => void
  transactionId: number
}

export function UploadTxHashModal({
  open,
  orderId,
  onOpenChange,
  transactionId,
}: UploadTxHashModalProps) {
  const [txHash, setTxHash] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!txHash.trim()) {
      toast.error("Transaction hash is required")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/upload-tx/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, txHash: txHash.trim() }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to upload tx hash")
      }

      toast.success(json.message || "Transaction hash saved")
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      setTxHash("")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Proof</DialogTitle>
            <DialogDescription>
              Provide the crypto transaction hash as proof of transfer for
              transaction #{transactionId}.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="px-4 py-6">
            <Field>
              <Label htmlFor="tx-hash-input">Transaction Hash</Label>
              <Input
                id="tx-hash-input"
                name="txHash"
                placeholder="0x..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                autoFocus
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !txHash.trim()}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
