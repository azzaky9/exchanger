"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function TogglerNavbar() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  // Ensure component is mounted before rendering to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // If not mounted, render a placeholder (prevents layout shift and animation snapping)
  if (!mounted) {
    return (
      <div className="flex min-h-[68px] w-full items-center justify-between py-4" />
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <div className="flex w-full items-center justify-between py-4 group-data-[collapsible=icon]:hidden">
      <div className="flex flex-col items-start gap-1 leading-none font-medium">
        <p className="text-[11px] tracking-wider text-muted-foreground">
          Theme
        </p>
        <p className="text-[14px] text-foreground">
          {isDark ? "Dark mode" : "Light mode"}
        </p>
      </div>
      <button
        type="button"
        aria-pressed={isDark}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="relative flex h-[36px] w-[72px] cursor-pointer items-center overflow-hidden rounded-full border border-border bg-muted transition-colors hover:bg-muted/80 active:scale-95"
      >
        {/* Sliding indicator */}
        <span
          className="absolute top-0 left-0 h-full w-1/2 rounded-full bg-foreground shadow-sm !transition-all duration-300"
          style={{
            transform: isDark ? "translateX(0%)" : "translateX(100%)",
            transition: mounted
              ? "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
              : "none",
          }}
        />

        {/* Moon icon */}
        <span
          className={`relative z-10 flex h-full w-1/2 items-center justify-center ${
            isDark ? "text-background" : "text-muted-foreground"
          }`}
          style={{
            transform: isDark ? "scale(1)" : "scale(0.85)",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        </span>

        {/* Sun icon */}
        <span
          className={`relative z-10 flex h-full w-1/2 items-center justify-center ${
            !isDark ? "text-background" : "text-muted-foreground"
          }`}
          style={{
            transform: !isDark ? "scale(1)" : "scale(0.85)",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        </span>
      </button>
    </div>
  )
}
