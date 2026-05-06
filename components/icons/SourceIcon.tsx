"use client"

import Image from "next/image"
import { useState } from "react"

type Props = {
  url: string | null | undefined
  width?: string | number
  height?: string | number
}

export default function SourceIcon({ url, width, height }: Props) {
  const [hasError, setHasError] = useState(false)

  // Show a generic link/source fallback icon if the URL is missing or fails to load
  if (!url || hasError) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center rounded-md bg-muted text-muted-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="50%"
          height="50%"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>
    )
  }

  return (
    <Image
      src={url}
      alt="Source icon"
      width={Number(width)}
      height={Number(height)}
      onError={() => setHasError(true)}
      className="object-cover"
    />
  )
}
