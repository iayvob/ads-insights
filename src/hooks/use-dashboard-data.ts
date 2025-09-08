"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/session-context"
import { DashboardData } from "@/services/dashboard"

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { data: session, status } = useSession()

  const fetchData = useCallback(
    async (showToast = false) => {
      // Don't fetch if not authenticated
      if (status === "unauthenticated" || !session?.authenticated) {
        setLoading(false)
        setError("Authentication required")
        return
      }

      // Wait for authentication to complete
      if (status === "loading") {
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/dashboard/data", {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          }
        })

        if (response.status === 401) {
          setError("Authentication required")
          return
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.status}`)
        }

        const dashboardData = await response.json()
        setData(dashboardData)

        if (showToast) {
          toast({
            title: "Data Updated",
            description: "Dashboard data has been refreshed successfully",
          })
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch dashboard data"
        setError(errorMessage)

        if (showToast) {
          toast({
            title: "Update Failed",
            description: errorMessage,
            variant: "destructive",
          })
        }
      } finally {
        setLoading(false)
      }
    },
    [toast, session, status],
  )

  const refreshData = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refreshData,
  }
}
