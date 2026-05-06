"use client"

import * as React from "react"

import { NavMain, TNavMainData } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Image from "next/image"
import { TogglerNavbar } from "./toggler-navbar"
import { Line } from "./ui/line"
import SourceIcon from "./icons/SourceIcon"

const data: { user: Record<string, string>; main: TNavMainData[] } = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  main: [
    {
      name: "Dashboard",
      url: "/dashboard",
      icon: <SourceIcon url="/dashboard.svg" width={21} height={21} />,
    },
    {
      name: "Collections",
      url: "#",
      icon: <SourceIcon url="/collection.svg" width={21} height={21} />,
      items: [
        {
          name: "Users",
          url: "/dashboard/users",
        },
        {
          name: "Exchange Rates",
          url: "/dashboard/exchange-rates",
        },
      ],
    },
    {
      name: "Wallet",
      url: "#",
      icon: <SourceIcon url="/wallets.svg" width={21} height={21} />,
      items: [
        {
          name: "Treasuries",
          url: "/dashboard/treasuries",
        },
      ],
    },
    {
      name: "Operations",
      url: "#",
      icon: <SourceIcon url="/operations.svg" width={21} height={21} />,
      items: [
        {
          name: "Fiat to Crypto",
          url: "/dashboard/operations/fiat-to-crypto",
        },
        {
          name: "Crypto to Fiat",
          url: "/dashboard/operations/crypto-to-fiat",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className={`border-r border-sidebar-border px-3 pb-1 group-data-[collapsible=icon]:border-0`}
    >
      <SidebarHeader className="flex h-20 flex-col justify-between">
        <SidebarMenu className="pt-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="cursor-default bg-transparent! data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <Image src="/logo.svg" alt="SpinzoPay" width={32} height={32} />
                <span className="text-xl font-semibold">SPINZOPAY</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Line />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.main} />
      </SidebarContent>
      <div className="my-4 group-data-[collapsible=icon]:hidden">
        <Line />
      </div>
      <SidebarFooter>
        <TogglerNavbar />
      </SidebarFooter>
    </Sidebar>
  )
}
