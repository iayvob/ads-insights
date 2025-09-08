import { useState, useEffect } from 'react'
import { AnalyticsDashboardData } from '@/services/analytics-dashboard'
import { 
  FacebookAnalytics, 
  InstagramAnalytics, 
  TwitterAnalytics,
  PlatformType 
} from '@/validations/analytics-types'
import { logger } from '@/config/logger'

interface UseAnalyticsDataOptions {
  refreshInterval?: number
  platform?: PlatformType
}

interface UseAnalyticsDataReturn {
  data: AnalyticsDashboardData | null
  platformData: FacebookAnalytics | InstagramAnalytics | TwitterAnalytics | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for fetching analytics data
 * Supports both full dashboard and platform-specific data
 */
export function useAnalyticsData(options: UseAnalyticsDataOptions = {}): UseAnalyticsDataReturn {
  const { refreshInterval, platform } = options
  
  const [data, setData] = useState<AnalyticsDashboardData | null>(null)
  const [platformData, setPlatformData] = useState<FacebookAnalytics | InstagramAnalytics | TwitterAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const url = platform 
        ? `/api/dashboard/analytics?platform=${platform}`
        : '/api/dashboard/analytics'

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()

      if (platform) {
        setPlatformData(result.analytics)
        setData(null)
      } else {
        setData(result)
        setPlatformData(null)
      }

    } catch (err: any) {
      logger.error('Failed to fetch analytics data', { error: err.message, platform })
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Set up auto-refresh if specified
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [platform, refreshInterval])


  return {
    data,
    platformData,
    loading,
    error,
    refetch: fetchData,
  }
}

/**
 * Hook specifically for platform analytics
 */
export function usePlatformAnalytics(platform: PlatformType) {
  return useAnalyticsData({ platform })
}

/**
 * Hook for dashboard overview with auto-refresh
 */
export function useDashboardAnalytics(refreshInterval: number = 5 * 60 * 1000) {
  return useAnalyticsData({ refreshInterval })
}
