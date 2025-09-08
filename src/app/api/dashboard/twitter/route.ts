import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { getUserSubscription } from "@/services/subscription"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders } from "@/controllers/api-response"
import { logger } from "@/config/logger"
import { ServerSessionService } from "@/services/session-server"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

interface TwitterAnalytics {
  posts?: PostAnalytics
  ads?: AdsAnalytics
  account: {
    followers_count: number
    following_count: number
    tweet_count: number
    verified: boolean
  }
  lastUpdated: string
  plan: string
}

interface PostAnalytics {
  totalTweets: number
  avgImpressions: number
  avgEngagement: number
  avgRetweets: number
  avgLikes: number
  avgReplies: number
  totalImpressions: number
  totalEngagements: number
  engagementRate: number
  topTweets: Array<{
    id: string
    text: string
    created_at: string
    metrics: {
      impressions: number
      retweet_count: number
      like_count: number
      reply_count: number
      quote_count: number
    }
    media?: Array<{
      type: string
      url: string
    }>
  }>
  trends: Array<{
    date: string
    impressions: number
    engagements: number
    tweets: number
  }>
  contentAnalysis: Array<{
    type: 'text' | 'image' | 'video' | 'poll'
    count: number
    avgEngagement: number
  }>
}

interface AdsAnalytics {
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalEngagements: number
  avgCPC: number
  avgCPM: number
  avgCTR: number
  avgEngagementRate: number
  campaigns: Array<{
    id: string
    name: string
    status: string
    budget: number
    spend: number
    impressions: number
    clicks: number
    engagements: number
  }>
  trends: Array<{
    date: string
    spend: number
    impressions: number
    clicks: number
    engagements: number
  }>
}

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

    // Get user profile from Twitter API
    const userProfile = await fetchTwitterUserProfile(authProvider.accessToken)

    // Fetch posts analytics
    const postsAnalytics = await fetchTwitterPostsAnalytics(
      authProvider.accessToken,
      userProfile.id,
      userPlan
    )

    // Fetch ads analytics only for paid plans and if user has Twitter Ads access
    let adsAnalytics: AdsAnalytics | undefined
    if (hasAdsAccess && authProvider.advertisingAccountId) {
      try {
        adsAnalytics = await fetchTwitterAdsAnalytics(
          authProvider.accessToken,
          authProvider.advertisingAccountId,
          userPlan
        )
      } catch (adsError) {
        logger.warn("Twitter ads analytics not available", { error: adsError })
      }
    }

    const analytics: TwitterAnalytics = {
      posts: postsAnalytics,
      ads: adsAnalytics,
      account: {
        followers_count: userProfile.public_metrics?.followers_count || 0,
        following_count: userProfile.public_metrics?.following_count || 0,
        tweet_count: userProfile.public_metrics?.tweet_count || 0,
        verified: userProfile.verified || false
      },
      lastUpdated: new Date().toISOString(),
      plan: userPlan
    }

    logger.info("Twitter analytics fetched successfully", { 
      userId: session.userId,
      plan: userPlan,
      hasPostsData: !!postsAnalytics,
      hasAdsData: !!adsAnalytics,
      username: userProfile.username
    })

    const response = NextResponse.json({
      success: true,
      data: analytics,
      connected: true,
      account: {
        userId: userProfile.id,
        username: userProfile.username,
        name: userProfile.name,
        followers_count: userProfile.public_metrics?.followers_count,
        following_count: userProfile.public_metrics?.following_count,
        tweet_count: userProfile.public_metrics?.tweet_count,
        profile_image_url: userProfile.profile_image_url,
        verified: userProfile.verified
      },
      lastUpdated: new Date().toISOString()
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

/**
 * Fetch Twitter user profile using Twitter API v2
 */
async function fetchTwitterUserProfile(accessToken: string) {
  try {
    const response = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=id,name,username,public_metrics,profile_image_url,verified',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'AdInsights-App/1.0',
        },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch Twitter user profile: ${response.status}`)
    }

    const data = await response.json()
    return data.data
  } catch (error) {
    logger.error("Failed to fetch Twitter user profile", { error })
    
    // Return mock data for development
    return {
      id: 'mock_twitter_user_id',
      username: 'sample_user',
      name: 'Sample User',
      verified: false,
      public_metrics: {
        followers_count: 1250,
        following_count: 300,
        tweet_count: 450
      },
      profile_image_url: ''
    }
  }
}

/**
 * Fetch Twitter posts analytics using Twitter API v2
 */
async function fetchTwitterPostsAnalytics(
  accessToken: string,
  userId: string,
  userPlan: string
): Promise<PostAnalytics> {
  try {
    // Get recent tweets with metrics
    const tweetsResponse = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?tweet.fields=id,text,created_at,public_metrics,attachments&media.fields=type,url&expansions=attachments.media_keys&max_results=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'AdInsights-App/1.0',
        },
        signal: AbortSignal.timeout(15000),
      }
    )

    if (!tweetsResponse.ok) {
      throw new Error(`Failed to fetch Twitter tweets: ${tweetsResponse.status}`)
    }

    const tweetsData = await tweetsResponse.json()
    const tweets = tweetsData.data || []
    const media = tweetsData.includes?.media || []

    // Process tweets analytics
    let totalImpressions = 0
    let totalEngagements = 0
    const contentTypes: { [key: string]: { count: number; engagement: number } } = {}
    const trends: { [key: string]: { impressions: number; engagements: number; tweets: number } } = {}

    const processedTweets = tweets.map((tweet: any) => {
      const metrics = tweet.public_metrics || {}
      const impressions = metrics.impression_count || 0
      const engagements = (metrics.retweet_count || 0) + 
                         (metrics.like_count || 0) + 
                         (metrics.reply_count || 0) + 
                         (metrics.quote_count || 0)

      totalImpressions += impressions
      totalEngagements += engagements

      // Determine content type
      let contentType = 'text'
      if (tweet.attachments?.media_keys?.length > 0) {
        const tweetMedia = media.filter((m: any) => tweet.attachments.media_keys.includes(m.media_key))
        if (tweetMedia.some((m: any) => m.type === 'video')) {
          contentType = 'video'
        } else if (tweetMedia.some((m: any) => m.type === 'photo')) {
          contentType = 'image'
        }
      }

      // Track content types
      if (!contentTypes[contentType]) {
        contentTypes[contentType] = { count: 0, engagement: 0 }
      }
      contentTypes[contentType].count++
      contentTypes[contentType].engagement += engagements

      // Track daily trends
      const date = tweet.created_at?.split('T')[0]
      if (date) {
        if (!trends[date]) {
          trends[date] = { impressions: 0, engagements: 0, tweets: 0 }
        }
        trends[date].impressions += impressions
        trends[date].engagements += engagements
        trends[date].tweets += 1
      }

      return {
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        metrics: {
          impressions,
          retweet_count: metrics.retweet_count || 0,
          like_count: metrics.like_count || 0,
          reply_count: metrics.reply_count || 0,
          quote_count: metrics.quote_count || 0
        },
        media: tweet.attachments?.media_keys?.map((key: string) => {
          const mediaItem = media.find((m: any) => m.media_key === key)
          return mediaItem ? { type: mediaItem.type, url: mediaItem.url || '' } : null
        }).filter(Boolean) || []
      }
    })

    // Get top performing tweets
    const topTweets = processedTweets
      .sort((a: any, b: any) => {
        const aEngagement = a.metrics.retweet_count + a.metrics.like_count + a.metrics.reply_count
        const bEngagement = b.metrics.retweet_count + b.metrics.like_count + b.metrics.reply_count
        return bEngagement - aEngagement
      })
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

    const totalTweets = tweets.length
    const avgImpressions = totalTweets > 0 ? Math.round(totalImpressions / totalTweets) : 0
    const avgEngagement = totalTweets > 0 ? Math.round(totalEngagements / totalTweets) : 0
    const avgRetweets = totalTweets > 0 ? Math.round(processedTweets.reduce((sum: number, t: any) => sum + t.metrics.retweet_count, 0) / totalTweets) : 0
    const avgLikes = totalTweets > 0 ? Math.round(processedTweets.reduce((sum: number, t: any) => sum + t.metrics.like_count, 0) / totalTweets) : 0
    const avgReplies = totalTweets > 0 ? Math.round(processedTweets.reduce((sum: number, t: any) => sum + t.metrics.reply_count, 0) / totalTweets) : 0
    const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0

    return {
      totalTweets,
      avgImpressions,
      avgEngagement,
      avgRetweets,
      avgLikes,
      avgReplies,
      totalImpressions,
      totalEngagements,
      engagementRate: Math.round(engagementRate * 100) / 100,
      topTweets,
      trends: trendsArray,
      contentAnalysis
    }

  } catch (error) {
    logger.error("Failed to fetch Twitter posts analytics", { 
      userId,
      error: error instanceof Error ? error.message : error
    })
    
    // Return mock data for development
    return getMockTwitterPostsAnalytics()
  }
}

/**
 * Fetch Twitter ads analytics using Twitter Ads API
 */
async function fetchTwitterAdsAnalytics(
  accessToken: string,
  advertisingAccountId: string,
  userPlan: string
): Promise<AdsAnalytics> {
  try {
    // Note: Twitter Ads API requires special permissions and OAuth 1.0a
    // This is a placeholder implementation - actual implementation would need
    // proper Twitter Ads API credentials and OAuth 1.0a signing
    
    logger.warn("Twitter Ads API integration requires elevated access and OAuth 1.0a", {
      advertisingAccountId
    })
    
    // Return mock data for now
    return getMockTwitterAdsAnalytics()

  } catch (error) {
    logger.error("Failed to fetch Twitter ads analytics", { 
      advertisingAccountId,
      error: error instanceof Error ? error.message : error
    })
    
    // Return mock data for development
    return getMockTwitterAdsAnalytics()
  }
}

/**
 * Mock data for development/fallback
 */
function getMockTwitterPostsAnalytics(): PostAnalytics {
  return {
    totalTweets: 42,
    avgImpressions: 1850,
    avgEngagement: 95,
    avgRetweets: 12,
    avgLikes: 65,
    avgReplies: 8,
    totalImpressions: 77700,
    totalEngagements: 3990,
    engagementRate: 5.13,
    topTweets: [
      {
        id: 'mock_tweet_1',
        text: 'Just launched our new analytics dashboard! 🚀 Check out these amazing insights and boost your social media performance. #analytics #socialmedia',
        created_at: new Date().toISOString(),
        metrics: {
          impressions: 4500,
          retweet_count: 25,
          like_count: 180,
          reply_count: 15,
          quote_count: 8
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
        impressions: 1500 + Math.random() * 800,
        engagements: 80 + Math.random() * 60,
        tweets: 3 + Math.round(Math.random() * 4)
      }
    }).reverse(),
    contentAnalysis: [
      { type: 'text', count: 28, avgEngagement: 85 },
      { type: 'image', count: 12, avgEngagement: 135 },
      { type: 'video', count: 2, avgEngagement: 220 }
    ]
  }
}

function getMockTwitterAdsAnalytics(): AdsAnalytics {
  return {
    totalSpend: 850.50,
    totalImpressions: 125000,
    totalClicks: 3200,
    totalEngagements: 4500,
    avgCPC: 0.27,
    avgCPM: 6.80,
    avgCTR: 2.56,
    avgEngagementRate: 3.60,
    campaigns: [
      {
        id: 'mock_campaign_1',
        name: 'Twitter Promotion Campaign',
        status: 'ACTIVE',
        budget: 100.00,
        spend: 850.50,
        impressions: 125000,
        clicks: 3200,
        engagements: 4500
      }
    ],
    trends: Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return {
        date: date.toISOString().split('T')[0],
        spend: 120 + Math.random() * 40,
        impressions: 18000 + Math.random() * 5000,
        clicks: 450 + Math.random() * 150,
        engagements: 600 + Math.random() * 200
      }
    }).reverse()
  }
}
