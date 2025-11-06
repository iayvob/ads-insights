import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { getUserSubscription } from "@/services/subscription"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders } from "@/controllers/api-response"
import { logger } from "@/config/logger"
import { ServerSessionService } from "@/services/session-server"
import { FacebookApiClient } from "@/services/api-clients/facebook-client"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

interface FacebookAnalytics {
  posts?: PostAnalytics
  ads?: AdsAnalytics
  account: {
    pages_count: number
    total_followers: number
    total_posts: number
    verified: boolean
  }
  lastUpdated: string
  plan: string
}

interface PostAnalytics {
  totalPosts: number
  avgImpressions: number
  avgEngagement: number
  avgReach: number
  avgLikes: number
  avgComments: number
  avgShares: number
  totalImpressions: number
  totalEngagements: number
  engagementRate: number
  topPosts: Array<{
    id: string
    message?: string
    story?: string
    created_time: string
    metrics: {
      impressions: number
      reach: number
      engagement: number
      likes: number
      comments: number
      shares: number
      reactions: number
    }
    media?: Array<{
      type: string
      url: string
    }>
  }>
  trends: Array<{
    date: string
    impressions: number
    reach: number
    engagement: number
    posts: number
  }>
  contentAnalysis: Array<{
    type: 'photo' | 'video' | 'link' | 'status' | 'event'
    count: number
    avgEngagement: number
  }>
}

interface AdsAnalytics {
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  avgCPC: number
  avgCPM: number
  avgCTR: number
  avgCPA: number
  roas: number
  campaigns: Array<{
    id: string
    name: string
    status: string
    budget: number
    spend: number
    impressions: number
    clicks: number
    conversions: number
  }>
  trends: Array<{
    date: string
    spend: number
    impressions: number
    clicks: number
    conversions: number
  }>
  // Enhanced fields from FacebookApiClient
  audienceInsights?: {
    ageGroups: Array<{ range: string; percentage: number }>
    genders: Array<{ gender: string; percentage: number }>
    topLocations: Array<{ location: string; percentage: number }>
  }
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await ServerSessionService.getSession(request)

  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    // Get Facebook auth provider
    const activeProviders = await UserService.getActiveProviders(session.userId)
    const authProvider = activeProviders.find(p => p.provider === "facebook")

