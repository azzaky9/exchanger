"use client"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ChevronDown } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export type TNavMainData = {
  name: string
  url: string
  icon: React.ReactNode
  items?: {
    name: string
    url: string
  }[]
}

export function NavMain({ items }: { items: TNavMainData[] }) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-xs font-bold tracking-widest text-muted-foreground/40 uppercase">
        OVERVIEW
      </SidebarGroupLabel>
      <SidebarMenu className="flex flex-col gap-2 pt-2">
        {items.map((item) => (
          <NavMainItem key={item.name} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavMainItem({ item }: { item: TNavMainData }) {
  const pathname = usePathname()
  const hasChildren = item.items && item.items.length > 0

  // Check if any child is active or the parent itself is active
  const isAnyChildActive =
    hasChildren && item.items!.some((sub) => pathname === sub.url)
  const isParentActive = pathname === item.url || isAnyChildActive

  const [isOpen, setIsOpen] = useState(isAnyChildActive)

  // Sync open state when a child becomes active
  useEffect(() => {
    if (isAnyChildActive) {
      setIsOpen(true)
    }
  }, [isAnyChildActive])

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isParentActive}
        className={cn(
          "h-auto transition-all duration-300",
          isParentActive
            ? "w-[198px] rounded-[8px] border border-[#5E5E5E] bg-[linear-gradient(92deg,#2E2E2E_0%,#1E1E1E_50%)] p-[8px_12px] shadow-lg"
            : "rounded-xl px-3 py-2 hover:bg-sidebar-accent/50"
        )}
      >
        {hasChildren ? (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between px-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "transition-colors duration-300",
                  isParentActive
                    ? "text-white [&_img]:brightness-0 [&_img]:invert"
                    : "text-muted-foreground"
                )}
              >
                {item.icon}
              </span>
              <span
                className={cn(
                  "text-[13px] transition-colors duration-300",
                  isParentActive ? "text-white" : "text-muted-foreground"
                )}
              >
                {item.name}
              </span>
            </div>
            <HugeiconsIcon
              icon={ChevronDown}
              className={cn(
                "size-3.5 transition-transform duration-300",
                isOpen && "rotate-180",
                isParentActive ? "text-white" : "text-muted-foreground/60"
              )}
            />
          </button>
        ) : (
          <Link
            href={item.url}
            className="flex w-full items-center justify-between px-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "transition-colors duration-300",
                  isParentActive
                    ? "text-white [&_img]:brightness-0 [&_img]:invert"
                    : "text-muted-foreground"
                )}
              >
                {item.icon}
              </span>
              <span
                className={cn(
                  "text-[13px] font-semibold transition-colors duration-300",
                  isParentActive ? "text-white" : "text-muted-foreground"
                )}
              >
                {item.name}
              </span>
            </div>
            {/* Placeholder to match the chevron spacing and maintain same sizing */}
            <div className="size-3.5" />
          </Link>
        )}
      </SidebarMenuButton>

      {hasChildren && (
        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            isOpen
              ? "mt-1 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <SidebarMenuSub className="ml-[22px] gap-0 border-l-0 pl-0">
              {item.items!.map((subItem, index) => {
                const isSubActive = pathname === subItem.url
                return (
                  <SidebarMenuSubItem
                    key={subItem.name}
                    className="relative flex h-10 items-center"
                  >
                    {/* Vertical white line connector */}
                    <div
                      className={cn(
                        "absolute left-0 w-px bg-white/10",
                        index === item.items!.length - 1
                          ? "top-0 h-5"
                          : "top-0 h-full"
                      )}
                    />
                    {/* Horizontal curved branch line */}
                    <div className="absolute top-5 left-0 h-2.5 w-4 rounded-bl-lg border-b border-l border-white/10" />

                    <SidebarMenuSubButton
                      asChild
                      isActive={isSubActive}
                      className="ml-5 h-full bg-transparent!"
                    >
                      <Link href={subItem.url} className="flex items-center">
                        <span
                          className={cn(
                            "text-[13px] transition-all duration-300",
                            isSubActive
                              ? "scale-[1.02] font-bold text-white"
                              : "font-medium text-muted-foreground/60 hover:text-muted-foreground"
                          )}
                        >
                          {subItem.name}
                        </span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )
              })}
            </SidebarMenuSub>
          </div>
        </div>
      )}
    </SidebarMenuItem>
  )
}
