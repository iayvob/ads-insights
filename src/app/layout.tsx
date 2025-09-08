import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { SessionProvider } from "@/hooks/session-context"
import { LayoutWrapper } from "@/components/layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Social Media Business Authentication",
  description: "Secure authentication for social media business accounts",
  keywords: ["social media", "authentication", "business", "ads", "API"],
  robots: "index, follow",
  creator: "Chalabi Ayoub",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <SessionProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </SessionProvider>
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  )
}