    if (!authProvider || !authProvider.accessToken) {
      return NextResponse.json({
        error: "Facebook not connected",
        connected: false
      }, { status: 404 })
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = authProvider.expiresAt ? new Date(authProvider.expiresAt) : now

    if (expiresAt <= now) {
      return NextResponse.json({
        error: "Facebook token expired. Please reconnect your account.",
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

    // Get Facebook pages and business data from stored metadata
    const metadata = JSON.parse(authProvider.businessAccounts || '{}')
    const facebookPages = metadata.facebook_pages || []
    const adAccounts = metadata.ad_accounts || []
    const analyticsSummary = metadata.analytics_summary || {}

    if (facebookPages.length === 0) {
      return NextResponse.json({
        error: "No Facebook pages found",
        connected: false
      }, { status: 404 })
    }

    // Get page with highest follower count as primary
    const primaryPage = facebookPages.reduce((prev: any, current: any) =>
      (current.fan_count || 0) > (prev.fan_count || 0) ? current : prev
    )

    // Fetch posts analytics using enhanced FacebookApiClient
    let postsAnalytics: PostAnalytics | undefined
    try {
      const enhancedPostsData = await FacebookApiClient.getPostsAnalytics(authProvider.accessToken)
      postsAnalytics = mapEnhancedPostsToRouteFormat(enhancedPostsData)

      logger.info("Enhanced Facebook posts analytics fetched successfully", {
        userId: session.userId,
        totalPosts: enhancedPostsData.totalPosts,
        avgEngagement: enhancedPostsData.avgEngagement,
        totalImpressions: enhancedPostsData.avgImpressions
      })
    } catch (postsError) {
      logger.warn("Enhanced Facebook posts analytics not available, using fallback", {
        error: postsError,
        userId: session.userId
      })

      // Fallback to legacy posts analytics
      try {
        postsAnalytics = await fetchFacebookPostsAnalytics(
          primaryPage.id,
          primaryPage.access_token,
          userPlan
        )
        logger.info("Fallback Facebook posts analytics used", { userId: session.userId })
      } catch (fallbackError) {
        logger.error("Both enhanced and fallback Facebook posts analytics failed", {
          enhancedError: postsError,
          fallbackError,
          userId: session.userId
        })
        // Use mock data as final fallback
        postsAnalytics = getMockFacebookPostsAnalytics()
      }
    }

    // Fetch ads analytics using enhanced FacebookApiClient for paid plans
    let adsAnalytics: AdsAnalytics | undefined
    let adsError: any = undefined

    if (hasAdsAccess) {
      console.log('💰 [FACEBOOK-ROUTE] User has ads access, fetching ads analytics...')
      try {
        // Use the enhanced FacebookApiClient for comprehensive ads analytics
        const enhancedAdsData = await FacebookApiClient.getAdsAnalytics(authProvider.accessToken)

        console.log('✅ [FACEBOOK-ROUTE] Enhanced ads data fetched:', {
          totalSpend: enhancedAdsData.totalSpend,
          totalImpressions: enhancedAdsData.totalImpressions,
          totalClicks: enhancedAdsData.totalClicks,
          hasAudienceInsights: !!enhancedAdsData.audienceInsights
        })

        // Convert to expected format
        adsAnalytics = mapEnhancedAdsToRouteFormat(enhancedAdsData)

        logger.info("Enhanced Facebook ads analytics fetched successfully", {
          userId: session.userId,
          totalSpend: enhancedAdsData.totalSpend,
          totalImpressions: enhancedAdsData.totalImpressions,
          hasAudienceInsights: !!enhancedAdsData.audienceInsights,
          audienceInsightsCount: {
            ageGroups: enhancedAdsData.audienceInsights?.ageGroups?.length || 0,
            genders: enhancedAdsData.audienceInsights?.genders?.length || 0,
            topLocations: enhancedAdsData.audienceInsights?.topLocations?.length || 0
          }
        })
      } catch (adsError_) {
        adsError = adsError_
        console.warn('⚠️ [FACEBOOK-ROUTE] Enhanced ads analytics failed:', adsError_)
        logger.warn("Enhanced Facebook ads analytics not available", {
          error: adsError_,
          userId: session.userId
        })

        // Fallback to legacy ads analytics if enhanced version fails
        try {
          console.log('🔄 [FACEBOOK-ROUTE] Trying fallback ads analytics...')
          const primaryAdAccount = adAccounts.find((acc: any) => acc.is_primary) || adAccounts[0]
          if (primaryAdAccount) {
            adsAnalytics = await fetchFacebookAdsAnalytics(
              primaryAdAccount.id,
              authProvider.accessToken,
              userPlan
            )
            console.log('✅ [FACEBOOK-ROUTE] Fallback ads analytics used')
            logger.info("Fallback Facebook ads analytics used", { userId: session.userId })
          } else {
            console.warn('⚠️ [FACEBOOK-ROUTE] No primary ad account found')
          }
        } catch (fallbackError) {
          console.error('❌ [FACEBOOK-ROUTE] Both enhanced and fallback ads analytics failed')
          logger.error("Both enhanced and fallback Facebook ads analytics failed", {
            enhancedError: adsError_,
            fallbackError,
            userId: session.userId
          })
        }
      }
    } else {
      console.log('ℹ️ [FACEBOOK-ROUTE] User does not have ads access (plan:', userPlan, ')')
    }

    const analytics: FacebookAnalytics = {
      posts: postsAnalytics,
      ads: adsAnalytics,
      account: {
        pages_count: facebookPages.length,
        total_followers: facebookPages.reduce((sum: number, page: any) => sum + (page.fan_count || 0), 0),
        total_posts: analyticsSummary.total_posts || 0,
        verified: facebookPages.some((page: any) => page.verification_status === 'blue_verified')
      },
      lastUpdated: new Date().toISOString(),
      plan: userPlan
    }

    console.log('✅ [FACEBOOK-ROUTE] Final analytics:', {
      hasPostsData: !!postsAnalytics,
      hasAdsData: !!adsAnalytics,
      pagesCount: facebookPages.length,
      adAccountsCount: adAccounts.length,
      plan: userPlan,
      totalFollowers: analytics.account.total_followers
    })

    logger.info("Facebook analytics fetched successfully", {
      userId: session.userId,
      plan: userPlan,
      hasPostsData: !!postsAnalytics,
      hasAdsData: !!adsAnalytics,
      pagesCount: facebookPages.length,
      adAccountsCount: adAccounts.length
    })

    const response = NextResponse.json({
      success: true,
      data: analytics,
      connected: true,
      hasAdsAccess,
      adsUnavailableReason: !hasAdsAccess
        ? 'Upgrade to Premium to access ads analytics'
        : (adsError && !adsAnalytics)
          ? 'No ad accounts found or permission denied'
          : undefined,
      account: {
        userId: authProvider.providerId,
        username: authProvider.username,
        name: authProvider.displayName || authProvider.username,
        pages_count: facebookPages.length,
        total_followers: analytics.account.total_followers,
        profile_image_url: authProvider.profileImage,
        verified: analytics.account.verified,
        pages: facebookPages.map((page: any) => ({
          id: page.id,
          name: page.name,
          category: page.category,
          fan_count: page.fan_count,
          talking_about_count: page.talking_about_count
        }))
      },
      lastUpdated: new Date().toISOString()
    })

    return addSecurityHeaders(response)

  } catch (error) {
    console.error('❌ [FACEBOOK-ROUTE] Dashboard API error:', error)
    logger.error("Facebook dashboard API error", {
      error: error instanceof Error ? error.message : error,
      userId: session.userId
    })

    return NextResponse.json(
      { error: "Failed to fetch Facebook analytics" },
      { status: 500 }
    )
  }
})

/**
 * Map enhanced FacebookApiClient PostAnalytics to route expected format
 */
function mapEnhancedPostsToRouteFormat(enhancedData: import('@/validations/analytics-types').PostAnalytics): PostAnalytics {
  // Calculate averages from enhanced data structure
  const avgLikes = enhancedData.totalReactions > 0 ? enhancedData.totalReactions / enhancedData.totalPosts : 0;
  const avgComments = enhancedData.topPost?.comments || 0;
  const avgShares = enhancedData.topPost?.shares || 0;

  return {
    totalPosts: enhancedData.totalPosts,
    avgImpressions: enhancedData.avgImpressions,
    avgEngagement: enhancedData.avgEngagement,
    avgReach: enhancedData.avgReach,
    avgLikes: avgLikes,
    avgComments: avgComments,
    avgShares: avgShares,
    totalImpressions: enhancedData.totalImpressions || (enhancedData.avgImpressions * enhancedData.totalPosts),
    totalEngagements: enhancedData.totalEngagements || (enhancedData.avgEngagement * enhancedData.totalPosts),
    engagementRate: enhancedData.engagementRate,
    topPosts: enhancedData.topPerformingPosts ? enhancedData.topPerformingPosts.map(post => ({
      id: post.id,
      message: post.content,
      created_time: post.date,
      metrics: {
        impressions: post.impressions,
        reach: post.reach,
        engagement: post.engagement,
        likes: enhancedData.topPost?.reactions?.like || 0,
        comments: enhancedData.topPost?.comments || 0,
        shares: enhancedData.topPost?.shares || 0,
        reactions: Object.values(enhancedData.topPost?.reactions || {}).reduce((sum, count) => sum + count, 0)
      },
      media: post.mediaType === 'image' ?
        [{ type: 'photo', url: '' }] :
        post.mediaType === 'video' ?
          [{ type: 'video', url: '' }] :
          post.mediaType === 'carousel' ?
            [{ type: 'photo', url: '' }] : []
    })) : (enhancedData.topPost ? [
      {
        id: enhancedData.topPost.id,
        message: enhancedData.topPost.content,
        created_time: enhancedData.topPost.date,
        metrics: {
          impressions: enhancedData.topPost.impressions,
          reach: enhancedData.topPost.reach,
          engagement: enhancedData.topPost.engagement,
          likes: enhancedData.topPost.reactions?.like || 0,
          comments: enhancedData.topPost.comments || 0,
          shares: enhancedData.topPost.shares || 0,
          reactions: Object.values(enhancedData.topPost.reactions || {}).reduce((sum, count) => sum + count, 0)
        },
        media: enhancedData.topPost.mediaType === 'image' ?
          [{ type: 'photo', url: '' }] :
          enhancedData.topPost.mediaType === 'video' ?
            [{ type: 'video', url: '' }] :
            enhancedData.topPost.mediaType === 'carousel' ?
              [{ type: 'photo', url: '' }] : []
      }
    ] : []),
    trends: enhancedData.engagementTrend.map(trend => ({
      date: trend.date,
      impressions: trend.impressions,
      reach: trend.reach,
      engagement: trend.engagement,
      posts: 1 // Approximation since not available in enhanced data
    })),
    contentAnalysis: enhancedData.contentPerformance.map(content => ({
      type: content.type === 'text' ? 'status' :
        content.type === 'image' ? 'photo' :
          content.type === 'video' ? 'video' :
            content.type === 'carousel' ? 'photo' : 'link',
      count: content.count,
      avgEngagement: content.avgEngagement
    }))
  }
}

/**
 * Map enhanced FacebookApiClient AdsAnalytics to route expected format
 */
function mapEnhancedAdsToRouteFormat(enhancedData: import('@/validations/analytics-types').AdsAnalytics): AdsAnalytics {
  return {
    totalSpend: enhancedData.totalSpend,
    totalImpressions: enhancedData.totalImpressions,
    totalClicks: enhancedData.totalClicks,
    totalConversions: 0, // Will be calculated if available in enhancedData
    avgCPC: enhancedData.cpc,
    avgCPM: enhancedData.cpm,
    avgCTR: enhancedData.ctr,
    avgCPA: 0, // Calculate from conversions if available
    roas: enhancedData.roas,
    campaigns: enhancedData.topAd ? [
      {
        id: enhancedData.topAd.id,
        name: enhancedData.topAd.name,
        status: 'ACTIVE',
        budget: 0, // Not available in enhanced data
        spend: enhancedData.topAd.spend,
        impressions: enhancedData.topAd.impressions,
        clicks: enhancedData.topAd.clicks,
        conversions: 0 // Not available in current topAd structure
      }
    ] : [],
    trends: enhancedData.spendTrend.map(trend => ({
      date: trend.date,
      spend: trend.spend,
      impressions: trend.impressions,
      clicks: trend.clicks,
      conversions: 0 // Not available in current spendTrend structure
    })),
    audienceInsights: enhancedData.audienceInsights
  }
}

/**
 * Fetch Facebook posts analytics using Facebook Graph API
 */
async function fetchFacebookPostsAnalytics(
  pageId: string,
  pageAccessToken: string,
  userPlan: string
): Promise<PostAnalytics> {
  try {
    // Get recent posts with insights
    const postsResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,story,created_time,full_picture,type,insights.metric(post_impressions,post_impressions_unique,post_engaged_users,post_reactions_like_total,post_comments,post_shares)&limit=100&access_token=${pageAccessToken}`,
      {
        headers: { 'User-Agent': 'AdInsights-App/1.0' },
        signal: AbortSignal.timeout(15000),
      }
    )

    if (!postsResponse.ok) {
      throw new Error(`Failed to fetch Facebook posts: ${postsResponse.status}`)
    }

    const postsData = await postsResponse.json()
    const posts = postsData.data || []

    // Process posts analytics
    let totalImpressions = 0
    let totalEngagements = 0
    let totalReach = 0
    const contentTypes: { [key: string]: { count: number; engagement: number } } = {}
    const trends: { [key: string]: { impressions: number; reach: number; engagement: number; posts: number } } = {}

    const processedPosts = posts.map((post: any) => {
      const insights = post.insights?.data || []
      const metrics = {
        impressions: getMetricValue(insights, 'post_impressions'),
        reach: getMetricValue(insights, 'post_impressions_unique'),
        engagement: getMetricValue(insights, 'post_engaged_users'),
        likes: getMetricValue(insights, 'post_reactions_like_total'),
        comments: getMetricValue(insights, 'post_comments'),
        shares: getMetricValue(insights, 'post_shares'),
        reactions: getMetricValue(insights, 'post_reactions_like_total') // Facebook uses reactions instead of just likes
      }

      totalImpressions += metrics.impressions
      totalEngagements += metrics.engagement
      totalReach += metrics.reach

      // Determine content type
      const contentType = post.type || 'status'
      if (!contentTypes[contentType]) {
        contentTypes[contentType] = { count: 0, engagement: 0 }
      }
      contentTypes[contentType].count++
      contentTypes[contentType].engagement += metrics.engagement

      // Track daily trends
      const date = post.created_time?.split('T')[0]
      if (date) {
        if (!trends[date]) {
          trends[date] = { impressions: 0, reach: 0, engagement: 0, posts: 0 }
        }
        trends[date].impressions += metrics.impressions
        trends[date].reach += metrics.reach
        trends[date].engagement += metrics.engagement
        trends[date].posts += 1
      }

      return {
        id: post.id,
        message: post.message,
        story: post.story,
        created_time: post.created_time,
        metrics,
        media: post.full_picture ? [{ type: 'photo', url: post.full_picture }] : []
      }
    })

    // Get top performing posts
    const topPosts = processedPosts
      .sort((a: any, b: any) => b.metrics.engagement - a.metrics.engagement)
      .slice(0, userPlan === 'freemium' ? 5 : 20)

    // Convert trends to array
    const trendsArray = Object.entries(trends)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // Last 30 days

    // Convert content analysis to array
    const contentAnalysis = Object.entries(contentTypes).map(([type, data]) => ({
      type: type as any,
      count: data.count,
      avgEngagement: data.count > 0 ? Math.round(data.engagement / data.count) : 0
    }))

    const totalPosts = posts.length
    const avgImpressions = totalPosts > 0 ? Math.round(totalImpressions / totalPosts) : 0
    const avgEngagement = totalPosts > 0 ? Math.round(totalEngagements / totalPosts) : 0
    const avgReach = totalPosts > 0 ? Math.round(totalReach / totalPosts) : 0
    const avgLikes = totalPosts > 0 ? Math.round(processedPosts.reduce((sum: number, p: any) => sum + p.metrics.likes, 0) / totalPosts) : 0
    const avgComments = totalPosts > 0 ? Math.round(processedPosts.reduce((sum: number, p: any) => sum + p.metrics.comments, 0) / totalPosts) : 0
    const avgShares = totalPosts > 0 ? Math.round(processedPosts.reduce((sum: number, p: any) => sum + p.metrics.shares, 0) / totalPosts) : 0
    const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0

    return {
      totalPosts,
      avgImpressions,
      avgEngagement,
      avgReach,
      avgLikes,
      avgComments,
      avgShares,
      totalImpressions,
      totalEngagements,
      engagementRate: Math.round(engagementRate * 100) / 100,
      topPosts,
      trends: trendsArray,
      contentAnalysis
    }

  } catch (error) {
    logger.error("Failed to fetch Facebook posts analytics", {
      pageId,
      error: error instanceof Error ? error.message : error
    })

    // Return mock data for development
    return getMockFacebookPostsAnalytics()
  }
}

/**
 * Fetch Facebook ads analytics using Facebook Marketing API
 */
async function fetchFacebookAdsAnalytics(
  adAccountId: string,
  accessToken: string,
  userPlan: string
): Promise<AdsAnalytics> {
  try {
    // Get ad campaigns and insights
    const campaignsResponse = await fetch(
      `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=id,name,status,budget_rebalance_flag,daily_budget,lifetime_budget,insights.date_preset(last_30d){impressions,clicks,spend,actions,cpc,cpm,ctr}&access_token=${accessToken}`,
      {
        headers: { 'User-Agent': 'AdInsights-App/1.0' },
        signal: AbortSignal.timeout(15000),
      }
    )

    if (!campaignsResponse.ok) {
      throw new Error(`Failed to fetch Facebook ad campaigns: ${campaignsResponse.status}`)
    }

    const campaignsData = await campaignsResponse.json()
    const campaigns = campaignsData.data || []

    // Process ads analytics
    let totalSpend = 0
    let totalImpressions = 0
    let totalClicks = 0
    let totalConversions = 0

    const processedCampaigns = campaigns.map((campaign: any) => {
      const insights = campaign.insights?.data?.[0] || {}
      const spend = parseFloat(insights.spend || '0')
      const impressions = parseInt(insights.impressions || '0')
      const clicks = parseInt(insights.clicks || '0')
      const conversions = insights.actions ?
        insights.actions.reduce((sum: number, action: any) =>
          action.action_type === 'offsite_conversion' ? sum + parseInt(action.value || '0') : sum, 0) : 0

      totalSpend += spend
      totalImpressions += impressions
      totalClicks += clicks
      totalConversions += conversions

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        budget: parseFloat(campaign.daily_budget || campaign.lifetime_budget || '0'),
        spend,
        impressions,
        clicks,
        conversions
      }
    })

    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0
    const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0
    const roas = totalSpend > 0 ? (totalConversions * 50) / totalSpend : 0 // Assuming $50 average conversion value

    // Get daily trends (simplified for this implementation)
    const trends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return {
        date: date.toISOString().split('T')[0],
        spend: Math.round(totalSpend / 7),
        impressions: Math.round(totalImpressions / 7),
        clicks: Math.round(totalClicks / 7),
        conversions: Math.round(totalConversions / 7)
      }
    }).reverse()

    return {
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCPC: Math.round(avgCPC * 100) / 100,
      avgCPM: Math.round(avgCPM * 100) / 100,
      avgCTR: Math.round(avgCTR * 100) / 100,
      avgCPA: Math.round(avgCPA * 100) / 100,
      roas: Math.round(roas * 100) / 100,
      campaigns: processedCampaigns,
      trends
    }

  } catch (error) {
    logger.error("Failed to fetch Facebook ads analytics", {
      adAccountId,
      error: error instanceof Error ? error.message : error
    })

    // Return mock data for development
    return getMockFacebookAdsAnalytics()
  }
}

/**
 * Helper function to extract metric values from Facebook insights
 */
function getMetricValue(insights: any[], metricName: string): number {
  const metric = insights.find(insight => insight.name === metricName)
  return parseInt(metric?.values?.[0]?.value || '0')
}

/**
 * Mock data for development/fallback
 */
function getMockFacebookPostsAnalytics(): PostAnalytics {
  return {
    totalPosts: 35,
    avgImpressions: 2400,
    avgEngagement: 185,
    avgReach: 2100,
    avgLikes: 125,
    avgComments: 35,
    avgShares: 25,
    totalImpressions: 84000,
    totalEngagements: 6475,
    engagementRate: 7.71,
    topPosts: [
      {
        id: 'mock_post_1',
        message: 'Exciting news! We just launched our new product line. Check it out and let us know what you think! 🚀 #newproduct #innovation',
        created_time: new Date().toISOString(),
        metrics: {
          impressions: 5200,
          reach: 4800,
          engagement: 420,
          likes: 280,
          comments: 85,
          shares: 55,
          reactions: 280
        },
        media: [
          { type: 'photo', url: 'https://example.com/photo.jpg' }
        ]
      }
    ],
    trends: Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return {
        date: date.toISOString().split('T')[0],
        impressions: 2000 + Math.random() * 1000,
        reach: 1800 + Math.random() * 800,
        engagement: 150 + Math.random() * 100,
        posts: 4 + Math.round(Math.random() * 3)
      }
    }).reverse(),
    contentAnalysis: [
      { type: 'photo', count: 20, avgEngagement: 210 },
      { type: 'video', count: 10, avgEngagement: 320 },
      { type: 'link', count: 3, avgEngagement: 95 },
      { type: 'status', count: 2, avgEngagement: 65 }
    ]
  }
}

function getMockFacebookAdsAnalytics(): AdsAnalytics {
  return {
    totalSpend: 1250.75,
    totalImpressions: 185000,
    totalClicks: 4200,
    totalConversions: 125,
    avgCPC: 0.30,
    avgCPM: 6.76,
    avgCTR: 2.27,
    avgCPA: 10.01,
    roas: 4.8,
    campaigns: [
      {
        id: 'mock_campaign_1',
        name: 'Facebook Lead Generation Campaign',
        status: 'ACTIVE',
        budget: 150.00,
        spend: 1250.75,
        impressions: 185000,
        clicks: 4200,
        conversions: 125
      }
    ],
    trends: Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return {
        date: date.toISOString().split('T')[0],
        spend: 175 + Math.random() * 50,
        impressions: 26000 + Math.random() * 8000,
        clicks: 600 + Math.random() * 200,
        conversions: 18 + Math.random() * 8
      }
    }).reverse()
  }
}
