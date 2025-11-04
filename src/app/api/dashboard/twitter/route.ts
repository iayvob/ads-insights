import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { getUserSubscription } from "@/services/subscription"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders } from "@/controllers/api-response"
import { logger } from "@/config/logger"
import { ServerSessionService } from "@/services/session-server"
import { TwitterApiClient } from "@/services/api-clients/twitter-client"
import { TwitterAnalytics, PostAnalytics, TwitterPostAnalytics, TwitterAdsAnalytics, AdsAnalytics } from "@/validations/analytics-types"
import { SubscriptionPlan } from "@prisma/client"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await ServerSessionService.getSession(request)

  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    // Get Twitter auth provider
    const activeProviders = await UserService.getActiveProviders(session.userId)
    const authProvider = activeProviders.find(p => p.provider === "twitter")

    if (!authProvider || !authProvider.accessToken) {
      return NextResponse.json({
        error: "Twitter not connected",
        connected: false
      }, { status: 404 })
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = authProvider.expiresAt ? new Date(authProvider.expiresAt) : now

    if (expiresAt <= now) {
      return NextResponse.json({
        error: "Twitter token expired. Please reconnect your account.",
        connected: false,
        requiresReconnect: true
      }, { status: 401 })
    }

    // Get user plan for subscription-aware analytics
    const user = await UserService.getUserById(session.userId)
    const userPlan = (user?.plan as SubscriptionPlan) || SubscriptionPlan.FREEMIUM

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

    // Fetch comprehensive Twitter analytics using enhanced API client
    const twitterData: TwitterAnalytics = await TwitterApiClient.fetchAnalytics(
      authProvider.accessToken,
      userPlan
    )

    logger.info("Twitter analytics fetched successfully", {
      userId: session.userId,
      plan: userPlan,
      hasPostsData: !!twitterData.posts,
      hasAdsData: !!twitterData.ads,
      username: twitterData.profile?.username,
      hasAdsAccess: hasAdsAccess,
      adsApiStatus: twitterData.ads ? "active" : hasAdsAccess ? "no_x_ads_api_access" : "freemium_plan"
    })

    const response = NextResponse.json({
      success: true,
      data: twitterData,
      connected: true,
      account: {
        userId: twitterData.profile?.id,
        username: twitterData.profile?.username,
        name: twitterData.profile?.username,
        followers_count: twitterData.profile?.followers_count,
        tweet_count: twitterData.profile?.tweet_count,
        profile_image_url: `https://unavatar.io/twitter/${twitterData.profile?.username}`,
        verified: false
      },
      lastUpdated: twitterData.lastUpdated,
      hasAdsAccess
    })

    return addSecurityHeaders(response)

  } catch (error) {
    logger.error("Twitter dashboard API error", {
      error: error instanceof Error ? error.message : error,
      userId: session.userId
    })

    return NextResponse.json(
      { error: "Failed to fetch Twitter analytics" },
      { status: 500 }
    )
  }
})
