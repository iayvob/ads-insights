import { NextRequest, NextResponse } from "next/server"
import { AnalyticsDashboardService } from "@/services/analytics-dashboard"
import { logger } from "@/config/logger"
import { ServerSessionService } from "@/services/session-server"

// Request deduplication: prevent concurrent identical requests
// This prevents React Strict Mode and rapid re-renders from hammering the API
const pendingRequests = new Map<string, Promise<any>>()

export async function GET(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)

    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') as 'facebook' | 'instagram' | 'twitter' | null

    // Create deduplication key based on userId and platform
    const dedupKey = `${session.userId}:${platform || 'dashboard'}`

    // Check if identical request is already in progress
    if (pendingRequests.has(dedupKey)) {
      logger.info("🔄 Deduplicating concurrent analytics request", {
        userId: session.userId,
        platform: platform || 'dashboard',
        dedupKey
      })
      // Return the existing promise instead of making a new request
      const result = await pendingRequests.get(dedupKey)!
      return NextResponse.json(result)
    }

    // Debug logging
    logger.info("Analytics API called", {
      userId: session.userId,
      platform: platform || 'dashboard',
      hasInstagramSession: !!session?.connectedPlatforms?.instagram
    })

    // Create promise for this request and store it for deduplication
    const requestPromise = (async () => {
      if (platform) {
        // Get specific platform analytics
        const platformAnalytics = await AnalyticsDashboardService.getPlatformAnalytics(
          session.userId,
          platform
        )

        // 🔍 DEBUG: Log platform analytics being sent
        logger.info(`📤 Sending ${platform} analytics to frontend`, {
          userId: session.userId,
          platform,
          hasData: !!platformAnalytics,
          dataKeys: platformAnalytics ? Object.keys(platformAnalytics) : [],
          profileData: platform === 'twitter' ? (platformAnalytics as any)?.profile : undefined,
          postsData: platform === 'twitter' ? (platformAnalytics as any)?.posts : undefined,
          adsData: platform === 'twitter' ? (platformAnalytics as any)?.ads : undefined,
        })

        return {
          platform,
          analytics: platformAnalytics,
          timestamp: new Date().toISOString()
        }
      } else {
        // Get full dashboard analytics
        const dashboardData = await AnalyticsDashboardService.getAnalyticsDashboardData(session.userId)

        // 🔍 DEBUG: Log dashboard data being sent
        logger.info('📤 Sending dashboard analytics to frontend', {
          userId: session.userId,
          overview: dashboardData.overview,
          connectedPlatforms: dashboardData.connectedPlatforms,
          hasTwitter: !!dashboardData.twitter,
          twitterProfile: dashboardData.twitter?.profile,
          twitterPosts: dashboardData.twitter?.posts,
          hasErrors: !!Object.keys(dashboardData.errors || {}).length,
          errors: dashboardData.errors,
        })

        return dashboardData
      }
    })()

    // Store the promise for deduplication
    pendingRequests.set(dedupKey, requestPromise)

    // Execute the request
    const result = await requestPromise

    // Clean up after request completes
    pendingRequests.delete(dedupKey)

    return NextResponse.json(result)

  } catch (error: any) {
    // Clean up pending request on error
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') as 'facebook' | 'instagram' | 'twitter' | null
    const session = await ServerSessionService.getSession(request).catch(() => null)
    if (session?.userId) {
      const dedupKey = `${session.userId}:${platform || 'dashboard'}`
      pendingRequests.delete(dedupKey)
    }
    logger.error("Analytics dashboard API error", {
      error: error.message,
      stack: error.stack,
      type: error.type,
      status: error.status
    })

    if (error.message.includes("not connected")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    if (error.message.includes("token expired") || error.type === 'auth_error') {
      return NextResponse.json(
        { error: error.message || "Authentication token expired. Please reconnect your account." },
        { status: 401 }
      )
    }

    if (error.type === 'rate_limit') {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          details: {
            type: 'rate_limit',
            retryAfter: error.details?.retryAfter,
            resetTime: error.details?.resetTime
          }
        },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    )
  }
}
