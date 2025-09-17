import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { getUserSubscription } from "@/services/subscription"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders } from "@/controllers/api-response"
import { logger } from "@/config/logger"
import { z } from "zod"
import { ServerSessionService } from "@/services/session-server"
import { InstagramApiClient, InstagramEnhancedData } from "@/services/api-clients/instagram-client"
import { InstagramPostAnalytics, InstagramAdsAnalytics } from "@/validations/analytics-types"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

interface InstagramAnalytics {
  posts?: InstagramPostAnalytics
  ads?: InstagramAdsAnalytics
  account: {
    followers_count: number
    media_count: number
    account_type: string
    username: string
    biography: string
    website: string
    profile_picture_url: string
  }
  lastUpdated: string
  plan: string
}

const requestSchema = z.object({
  period: z.enum(["day", "week", "days_28"]).optional().default("week"),
  includePosts: z.boolean().optional().default(true),
  includeAds: z.boolean().optional().default(false), // Default false for freemium users
  includeMedia: z.boolean().optional().default(true),
  includeStories: z.boolean().optional().default(true),
  mediaLimit: z.number().min(1).max(50).optional().default(25),
  refreshCache: z.boolean().optional().default(false),
})

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await ServerSessionService.getSession(request)

  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    // Get Instagram auth provider
    const activeProviders = await UserService.getActiveProviders(session.userId)
    const authProvider = activeProviders.find(p => p.provider === "instagram")

    if (!authProvider || !authProvider.accessToken) {
      return NextResponse.json({
        error: "Instagram not connected",
        connected: false
      }, { status: 404 })
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = authProvider.expiresAt ? new Date(authProvider.expiresAt) : now

    if (expiresAt <= now) {
      return NextResponse.json({
        error: "Instagram token expired. Please reconnect your account.",
        connected: false,
        requiresReconnect: true
      }, { status: 401 })
    }

    // Get user plan for subscription-aware analytics
    const user = await UserService.getUserById(session.userId)
    const userPlan = user?.plan || 'freemium'

    // Check if user has ads access
    let hasAdsAccess = false
    try {
      const userSubscriptionResult = await getUserSubscription(session.userId)
      if (userSubscriptionResult.success && userSubscriptionResult.subscription) {
        const subscription = userSubscriptionResult.subscription
        hasAdsAccess = Boolean(subscription.planId &&
          subscription.planId !== "basic" &&
          subscription.status === "ACTIVE")
      }
    } catch (error) {
      logger.warn("Could not verify subscription status", { userId: session.userId, error })
    }

    // Fetch comprehensive Instagram analytics using new API client
    const instagramData: InstagramEnhancedData = await InstagramApiClient.fetchAnalytics(
      authProvider.accessToken,
      hasAdsAccess // Include ads analytics for premium users
    )

    const analytics: InstagramAnalytics = {
      posts: instagramData.posts,
      ads: instagramData.ads || undefined,
      account: {
        followers_count: instagramData.profile.followers_count,
        media_count: instagramData.profile.media_count,
        account_type: instagramData.profile.account_type,
        username: instagramData.profile.username,
        biography: instagramData.profile.biography,
        website: instagramData.profile.website,
        profile_picture_url: instagramData.profile.profile_picture_url
      },
      lastUpdated: instagramData.lastUpdated,
      plan: userPlan
    }

    logger.info("Instagram analytics fetched successfully", {
      userId: session.userId,
      plan: userPlan,
      hasPostsData: !!analytics.posts,
      hasAdsData: !!analytics.ads,
      totalPosts: analytics.posts?.totalPosts || 0,
      totalEngagements: analytics.posts?.totalEngagements || 0,
      totalSaves: analytics.posts?.totalSaves || 0
    })

    const response = NextResponse.json({
      success: true,
      data: analytics,
      connected: true,
      account: {
        userId: instagramData.profile.id,
        username: instagramData.profile.username,
        name: instagramData.profile.username,
        followers_count: instagramData.profile.followers_count,
        media_count: instagramData.profile.media_count,
        profile_picture_url: instagramData.profile.profile_picture_url,
        account_type: instagramData.profile.account_type,
        biography: instagramData.profile.biography,
        website: instagramData.profile.website
      },
      lastUpdated: instagramData.lastUpdated
    })

    return addSecurityHeaders(response)

  } catch (error) {
    logger.error("Instagram dashboard API error", {
      error: error instanceof Error ? error.message : error,
      userId: session.userId
    })

    return NextResponse.json(
      { error: "Failed to fetch Instagram analytics" },
      { status: 500 }
    )
  }
})
