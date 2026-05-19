import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryProvider } from "@/components/providers/query-provider"
import { ProgressBarProvider } from "@/components/providers/progress-bar-provider"
import { cn } from "@/lib/utils"
import "./globals.css"
import { SessionProvider } from "next-auth/react"
import { Manrope } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", "font-sans", manrope.className)}
    >
      <body>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <SessionProvider refetchOnWindowFocus>
                <ProgressBarProvider>{children}</ProgressBarProvider>
              </SessionProvider>
            </TooltipProvider>
          </ThemeProvider>
          <Toaster position="top-center" />
        </QueryProvider>
      </body>
    </html>
  )
}
