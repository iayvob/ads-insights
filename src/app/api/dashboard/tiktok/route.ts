import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { TikTokApiClient } from "@/services/api-clients/tiktok-client"
import { UserService } from "@/services/user"
import { logger } from "@/config/logger"

/**
 * GET /api/dashboard/tiktok
 * Fetch TikTok dashboard data including posts and ads analytics
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get TikTok connection
    const activeProviders = await UserService.getActiveProviders(session.userId)
    const tiktokProvider = activeProviders.find(p => p.provider === 'tiktok')

    if (!tiktokProvider) {
      return NextResponse.json({
        success: false,
        error: "TikTok account not connected",
        data: null
      })
    }

    // Check token expiry
    if (UserService.isTokenExpired(tiktokProvider)) {
      return NextResponse.json({
        success: false,
        error: "TikTok token expired",
        data: null
      })
    }

    // Fetch TikTok data
    if (!tiktokProvider.accessToken) {
      return NextResponse.json({
        success: false,
        error: "TikTok access token missing",
        data: null
      }, { status: 400 })
    }
    const tiktokData = await TikTokApiClient.fetchData(tiktokProvider.accessToken)

    // For premium users, also fetch ads data
    let adsData = null
    const userPlan = await getUserPlan(session.userId)
    // Try known advertiser id fields; cast to any to avoid strict typing issues and fall back to providerId
    const advertiserId = (tiktokProvider as any)?.advertiser_id ?? (tiktokProvider as any)?.advertiserId ?? tiktokProvider.providerId
    if (userPlan === 'premium' && advertiserId) {
      try {
        adsData = await TikTokApiClient.fetchAdsData(
          tiktokProvider.accessToken,
          advertiserId
        )
      } catch (error) {
        logger.warn("Failed to fetch TikTok ads data", { error, userId: session.userId })
        // Continue without ads data
      }
    }

    // Combine data
    const completeData = {
      ...tiktokData,
      ads_insights: adsData
    }

    logger.info("TikTok dashboard data fetched successfully", {
      userId: session.userId,
      videosCount: tiktokData.videos.length,
      photosCount: tiktokData.photos.length,
      hasAdsData: !!adsData
    })

    return NextResponse.json({
      success: true,
      data: completeData
    })

  } catch (error) {
    logger.error("Failed to fetch TikTok dashboard data", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json({
      success: false,
      error: "Failed to fetch TikTok data",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/dashboard/tiktok
 * Refresh TikTok dashboard data
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Rate limiting for refresh requests
    const lastRefresh = await getLastRefreshTime(session.userId, 'tiktok')
    const now = Date.now()
    const minInterval = 5 * 60 * 1000 // 5 minutes minimum between refreshes

    if (lastRefresh && (now - lastRefresh) < minInterval) {
      const waitTime = Math.ceil((minInterval - (now - lastRefresh)) / 1000)
      return NextResponse.json({
        success: false,
        error: `Please wait ${waitTime} seconds before refreshing TikTok data again`
      }, { status: 429 })
    }

    // Force refresh by calling GET endpoint
    const refreshedData = await GET(request)
    
    // Update last refresh time
    await updateLastRefreshTime(session.userId, 'tiktok', now)

    return refreshedData

  } catch (error) {
    logger.error("Failed to refresh TikTok dashboard data", { error })

    return NextResponse.json({
      success: false,
      error: "Failed to refresh TikTok data"
    }, { status: 500 })
  }
}

// Helper functions
async function getUserPlan(userId: string): Promise<'free' | 'premium'> {
  try {
    // This would check user's subscription plan from database
    // For now, return based on mock logic
    const user = await UserService.getUserById(userId)
    return user?.plan === 'PREMIUM_MONTHLY' || user?.plan === 'PREMIUM_YEARLY' 
      ? 'premium' 
      : 'free'
  } catch (error) {
    logger.warn("Failed to get user plan, defaulting to free", { error, userId })
    return 'free'
  }
}

async function getLastRefreshTime(userId: string, platform: string): Promise<number | null> {
  try {
    // This would fetch from cache/database
    // For now, return null to allow refresh
    return null
  } catch (error) {
    logger.warn("Failed to get last refresh time", { error, userId, platform })
    return null
  }
}

async function updateLastRefreshTime(userId: string, platform: string, timestamp: number): Promise<void> {
  try {
    // This would update cache/database
    logger.info("TikTok refresh time updated", { userId, platform, timestamp })
  } catch (error) {
    logger.warn("Failed to update refresh time", { error, userId, platform })
  }
}
