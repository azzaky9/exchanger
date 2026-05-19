"use client"

import * as React from "react"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CloudUploadIcon,
  Cancel01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface UploadedFile {
  file: File
  progress: number // 0-100
  status: "uploading" | "done" | "error"
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

interface UploadInvoiceModalProps {
  /** The element that triggers the modal. */
  children: React.ReactNode
  /** Called when the user confirms upload. */
  onUpload?: (files: File[]) => Promise<void> | void
  /** Transaction ID for contextual display. */
  transactionId?: string
  /** Controlled open state (optional). */
  open?: boolean
  /** Controlled open change handler (optional). */
  onOpenChange?: (open: boolean) => void
}

export function UploadInvoiceModal({
  children,
  onUpload,
  transactionId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: UploadInvoiceModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setFiles([])
    setIsDragging(false)
    setIsSubmitting(false)
  }, [])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen) resetState()
    },
    [setOpen, resetState]
  )

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const newFiles: UploadedFile[] = []

    Array.from(incoming).forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" is not a supported format.`)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" exceeds the 10MB limit.`)
        return
      }
      newFiles.push({ file, progress: 100, status: "done" })
    })

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // ── Drag-and-drop handlers ──
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isDragging) setIsDragging(true)
    },
    [isDragging]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files)
      }
      // Reset input value so re-selecting the same file works
      e.target.value = ""
    },
    [addFiles]
  )

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) {
      toast.error("Please upload at least one file.")
      return
    }

    if (!transactionId) {
      toast.error("Transaction ID is missing.")
      return
    }

    setIsSubmitting(true)

    let allSuccess = true

    for (let i = 0; i < files.length; i++) {
      // Mark file as uploading
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" as const } : f))
      )

      try {
        const formData = new FormData()
        formData.append("transactionId", transactionId)
        formData.append("file", files[i].file)

        const res = await fetch("/api/transactions/proof/upload-invoice", {
          method: "POST",
          body: formData,
        })

        const json = await res.json()

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Upload failed")
        }

        // Mark file as done
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done" as const } : f))
        )
      } catch (err: any) {
        allSuccess = false
        // Mark file as error
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "error" as const } : f))
        )
        toast.error(`Failed to upload "${files[i].file.name}": ${err.message}`)
      }
    }

    if (allSuccess) {
      // Also call optional callback if provided
      try {
        await onUpload?.(files.map((f) => f.file))
      } catch {
        // Optional callback failed, but uploads succeeded
      }
      toast.success("Invoice uploaded successfully.")
      setOpen(false)
      resetState()
    } else {
      toast.error("Some files failed to upload. Please retry.")
    }

    setIsSubmitting(false)
  }, [files, transactionId, onUpload, resetState])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        showCloseButton={false}
        id="upload-invoice-modal"
      >
        {/* ── Header ── */}
        <DialogHeader>
          <DialogTitle>Confirm Done</DialogTitle>
          <DialogDescription>
            Upload invoice image to confirm completion.
            {transactionId && (
              <span className="ml-1 text-xs text-[#5a5a5a]">
                ({transactionId})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="flex flex-col gap-4 px-4 pb-4">
          {/* Drop zone */}
          <button
            type="button"
            className={cn(
              "flex w-full cursor-pointer flex-col items-center gap-4 rounded-lg border border-dashed border-[#282828] p-8 transition-colors",
              isDragging && "border-[#4e4e4e] bg-[#1a1a1a]"
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            id="upload-dropzone"
          >
            <div className="flex size-[60px] items-center justify-center rounded-full">
              <HugeiconsIcon
                icon={CloudUploadIcon}
                strokeWidth={1.5}
                className="size-9 text-[#7d7d7d]"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-[#cfcfcf]">
                Drag or drop your files here
              </p>
              <p className="text-xs text-[#7d7d7d]">
                JPEG, PNG, PDF, and DOC formats, up to 10MB
              </p>
            </div>
          </button>

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".jpeg,.jpg,.png,.pdf,.doc,.docx,.webp"
            multiple
            onChange={handleFileInput}
            id="upload-invoice-file-input"
          />

          {/* Uploaded files list */}
          {files.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-base font-medium text-white">
                Uploaded Files
              </p>
              <div className="flex flex-col gap-2">
                {files.map((uf, index) => (
                  <div
                    key={`${uf.file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-[#282828] py-2.5 pl-4 pr-2.5"
                  >
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium text-[#e3e4e6]">
                        {uf.file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#848484]">
                          {formatFileSize(uf.file.size)}
                        </span>
                        {uf.status === "uploading" && (
                          <div className="flex items-center gap-1">
                            <HugeiconsIcon
                              icon={Loading03Icon}
                              strokeWidth={2}
                              className="size-4 animate-spin text-[#848484]"
                            />
                            <span className="text-sm text-[#848484]">
                              Uploading
                            </span>
                          </div>
                        )}
                        {uf.status === "done" && (
                          <span className="text-xs text-[#83b047]">Ready</span>
                        )}
                        {uf.status === "error" && (
                          <span className="text-xs text-[#e05252]">Error</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="flex size-6 items-center justify-center rounded text-[#848484] transition-colors hover:text-white"
                      id={`remove-file-${index}`}
                    >
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        strokeWidth={2}
                        className="size-4"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CTA Buttons ── */}
          <DialogFooter className="p-0">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="h-10 flex-1 border-[#282828] bg-[#1e1e1e] text-xs text-[#ededed] hover:bg-[#282828]"
                id="upload-invoice-cancel"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              className="h-10 flex-1 bg-[#ededed] text-sm font-medium text-[#121212] hover:bg-white"
              onClick={handleSubmit}
              disabled={isSubmitting || files.length === 0}
              id="upload-invoice-submit"
            >
              {isSubmitting ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
