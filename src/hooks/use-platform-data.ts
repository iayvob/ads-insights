"use client"

import { useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"

interface UsePlatformDataOptions {
  platform: "facebook" | "instagram" | "twitter"
  onError?: (error: Error) => void
  onSuccess?: (data: any) => void
}

export function usePlatformData({ platform, onError, onSuccess }: UsePlatformDataOptions) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchData = useCallback(
    async (options: any = {}) => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/dashboard/${platform}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(options),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch ${platform} data: ${response.status}`)
        }

        const platformData = await response.json()
        setData(platformData)

        toast({
          title: "Data Updated",
          description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} data refreshed successfully`,
        })

        onSuccess?.(platformData)
        return platformData
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Failed to fetch ${platform} data`
        setError(errorMessage)

        toast({
          title: "Update Failed",
          description: errorMessage,
          variant: "destructive",
        })

        onError?.(err instanceof Error ? err : new Error(errorMessage))
        throw err
      } finally {
        setLoading(false)
      }
    },
    [platform, toast, onError, onSuccess],
  )

  const refreshData = useCallback(
    (options: any = {}) => {
      return fetchData(options)
    },
    [fetchData],
  )

  return {
    data,
    loading,
    error,
    fetchData,
    refreshData,
  }
}
