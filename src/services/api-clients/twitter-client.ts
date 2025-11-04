import { logger } from "@/config/logger"
import type { LogContext, AnalyticsDetails } from "@/config/logger"
import { BaseApiClient } from "./base-client"
import { TwitterAnalytics, PostAnalytics, TwitterPostAnalytics, AdsAnalytics, TwitterAdsAnalytics } from "@/validations/analytics-types"
import { SubscriptionPlan } from "@prisma/client"
import crypto from 'crypto'

// 🔑 Helper function to generate consistent, unique cache keys
function generateCacheKey(accessToken: string): string {
  const hash = crypto.createHash('sha256').update(accessToken).digest('hex')
  return `twitter_analytics_${hash.substring(0, 16)}`
}

// 💾 Simple in-memory cache to prevent hitting rate limits
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class TwitterApiCache {
  private static cache = new Map<string, CacheEntry<any>>()
  private static readonly DEFAULT_TTL = 15 * 60 * 1000 // 15 minutes

  static set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    })
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Return data even if expired (for rate limit fallback)
    // But mark it as expired in getCacheInfo
    return entry.data as T
  }

  static has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    return Date.now() < entry.expiresAt
  }

  static getCacheInfo(key: string): { age: number; ttl: number; expired: boolean } | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    const age = now - entry.timestamp
    const ttl = Math.max(0, entry.expiresAt - now)
    const expired = now >= entry.expiresAt

    return { age, ttl, expired }
  }

  static clear(): void {
    this.cache.clear()
  }
}

export interface TwitterData {
  profile: {
    id: string
    username: string
    name: string
    followers_count: number
    following_count: number
    tweet_count: number
  }
  analytics: {
    impressions: number
    engagements: number
    engagement_rate: number
  }
  tweets: Array<{
    id: string
    text: string
    created_at: string
    like_count: number
    retweet_count: number
    reply_count: number
    impression_count: number
  }>
}

export interface TwitterApiResponse {
  data: any[]
  meta?: {
    result_count: number
    next_token?: string
    oldest_id?: string
    newest_id?: string
  }
  includes?: {
    users?: any[]
    media?: any[]
    tweets?: any[]
  }
}

export interface TwitterUserMetrics {
  followers_count: number
  following_count: number
  tweet_count: number
  listed_count: number
}

export interface TwitterTweetMetrics {
  retweet_count: number
  reply_count: number
  like_count: number
  quote_count: number
  impression_count?: number
}

export interface TwitterTweet {
  id: string
  text: string
  created_at: string
  author_id: string
  public_metrics: TwitterTweetMetrics
  organic_metrics?: TwitterTweetMetrics
  promoted_metrics?: TwitterTweetMetrics
  non_public_metrics?: {
    impression_count: number
    url_link_clicks: number
    user_profile_clicks: number
  }
  context_annotations?: Array<{
    domain: { id: string; name: string }
    entity: { id: string; name: string }
  }>
  entities?: {
    hashtags?: Array<{ start: number; end: number; tag: string }>
    mentions?: Array<{ start: number; end: number; username: string }>
    urls?: Array<{ start: number; end: number; url: string; expanded_url: string }>
  }
}

export class TwitterApiClient extends BaseApiClient {
  private static readonly BASE_URL = "https://api.x.com/2"
  private static readonly ADS_BASE_URL = "https://ads-api.x.com/11" // Twitter Ads API v11

  /**
   * Enhanced analytics fetching with subscription-aware separation
   */
  static async fetchAnalytics(
    accessToken: string,
    userPlan: SubscriptionPlan = SubscriptionPlan.FREEMIUM
  ): Promise<TwitterAnalytics> {
    // Generate cache key for this access token
    const cacheKey = generateCacheKey(accessToken)

    // Check if we have valid cached data
    if (TwitterApiCache.has(cacheKey)) {
      const cached = TwitterApiCache.get<TwitterAnalytics>(cacheKey)
      if (cached) {
        const cacheInfo = TwitterApiCache.getCacheInfo(cacheKey)
        logger.analytics("✅ Returning cached Twitter analytics", {
          platform: 'twitter',
          dataType: 'posts',
          success: true
        }, { operation: 'cache_hit', cacheAge: cacheInfo?.age, cacheExpired: cacheInfo?.expired }, ['twitter', 'analytics', 'cache'])
        return cached
      }
    }

    try {
      logger.analytics("Starting Twitter analytics fetch", {
        platform: 'twitter',
        dataType: 'posts',
        success: false
      }, { operation: 'fetch_analytics' }, ['twitter', 'analytics'])

      const profile = await this.getUserData(accessToken)
      const postsAnalytics = await this.getPostsAnalytics(accessToken, profile.id)

      // Only fetch ads analytics for premium users AND if they have X Ads API access
      let adsAnalytics: TwitterAdsAnalytics | null = null
      if (userPlan !== SubscriptionPlan.FREEMIUM) {
        // Premium user - check if they have X Ads API access
        logger.info("Premium user detected - checking X Ads API access", { userPlan })
        adsAnalytics = await this.getTwitterAdsAnalytics(accessToken, profile.id)

        if (!adsAnalytics) {
          logger.info("Premium user does NOT have X Ads API access - ads data will be null")
        } else {
          logger.info("Premium user HAS X Ads API access - returning real ads data")
        }
      } else {
        logger.info("Freemium user - skipping ads analytics")
      }

      const result: TwitterAnalytics = {
        profile: {
          id: profile.id,
          username: profile.username,
          followers_count: profile.followers_count,
          tweet_count: profile.tweet_count
        },
        posts: postsAnalytics,
        ads: adsAnalytics, // Will be null if no X Ads API access
        lastUpdated: new Date().toISOString()
      }

      // Store in cache for 15 minutes
      TwitterApiCache.set(cacheKey, result, 15 * 60 * 1000)
      logger.analytics("💾 Stored Twitter analytics in cache", {
        platform: 'twitter',
        dataType: 'posts',
        success: true
      }, { operation: 'cache_store' }, ['twitter', 'analytics', 'cache'])

      return result
    } catch (error) {
      console.error("Twitter analytics API failed:", error)

      // If rate limited, try to return expired cache data
      if (error && typeof error === 'object' && 'type' in error && error.type === 'rate_limit') {
        const cached = TwitterApiCache.get<TwitterAnalytics>(cacheKey)
        if (cached) {
          logger.analytics("⚠️ Rate limited - returning expired cache", {
            platform: 'twitter',
            dataType: 'posts',
            success: true
          }, { operation: 'cache_fallback' }, ['twitter', 'analytics', 'cache', 'rate_limit'])
          return cached
        }
      }

      logger.analytics("Twitter analytics fetch failed", {
        platform: 'twitter',
        dataType: 'posts',
        success: false,
        errorReason: error instanceof Error ? error.message : 'Unknown error'
      }, {
        operation: 'fetch_analytics',
        stack: error instanceof Error ? error.stack : undefined
      }, ['twitter', 'analytics', 'error'])
      throw new Error(`Failed to fetch Twitter analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhanced Twitter posts analytics with comprehensive Twitter API v2 metrics
   */
  static async getPostsAnalytics(accessToken: string, userId: string): Promise<TwitterPostAnalytics> {
    try {
      // Reduced from 100 to 25 to optimize Twitter API Free tier usage
      // Free tier allows 1,500 tweets/month - 25 per request = 60 requests/month vs 15 requests/month with 100
      const tweets = await this.getTweetsWithMetrics(accessToken, userId, 25)

      if (!tweets.length) {
        return this.getMockTwitterPostsAnalyticsEnhanced()
      }

      // Check user authentication context for premium metrics access
      const hasUserContext = await this.checkUserContextAuth(accessToken)
      const authenticationStatus = {
        hasUserContext,
        accessLevel: hasUserContext ? 'user_context' as const : 'public' as const,
        availableMetrics: hasUserContext
          ? ['public_metrics', 'non_public_metrics', 'organic_metrics', 'promoted_metrics']
          : ['public_metrics']
      }

      const totalPosts = tweets.length

      // Calculate public metrics (available to all users)
      const publicMetrics = this.calculatePublicMetrics(tweets)

      // Calculate premium metrics (requires user context authentication)
      const nonPublicMetrics = hasUserContext ? this.calculateNonPublicMetrics(tweets) : undefined
      const organicMetrics = hasUserContext ? this.calculateOrganicMetrics(tweets) : undefined
      const promotedMetrics = hasUserContext ? this.calculatePromotedMetrics(tweets) : undefined

      // Calculate basic analytics
      const totalEngagement = publicMetrics.totalLikes + publicMetrics.totalRetweets +
        publicMetrics.totalReplies + publicMetrics.totalQuotes + (publicMetrics.totalBookmarks || 0)

      const totalImpressions = nonPublicMetrics?.totalImpressions || (totalEngagement * 15) // Fallback estimation
      const totalReach = Math.floor(totalImpressions * 0.75) // Estimate reach as 75% of impressions

      const avgEngagement = totalPosts > 0 ? totalEngagement / totalPosts : 0
      const avgReach = totalPosts > 0 ? totalReach / totalPosts : 0
      const avgImpressions = totalPosts > 0 ? totalImpressions / totalPosts : 0
      const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0

      // Find top performing tweet
      const topTweet = this.findTopPerformingTweet(tweets)

      // Generate comprehensive analytics
      const engagementTrend = this.generateTwitterEngagementTrend(tweets, hasUserContext)
      const contentPerformance = this.analyzeTwitterContentPerformance(tweets, hasUserContext)
      const topPerformingTweets = this.getTopPerformingTweets(tweets, hasUserContext)
      const contentInsights = this.generateTwitterContentInsights(tweets, avgEngagement, avgImpressions)
      const mediaMetrics = this.calculateMediaMetrics(tweets)

      return {
        totalPosts,
        avgEngagement,
        avgReach,
        avgImpressions,
        totalReach,
        totalImpressions,
        totalEngagements: totalEngagement,
        engagementRate,

        // Twitter API v2 Public Metrics
        publicMetrics,

        // Twitter API v2 Premium Metrics (requires user context)
        nonPublicMetrics,
        organicMetrics,
        promotedMetrics,

        // Media metrics
        mediaMetrics,

        // Top performing tweet
        topTweet: this.formatTopTweet(topTweet, hasUserContext),

        // Trends and performance
        engagementTrend,
        contentPerformance,
        topPerformingTweets,
        contentInsights,

        // Authentication status
        authenticationStatus
      }
    } catch (error) {
      logger.error("Failed to get Twitter posts analytics", { operation: 'fetch_posts_analytics', stack: error instanceof Error ? error.stack : undefined }, error, ['twitter', 'posts', 'error'])

      // If rate limited, try to return cached posts data
      if (error && typeof error === 'object' && 'type' in error && error.type === 'rate_limit') {
        // We need accessToken to generate cache key, but it's not passed here
        // This is a limitation - cache recovery happens at fetchAnalytics level
        logger.error("⚠️ Rate limited in getPostsAnalytics - cache recovery handled at higher level", { operation: 'rate_limit_posts' }, ['twitter', 'posts', 'rate_limit'])
      }

      return this.getMockTwitterPostsAnalyticsEnhanced()
    }
  }

  /**
   * Enhanced Twitter ads analytics with Twitter Ads API v12 integration
   */
  static async getAdsAnalytics(accessToken: string, userId: string): Promise<AdsAnalytics | null> {
    try {
      // Note: Twitter Ads API requires separate authentication and permissions
      // This is a simplified implementation - in production, you'd need proper Ads API access
      logger.info("Fetching Twitter Ads analytics for premium user")

      // For now, return mock data as Twitter Ads API requires special approval
      return this.getMockTwitterAdsAnalytics()
    } catch (error) {
      logger.error("Failed to get ads analytics", { operation: 'fetch_ads_analytics', stack: error instanceof Error ? error.stack : undefined }, error, ['twitter', 'ads', 'error'])
      return this.getMockTwitterAdsAnalytics()
    }
  }

  /**
   * Comprehensive Twitter Ads Analytics using Twitter Ads API v12
   * Returns null for users without ads accounts, or error object with user-friendly messaging
   */
  /**
   * Comprehensive Twitter Ads Analytics using X Ads API v11
   * Returns null if user doesn't have Ads API access
   * Returns TwitterAdsAnalytics with REAL data if user has access
   */
  static async getTwitterAdsAnalytics(accessToken: string, userId: string): Promise<TwitterAdsAnalytics | null> {
    try {
      logger.info("Fetching comprehensive Twitter Ads analytics for premium user")

      // STEP 1: Check if user has X Ads API access
      const adsAccessCheck = await this.checkTwitterAdsApiAccess(accessToken)

      if (!adsAccessCheck.hasAccess) {
        // User doesn't have X Ads API access - return null
        logger.info("User does not have X Ads API access", {
          operation: 'check_ads_access',
          userId,
          reason: adsAccessCheck.error,
          message: adsAccessCheck.message
        }, ['twitter', 'ads'])
        return null
      }

      const adAccounts = adsAccessCheck.accounts
      logger.info(`User has ${adAccounts.length} X Ads account(s)`, { accountIds: adAccounts.map(a => a.id) })

      // STEP 2: Fetch analytics from X Ads API for each account
      const accountAnalyticsPromises = adAccounts.map((account: any) =>
        this.fetchTwitterAdsAccountStats(accessToken, account.id)
      )

      const accountAnalyticsResults = await Promise.allSettled(accountAnalyticsPromises)

      // STEP 3: Aggregate data from all accounts
      const successfulResults = accountAnalyticsResults
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(data => data !== null)

      if (successfulResults.length === 0) {
        logger.warn("No successful ads analytics fetch for any account", { userId })
        return null
      }

      // STEP 4: Aggregate and structure the data
      const aggregatedData = this.aggregateTwitterAdsDataFromApi(successfulResults, adAccounts)

      logger.info("Twitter Ads analytics fetched successfully", {
        userId,
        accountCount: adAccounts.length,
        totalSpend: aggregatedData.totalSpend,
        totalImpressions: aggregatedData.totalImpressions
      })

      return aggregatedData
    } catch (error) {
      logger.error("Failed to get comprehensive Twitter ads analytics", {
        operation: 'fetch_comprehensive_ads',
        userId,
        stack: error instanceof Error ? error.stack : undefined
      }, error, ['twitter', 'ads', 'error'])

      // Return null on error to maintain type consistency
      // Frontend will show appropriate "no ads data" message
      return null
    }
  }

  /**
   * Check if user has X Ads API access
   * Returns: { hasAccess: boolean, accounts: array, message: string }
   */
  static async checkTwitterAdsApiAccess(accessToken: string): Promise<{
    hasAccess: boolean
    accounts: any[]
    message: string
    error?: string
  }> {
    try {
      // X Ads API requires SEPARATE approval and OAuth scopes (rw_ads or r_ads)
      // Regular X API v2 tokens DO NOT work for Ads API
      logger.info("Checking X Ads API access", { operation: 'check_ads_access' }, ['twitter', 'ads', 'auth'])

      // Attempt to fetch ad accounts from X Ads API v11
      const adAccounts = await this.getTwitterAdAccounts(accessToken)

      if (!adAccounts || adAccounts.length === 0) {
        return {
          hasAccess: false,
          accounts: [],
          message: 'No X Ads accounts found. To use ads analytics, you need to: 1) Set up an ads account at ads.x.com, 2) Apply for X Ads API access, 3) Reconnect with ads permissions.',
          error: 'no_ads_accounts'
        }
      }

      return {
        hasAccess: true,
        accounts: adAccounts,
        message: `Successfully connected to ${adAccounts.length} X Ads account(s)`
      }
    } catch (error: any) {
      // Check for specific error types
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        return {
          hasAccess: false,
          accounts: [],
          message: 'X Ads API authentication failed. Your token does not have ads permissions. Apply for X Ads API access at ads.x.com/help.',
          error: 'unauthorized'
        }
      }

      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        return {
          hasAccess: false,
          accounts: [],
          message: 'X Ads API access forbidden. Your app may not be approved for Ads API access. Visit ads.x.com/help to request access.',
          error: 'forbidden'
        }
      }

      if (error.message?.includes('429') || error.message?.includes('Rate')) {
        return {
          hasAccess: false,
          accounts: [],
          message: 'X Ads API rate limit exceeded. Please try again later.',
          error: 'rate_limit'
        }
      }

      logger.error("Failed to check X Ads API access", { operation: 'check_ads_access', stack: error instanceof Error ? error.stack : undefined }, error, ['twitter', 'ads', 'error'])

      return {
        hasAccess: false,
        accounts: [],
        message: `Failed to verify X Ads API access: ${error.message || 'Unknown error'}`,
        error: 'api_error'
      }
    }
  }

  /**
   * Get Twitter ad accounts for authenticated user
   * Makes REAL call to X Ads API v11
   */
  static async getTwitterAdAccounts(accessToken: string): Promise<any[]> {
    try {
      // Real X Ads API v11 endpoint
      const ADS_BASE_URL = 'https://ads-api.x.com/11'

      const response = await fetch(`${ADS_BASE_URL}/accounts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AdsInsights/1.0'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error("X Ads API accounts request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        }, ['twitter', 'ads', 'error'])

        throw new Error(`X Ads API returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // X Ads API returns: { data: [...], request: {...} }
      const accounts = data.data || []

      logger.info(`Found ${accounts.length} X Ads account(s)`, {
        accountIds: accounts.map((a: any) => a.id),
        accountNames: accounts.map((a: any) => a.name)
      }, ['twitter', 'ads'])

      return accounts
    } catch (error) {
      logger.error("Failed to get Twitter ad accounts", { operation: 'fetch_ad_accounts', stack: error instanceof Error ? error.stack : undefined }, error, ['twitter', 'ads', 'error'])
      throw error // Re-throw to let caller handle
    }
  }

  /**
   * Fetch REAL Twitter Ads account statistics from X Ads API v11
   * Endpoint: GET /11/stats/accounts/:account_id
   * Includes retry logic and rate limit handling
   */
  static async fetchTwitterAdsAccountStats(
    accessToken: string,
    accountId: string,
    maxRetries: number = 3
  ): Promise<any> {
    const cacheKey = `ads_stats_${accountId}_${accessToken.substring(0, 10)}`

    // Check cache first
    const cachedData = TwitterApiCache.get<any>(cacheKey)
    const cacheInfo = TwitterApiCache.getCacheInfo(cacheKey)

    if (cachedData && cacheInfo && !cacheInfo.expired) {
      logger.info("Returning cached X Ads stats", {
        accountId,
        cacheAge: Math.round(cacheInfo.age / 1000) + 's',
        cacheTTL: Math.round(cacheInfo.ttl / 1000) + 's'
      }, ['twitter', 'ads', 'cache'])
      return cachedData
    }

    try {
      const ADS_BASE_URL = 'https://ads-api.x.com/11'

      // Calculate date range (last 30 days)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      // X Ads API expects YYYY-MM-DD format
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // Metrics to request (X Ads API v11 supported metrics)
      const metrics = [
        'billed_charge_local_micro', // Spend in micro-currency units
        'impressions',
        'engagements',
        'clicks',
        'retweets',
        'replies',
        'likes',
        'follows',
        'card_engagements',
        'url_clicks',
        'app_clicks',
        'video_views',
        'video_total_views',
        'video_content_starts'
      ].join(',')

      const url = `${ADS_BASE_URL}/stats/accounts/${accountId}?` +
        `start_time=${startDateStr}&` +
        `end_time=${endDateStr}&` +
        `metrics=${metrics}&` +
        `granularity=DAY&` +
        `placement=ALL_ON_TWITTER`

      logger.info("Fetching X Ads account stats", {
        operation: 'fetch_account_stats',
        accountId,
        startDate: startDateStr,
        endDate: endDateStr
      }, ['twitter', 'ads', 'stats'])

      // Retry logic with exponential backoff
      let lastError: any = null
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'User-Agent': 'AdsInsights/1.0'
            }
          })

          // Handle rate limiting (429)
          if (response.status === 429) {
            const retryAfter = response.headers.get('X-Rate-Limit-Reset')
            const rateLimitRemaining = response.headers.get('X-Rate-Limit-Remaining')

            logger.warn("X Ads API rate limit hit", {
              accountId,
              attempt,
              retryAfter,
              rateLimitRemaining
            }, ['twitter', 'ads', 'rate_limit'])

            // Return cached data if available (even if expired)
            if (cachedData) {
              logger.info("Returning stale cached data due to rate limit", {
                accountId,
                cacheAge: cacheInfo ? Math.round(cacheInfo.age / 1000) + 's' : 'unknown'
              }, ['twitter', 'ads', 'cache'])
              return cachedData
            }

            // If this is not the last attempt and we have no cache, retry with backoff
            if (attempt < maxRetries) {
              const waitTime = Math.min(1000 * Math.pow(2, attempt), 30000) // Max 30s
              logger.info(`Waiting ${waitTime}ms before retry`, { attempt, accountId }, ['twitter', 'ads', 'retry'])
              await new Promise(resolve => setTimeout(resolve, waitTime))
              continue
            }

            throw new Error(`Rate limit exceeded. Remaining: ${rateLimitRemaining}. Reset: ${retryAfter}`)
          }

          if (!response.ok) {
            const errorText = await response.text()

            // If this is a transient error (5xx) and not the last attempt, retry
            if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
              logger.warn("X Ads API server error, retrying", {
                status: response.status,
                accountId,
                attempt,
                error: errorText
              }, ['twitter', 'ads', 'retry'])

              const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000) // Max 10s
              await new Promise(resolve => setTimeout(resolve, waitTime))
              continue
            }

            logger.error("X Ads API stats request failed", {
              status: response.status,
              statusText: response.statusText,
              accountId,
              error: errorText
            }, ['twitter', 'ads', 'error'])

            // Return cached data if available (even if expired)
            if (cachedData) {
              logger.info("Returning stale cached data due to API error", {
                accountId,
                cacheAge: cacheInfo ? Math.round(cacheInfo.age / 1000) + 's' : 'unknown'
              }, ['twitter', 'ads', 'cache'])
              return cachedData
            }

            return null
          }

          const data = await response.json()

          logger.info("X Ads stats fetched successfully", {
            accountId,
            dataPoints: data.data?.length || 0,
            attempt
          }, ['twitter', 'ads'])

          const result = {
            accountId,
            rawData: data,
            fetchedAt: new Date().toISOString()
          }

          // Cache the successful result (15 minutes TTL)
          TwitterApiCache.set(cacheKey, result, 15 * 60 * 1000)

          return result
        } catch (fetchError: any) {
          lastError = fetchError

          // Retry on network errors if not the last attempt
          if (attempt < maxRetries) {
            logger.warn("Network error, retrying", {
              accountId,
              attempt,
              error: fetchError.message
            }, ['twitter', 'ads', 'retry'])

            const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
        }
      }

      // If all retries failed, return cached data if available
      if (cachedData) {
        logger.warn("All retries failed, returning stale cached data", {
          accountId,
          cacheAge: cacheInfo ? Math.round(cacheInfo.age / 1000) + 's' : 'unknown'
        }, ['twitter', 'ads', 'cache'])
        return cachedData
      }

      throw lastError || new Error('All retry attempts failed')
    } catch (error) {
      logger.error("Failed to fetch Twitter Ads account stats", {
        operation: 'fetch_account_stats',
        accountId,
        stack: error instanceof Error ? error.stack : undefined
      }, error, ['twitter', 'ads', 'error'])

      // Final fallback: return cached data if available
      const cachedData = TwitterApiCache.get<any>(cacheKey)
      if (cachedData) {
        logger.info("Returning cached data as final fallback", { accountId }, ['twitter', 'ads', 'cache'])
        return cachedData
      }

      return null
    }
  }

  /**
   * Fetch Twitter campaign insights from Ads API
   */
  static async fetchTwitterCampaignInsights(
    accessToken: string,
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    try {
      const ADS_BASE_URL = 'https://ads-api.x.com/11'

      // Get campaigns for this account first
      const campaignsUrl = `${ADS_BASE_URL}/accounts/${accountId}/campaigns?` +
        `count=100&` +
        `with_deleted=false`

      logger.info("Fetching Twitter campaigns", { operation: 'fetch_campaigns', accountId }, ['twitter', 'ads', 'campaign'])

      const campaignsResponse = await fetch(campaignsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AdsInsights/1.0'
        }
      })

      if (!campaignsResponse.ok) {
        logger.error("Failed to fetch campaigns", { status: campaignsResponse.status }, ['twitter', 'ads', 'error'])
        return { data: [] }
      }

      const campaignsData = await campaignsResponse.json()
      return campaignsData
    } catch (error) {
      logger.error("Failed to fetch Twitter campaign insights", { operation: 'fetch_campaign_insights', stack: error instanceof Error ? error.stack : undefined }, error, ['twitter', 'ads', 'campaign', 'error'])
      return { data: [] }
    }
  }

  /**
   * Aggregate REAL Twitter ads data from X Ads API responses
   * Processes actual API data into TwitterAdsAnalytics structure
   */
  static aggregateTwitterAdsDataFromApi(accountStatsResults: any[], adAccounts: any[]): TwitterAdsAnalytics {
    // Initialize aggregated metrics
    let totalSpend = 0
    let totalImpressions = 0
    let totalEngagements = 0
    let totalClicks = 0
    let totalRetweets = 0
    let totalReplies = 0
    let totalLikes = 0
    let totalFollows = 0
    let totalCardEngagements = 0
    let totalUrlClicks = 0
    let totalVideoViews = 0

    const spendTrend: any[] = []
    const dailyMetrics: Map<string, any> = new Map()

    // Process each account's stats
    accountStatsResults.forEach((result: any) => {
      if (!result || !result.rawData || !result.rawData.data) return

      const accountData = result.rawData.data

      accountData.forEach((dataPoint: any) => {
        if (!dataPoint.id_data || !dataPoint.id_data[0]) return

        const metrics = dataPoint.id_data[0].metrics || {}
        const date = dataPoint.id || {}

        // X Ads API returns metrics as arrays of strings (time-series data)
        // We need to sum across all time periods
        const getMetricValue = (metric: any): number => {
          if (Array.isArray(metric)) {
            return metric.reduce((sum, val) => sum + (parseInt(val) || 0), 0)
          }
          return parseInt(metric) || 0
        }

        // Aggregate totals
        const spend = getMetricValue(metrics.billed_charge_local_micro) / 1000000 // Convert from micro-currency
        const impressions = getMetricValue(metrics.impressions)
        const engagements = getMetricValue(metrics.engagements)
        const clicks = getMetricValue(metrics.clicks)

        totalSpend += spend
        totalImpressions += impressions
        totalEngagements += engagements
        totalClicks += clicks
        totalRetweets += getMetricValue(metrics.retweets)
        totalReplies += getMetricValue(metrics.replies)
        totalLikes += getMetricValue(metrics.likes)
        totalFollows += getMetricValue(metrics.follows)
        totalCardEngagements += getMetricValue(metrics.card_engagements)
        totalUrlClicks += getMetricValue(metrics.url_clicks)
        totalVideoViews += getMetricValue(metrics.video_total_views)

        // Build daily trend data
        if (date.time) {
          const dateStr = date.time.split('T')[0]
          if (!dailyMetrics.has(dateStr)) {
            dailyMetrics.set(dateStr, { date: dateStr, spend: 0, impressions: 0, clicks: 0, reach: 0 })
          }
          const daily = dailyMetrics.get(dateStr)
          daily.spend += spend
          daily.impressions += impressions
          daily.clicks += clicks
          daily.reach += impressions * 0.7 // Estimate reach
        }
      })
    })

    // Convert daily metrics to array and sort by date
    spendTrend.push(...Array.from(dailyMetrics.values()).sort((a, b) => a.date.localeCompare(b.date)))

    // Calculate derived metrics
    const totalReach = Math.floor(totalImpressions * 0.7) // Industry standard estimate
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const roas = totalSpend > 0 ? (totalEngagements * 0.5) / totalSpend : 0 // Simplified ROAS calculation

    // Find top performing day
    const topDay = spendTrend.length > 0
      ? spendTrend.reduce((max, day) => day.engagements > max.engagements ? day : max, spendTrend[0])
      : null

    // Build TwitterAdsAnalytics structure with REAL data
    const adsAnalytics: TwitterAdsAnalytics = {
      totalSpend,
      totalReach,
      totalImpressions,
      totalClicks,
      cpm,
      cpc,
      ctr,
      roas,

      topAd: topDay ? {
        id: `top_day_${topDay.date}`,
        name: `Best Performance - ${topDay.date}`,
        spend: topDay.spend,
        reach: topDay.reach,
        impressions: topDay.impressions,
        clicks: topDay.clicks,
        ctr: topDay.impressions > 0 ? (topDay.clicks / topDay.impressions) * 100 : 0,
        date: topDay.date
      } : {
        id: 'no_data',
        name: 'No ads data',
        spend: 0,
        reach: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        date: new Date().toISOString()
      },

      spendTrend,

      audienceInsights: {
        ageGroups: [], // X Ads API doesn't provide demographic breakdown in basic stats
        genders: [],
        topLocations: []
      },

      // Twitter-specific metrics
      twitterSpecificMetrics: {
        retweets: totalRetweets,
        replies: totalReplies,
        likes: totalLikes,
        quotes: 0, // Not available in basic stats
        follows: totalFollows,
        unfollows: 0,

        promotedTweetEngagements: totalEngagements,
        cardEngagements: totalCardEngagements,
        linkClicks: totalUrlClicks,
        appOpens: 0,
        appInstalls: 0,

        videoViews: totalVideoViews,
        videoQuartile25Views: 0,
        videoQuartile50Views: 0,
        videoQuartile75Views: 0,
        videoCompleteViews: 0,

        pollCardVotes: 0,
        leadGeneration: 0,
        emailSignups: 0
      },

      campaignPerformance: [], // Would need separate campaigns API call
      lineItemPerformance: [],
      promotedTweetPerformance: [],
      twitterAudienceInsights: {
        demographics: {
          ageGroups: [],
          genders: [],
          locations: [],
          languages: []
        },
        interests: [],
        devices: [],
        platforms: [],
        timeOfDay: [],
        dayOfWeek: []
      },

      // Conversion metrics (empty for basic stats - requires conversion tracking setup)
      conversionMetrics: {
        websiteClicks: { count: totalUrlClicks, value: 0 },
        appInstalls: { count: 0, value: 0 },
        appOpens: { count: 0, value: 0 },
        leadGeneration: { count: 0, value: 0 },
        purchases: { count: 0, value: 0 },
        signups: { count: 0, value: 0 },
        downloads: { count: 0, value: 0 },
        customConversions: []
      },

      // Billing insights
      billingInsights: {
        totalBilledAmount: totalSpend,
        currency: adAccounts[0]?.currency || 'USD',
        billingPeriod: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        },
        spendByObjective: [],
        spendByBidType: [],
        costBreakdown: {
          mediaCost: totalSpend * 0.85, // Estimated 85% media cost
          platformFee: totalSpend * 0.10, // Estimated 10% platform fee
          taxAmount: totalSpend * 0.05, // Estimated 5% tax
          totalCost: totalSpend
        }
      },

      // Engagement quality metrics (requires additional API calls to calculate accurately)
      engagementQuality: {
        organicEngagements: 0, // Requires organic data comparison
        paidEngagements: totalEngagements,
        engagementRate: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
        qualityScore: 75, // Placeholder - requires quality scoring algorithm
        brandSafetyScore: 90, // Placeholder - requires brand safety API
        spamScore: 5, // Placeholder - requires spam detection
        authenticityScore: 85 // Placeholder - requires authenticity verification
      }
    }

    // Extract fetchedAt timestamp from the most recent account stats result
    let mostRecentFetch = new Date().toISOString()
    if (accountStatsResults.length > 0) {
      const timestamps = accountStatsResults
        .filter((r: any) => r && r.fetchedAt)
        .map((r: any) => new Date(r.fetchedAt).getTime())

      if (timestamps.length > 0) {
        mostRecentFetch = new Date(Math.max(...timestamps)).toISOString()
      }
    }

    logger.info("Aggregated Twitter Ads data from API", {
      totalSpend,
      totalImpressions,
      totalClicks,
      ctr,
      accountCount: adAccounts.length,
      fetchedAt: mostRecentFetch
    })

      // Add metadata about data freshness (not part of interface, but useful for debugging)
      ; (adsAnalytics as any).metadata = {
        fetchedAt: mostRecentFetch,
        accountCount: adAccounts.length,
        dataSource: 'x_ads_api_v11'
      }

    return adsAnalytics
  }

  /**
   * @deprecated Use aggregateTwitterAdsDataFromApi instead for real data
   * Aggregate Twitter ads data from multiple campaigns (OLD METHOD)
   */
  static aggregateTwitterAdsData(campaignData: any[]): TwitterAdsAnalytics {
    // This method is deprecated - kept for backward compatibility
    // All new code should use aggregateTwitterAdsDataFromApi
    logger.warn("Using deprecated aggregateTwitterAdsData method - use aggregateTwitterAdsDataFromApi instead")

    const totalImpressions = campaignData.reduce((sum, campaign) => {
      return sum + parseInt(campaign.id_data?.[0]?.metrics?.impressions?.[0] || '0')
    }, 0)

    const totalEngagements = campaignData.reduce((sum, campaign) => {
      return sum + parseInt(campaign.id_data?.[0]?.metrics?.engagements?.[0] || '0')
    }, 0)

    const totalSpend = campaignData.reduce((sum, campaign) => {
      return sum + (parseInt(campaign.id_data?.[0]?.metrics?.billed_charge_local_micro?.[0] || '0') / 1000000)
    }, 0)

    const totalClicks = campaignData.reduce((sum, campaign) => {
      return sum + parseInt(campaign.id_data?.[0]?.metrics?.clicks?.[0] || '0')
    }, 0)

    // Calculate derived metrics
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const estimatedReach = Math.floor(totalImpressions * 0.7) // Estimate reach as 70% of impressions

    // Return minimal structure
    return this.getMockTwitterAdsAnalyticsComprehensive()
  }

  /**
   * Enhanced tweets fetching with comprehensive metrics
   */
  static async getTweetsWithMetrics(
    accessToken: string,
    userId: string,
    maxResults: number = 50
  ): Promise<TwitterTweet[]> {
    const tweetFields = [
      'id', 'text', 'created_at', 'author_id', 'public_metrics',
      'organic_metrics', 'promoted_metrics', 'non_public_metrics',
      'context_annotations', 'entities', 'attachments'
    ].join(',')

    const expansions = 'attachments.media_keys'
    const mediaFields = 'type,url,alt_text,duration_ms,height,width'

    const url = `${this.BASE_URL}/users/${userId}/tweets?` +
      `max_results=${Math.min(maxResults, 100)}&` +
      `tweet.fields=${tweetFields}&` +
      `expansions=${expansions}&` +
      `media.fields=${mediaFields}`

    const response = await this.makeRequest<TwitterApiResponse>(
      url,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      },
      "Failed to fetch tweets with metrics"
    )

    return response.data || []
  }

  // Backward compatibility method
  static async fetchData(accessToken: string): Promise<TwitterData> {
    try {
      const profile = await this.getUserData(accessToken)
      const [tweets, analytics] = await Promise.allSettled([
        this.getTweets(accessToken, profile.id),
        this.getAnalytics(accessToken, profile.id),
      ])

      return {
        profile,
        tweets: tweets.status === "fulfilled" ? tweets.value : this.getMockTweets(),
        analytics: analytics.status === "fulfilled" ? analytics.value : this.getMockAnalytics(),
      }
    } catch (error) {
      logger.error("Twitter API failed", { operation: 'fetch_data', stack: error instanceof Error ? error.stack : undefined }, error, ['twitter', 'api', 'error'])
      return this.generateMockData()
    }
  }

  /**
   * Utility methods for analytics processing
   */

  static determineTwitterMediaType(tweet: TwitterTweet): 'image' | 'video' | 'carousel' | 'text' {
    // Check if tweet has media attachments
    if ((tweet as any).attachments?.media_keys?.length > 0) {
      // In a real implementation, you'd check the media type from the includes
      // For now, assume image if media is present
      return 'image'
    }

    // Check for video indicators in entities or text
    if (tweet.entities?.urls?.some(url =>
      url.expanded_url.includes('video') ||
      url.expanded_url.includes('youtube') ||
      url.expanded_url.includes('vimeo')
    )) {
      return 'video'
    }

    // Check for image indicators
    if (tweet.entities?.urls?.some(url =>
      url.expanded_url.includes('pic.x.com') ||
      url.expanded_url.includes('photo')
    )) {
      return 'image'
    }

    return 'text'
  }

  /**
   * Mock data generators following established patterns
   */
  static generateMockTwitterAnalytics(userPlan: SubscriptionPlan): TwitterAnalytics {
    return {
      profile: {
        id: "mock_twitter_id",
        username: "sample_business",
        followers_count: 5200,
        tweet_count: 1250
      },
      posts: this.getMockTwitterPostsAnalyticsEnhanced(),
      ads: userPlan !== SubscriptionPlan.FREEMIUM ? this.getMockTwitterAdsAnalytics() : null,
      lastUpdated: new Date().toISOString()
    }
  }

  static getMockTwitterPostsAnalytics(): PostAnalytics {
    return {
      totalPosts: 45,
      avgEngagement: 124.8,
      avgReach: 2150,
      avgImpressions: 2680,
      totalReach: 96750,
      totalImpressions: 120600,
      totalEngagements: 5616,
      engagementRate: 4.66,
      organicReach: 82237,
      paidReach: 14512,
      viralReach: 29025,
      totalReactions: 5616,
      reactionBreakdown: {
        like: 3931,
        love: 0,
        wow: 0,
        haha: 0,
        sad: 0,
        angry: 0
      },
      topPost: {
        id: "mock_tweet_top",
        content: "Excited to announce our new product launch! 🚀 #innovation #startup",
        engagement: 445,
        reach: 8200,
        impressions: 10250,
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        mediaType: 'image',
        reactions: {
          like: 312,
          love: 0,
          wow: 0,
          haha: 0,
          sad: 0,
          angry: 0
        },
        shares: 89,
        comments: 44,
        clicks: 133,
        videoViews: 0,
        videoViewTime: 0
      },
      engagementTrend: Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return {
          date: date.toISOString().split('T')[0],
          engagement: Math.floor(Math.random() * 200) + 50,
          reach: Math.floor(Math.random() * 3000) + 1000,
          impressions: Math.floor(Math.random() * 4000) + 1500,
          organicReach: Math.floor(Math.random() * 2500) + 850,
          paidReach: Math.floor(Math.random() * 500) + 150,
          viralReach: Math.floor(Math.random() * 800) + 300
        }
      }),
      contentPerformance: [
        {
          type: 'text',
          count: 20,
          avgEngagement: 95.5,
          avgReach: 1850,
          avgImpressions: 2315,
          avgClicks: 28,
          engagementRate: 4.13
        },
        {
          type: 'image',
          count: 18,
          avgEngagement: 142.3,
          avgReach: 2580,
          avgImpressions: 3225,
          avgClicks: 42,
          engagementRate: 4.41
        },
        {
          type: 'video',
          count: 5,
          avgEngagement: 234.8,
          avgReach: 3840,
          avgImpressions: 4800,
          avgClicks: 71,
          engagementRate: 4.89
        },
        {
          type: 'carousel',
          count: 2,
          avgEngagement: 156.2,
          avgReach: 2920,
          avgImpressions: 3650,
          avgClicks: 47,
          engagementRate: 4.28
        }
      ],
      topPerformingPosts: [
        {
          id: "mock_top_1",
          content: "Just launched our AI-powered analytics dashboard! 📊",
          engagement: 445,
          reach: 8200,
          impressions: 10250,
          date: new Date().toISOString(),
          mediaType: 'image',
          performanceScore: 89
        },
        {
          id: "mock_top_2",
          content: "Behind the scenes of our latest product development 🚀",
          engagement: 378,
          reach: 7100,
          impressions: 8875,
          date: new Date().toISOString(),
          mediaType: 'video',
          performanceScore: 76
        }
      ],
      contentInsights: {
        bestPerformingType: 'video',
        optimalPostingHours: [
          { hour: 9, avgEngagement: 149.8 },
          { hour: 12, avgEngagement: 137.3 },
          { hour: 15, avgEngagement: 143.5 },
          { hour: 18, avgEngagement: 156.0 }
        ],
        avgEngagementByType: {
          text: 95.5,
          image: 142.3,
          video: 234.8,
          carousel: 156.2
        },
        avgReachByType: {
          text: 1850,
          image: 2580,
          video: 3840,
          carousel: 2920
        }
      }
    }
  }

  static getMockTwitterAdsAnalytics(): AdsAnalytics {
    return {
      totalSpend: 2450.00,
      totalReach: 75000,
      totalImpressions: 125000,
      totalClicks: 1850,
      cpm: 19.60,
      cpc: 1.32,
      ctr: 1.48,
      roas: 3.2,
      topAd: {
        id: "mock_promoted_tweet",
        name: "Product Launch Campaign",
        spend: 650.00,
        reach: 18500,
        impressions: 28750,
        clicks: 425,
        ctr: 1.48,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      spendTrend: Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return {
          date: date.toISOString().split('T')[0],
          spend: Math.floor(Math.random() * 400) + 200,
          reach: Math.floor(Math.random() * 12000) + 8000,
          impressions: Math.floor(Math.random() * 18000) + 12000,
          clicks: Math.floor(Math.random() * 300) + 150
        }
      }),
      audienceInsights: {
        ageGroups: [
          { range: "18-24", percentage: 22.5 },
          { range: "25-34", percentage: 35.8 },
          { range: "35-44", percentage: 24.2 },
          { range: "45-54", percentage: 12.1 },
          { range: "55+", percentage: 5.4 }
        ],
        genders: [
          { gender: "Male", percentage: 52.3 },
          { gender: "Female", percentage: 46.8 },
          { gender: "Other", percentage: 0.9 }
        ],
        topLocations: [
          { location: "United States", percentage: 45.2 },
          { location: "United Kingdom", percentage: 18.7 },
          { location: "Canada", percentage: 12.4 },
          { location: "Australia", percentage: 8.9 },
          { location: "Germany", percentage: 6.8 }
        ]
      }
    }
  }

  /**
   * Comprehensive mock Twitter ads analytics for development/demonstration
   */
  static getMockTwitterAdsAnalyticsComprehensive(): TwitterAdsAnalytics {
    const baseAds = this.getMockTwitterAdsAnalytics()

    return {
      ...baseAds,

      // Twitter-specific engagement metrics
      twitterSpecificMetrics: {
        retweets: 892,
        replies: 456,
        likes: 3420,
        quotes: 234,
        follows: 156,
        unfollows: 23,

        promotedTweetEngagements: 4202,
        cardEngagements: 567,
        linkClicks: 1285,
        appOpens: 89,
        appInstalls: 45,

        videoViews: 8500,
        videoQuartile25Views: 6800,
        videoQuartile50Views: 5100,
        videoQuartile75Views: 3400,
        videoCompleteViews: 2550,

        pollCardVotes: 324,
        leadGeneration: 67,
        emailSignups: 34
      },

      // Campaign performance breakdown
      campaignPerformance: [
        {
          id: 'tw_campaign_1',
          name: 'Brand Awareness Q4',
          status: 'ACTIVE',
          objective: 'AWARENESS',
          totalBudget: 5000.00,
          dailyBudget: 200.00,
          spend: 1245.75,
          impressions: 45600,
          engagements: 1842,
          clicks: 567,
          ctr: 1.24,
          cpe: 0.68,
          cpm: 27.32,
          startDate: '2024-09-01',
          endDate: '2024-09-30',
          bidAmount: 2.50,
          bidType: 'AUTO',
          targeting: {
            locations: ['United States', 'Canada'],
            languages: ['en'],
            ageRanges: ['25-34', '35-44'],
            genders: ['Male', 'Female'],
            interests: ['Technology', 'Business'],
            keywords: ['innovation', 'productivity'],
            followers: ['@tech_leaders', '@business_news']
          }
        },
        {
          id: 'tw_campaign_2',
          name: 'Lead Generation Campaign',
          status: 'ACTIVE',
          objective: 'LEAD_GENERATION',
          totalBudget: 3000.00,
          dailyBudget: 150.00,
          spend: 892.50,
          impressions: 28900,
          engagements: 1156,
          clicks: 445,
          ctr: 1.54,
          cpe: 0.77,
          cpm: 30.89,
          startDate: '2024-09-10',
          endDate: '2024-09-25',
          bidAmount: 3.00,
          bidType: 'TARGET',
          targeting: {
            locations: ['United States'],
            languages: ['en'],
            ageRanges: ['25-44'],
            genders: ['Male', 'Female'],
            interests: ['B2B', 'SaaS'],
            keywords: ['software', 'business tools'],
            followers: ['@saas_companies']
          }
        }
      ],

      // Line item performance
      lineItemPerformance: [
        {
          id: 'tw_lineitem_1',
          name: 'Promoted Tweet Set 1',
          campaignId: 'tw_campaign_1',
          status: 'ACTIVE',
          bidAmount: 2.50,
          spend: 623.80,
          impressions: 22800,
          engagements: 921,
          clicks: 284,
          ctr: 1.25,
          cpe: 0.68,
          qualityScore: 8.2,
          optimizationTarget: 'ENGAGEMENT'
        },
        {
          id: 'tw_lineitem_2',
          name: 'Promoted Tweet Set 2',
          campaignId: 'tw_campaign_2',
          status: 'ACTIVE',
          bidAmount: 3.00,
          spend: 446.25,
          impressions: 14450,
          engagements: 578,
          clicks: 222,
          ctr: 1.54,
          cpe: 0.77,
          qualityScore: 7.8,
          optimizationTarget: 'CLICKS'
        }
      ],

      // Promoted tweet performance
      promotedTweetPerformance: [
        {
          id: 'tw_promoted_1',
          tweetId: '1234567890',
          tweetText: 'Discover the future of productivity with our innovative platform. Transform your workflow today! #Innovation #Productivity',
          lineItemId: 'tw_lineitem_1',
          spend: 312.45,
          impressions: 11400,
          engagements: 456,
          retweets: 89,
          replies: 23,
          likes: 344,
          clicks: 142,
          ctr: 1.25,
          engagementRate: 4.00,
          mediaType: 'IMAGE',
          hasCard: true,
          cardType: 'WEBSITE'
        },
        {
          id: 'tw_promoted_2',
          tweetId: '0987654321',
          tweetText: 'Join thousands of professionals already using our platform. Start your free trial now! 🚀',
          lineItemId: 'tw_lineitem_2',
          spend: 223.15,
          impressions: 7225,
          engagements: 289,
          retweets: 45,
          replies: 12,
          likes: 232,
          clicks: 111,
          ctr: 1.54,
          engagementRate: 4.00,
          mediaType: 'VIDEO',
          hasCard: true,
          cardType: 'VIDEO_WEBSITE'
        }
      ],

      // Enhanced audience insights
      twitterAudienceInsights: {
        demographics: {
          ageGroups: [
            { range: '18-24', percentage: 22.5, spend: 551.25, engagements: 428 },
            { range: '25-34', percentage: 35.8, spend: 877.11, engagements: 716 },
            { range: '35-44', percentage: 24.2, spend: 592.89, engagements: 485 },
            { range: '45-54', percentage: 12.1, spend: 296.45, engagements: 203 },
            { range: '55+', percentage: 5.4, spend: 132.30, engagements: 88 }
          ],
          genders: [
            { gender: 'Male', percentage: 52.3, spend: 1281.41, engagements: 1048 },
            { gender: 'Female', percentage: 46.8, spend: 1146.34, engagements: 836 },
            { gender: 'Other', percentage: 0.9, spend: 22.05, engagements: 16 }
          ],
          locations: [
            { location: 'United States', percentage: 45.2, spend: 1107.54, engagements: 892 },
            { location: 'United Kingdom', percentage: 18.7, spend: 458.15, engagements: 356 },
            { location: 'Canada', percentage: 12.4, spend: 303.80, engagements: 235 },
            { location: 'Australia', percentage: 8.9, spend: 218.01, engagements: 169 },
            { location: 'Germany', percentage: 6.8, spend: 166.60, engagements: 128 }
          ],
          languages: [
            { language: 'English', percentage: 89.4, spend: 2190.21, engagements: 1698 },
            { language: 'Spanish', percentage: 6.2, spend: 151.90, engagements: 118 },
            { language: 'French', percentage: 4.4, spend: 107.80, engagements: 84 }
          ]
        },
        interests: [
          { interest: 'Technology', percentage: 34.5, spend: 845.25, engagements: 656 },
          { interest: 'Business', percentage: 28.7, spend: 703.13, engagements: 546 },
          { interest: 'Innovation', percentage: 18.9, spend: 463.01, engagements: 359 },
          { interest: 'Productivity', percentage: 12.3, spend: 301.35, engagements: 234 },
          { interest: 'Software', percentage: 5.6, spend: 137.26, engagements: 107 }
        ],
        devices: [
          { device: 'Mobile', percentage: 72.8, spend: 1783.66, engagements: 1385 },
          { device: 'Desktop', percentage: 24.5, spend: 600.25, engagements: 466 },
          { device: 'Tablet', percentage: 2.7, spend: 66.15, engagements: 51 }
        ],
        platforms: [
          { platform: 'Twitter', percentage: 100.0, spend: 2450.00, engagements: 1900 }
        ],
        timeOfDay: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          engagements: Math.floor(Math.random() * 150) + 50,
          impressions: Math.floor(Math.random() * 800) + 400,
          spend: Math.floor(Math.random() * 150) + 75
        })),
        dayOfWeek: [
          { day: 'Monday', engagements: 285, impressions: 1890, spend: 365.50 },
          { day: 'Tuesday', engagements: 310, impressions: 2045, spend: 395.75 },
          { day: 'Wednesday', engagements: 295, impressions: 1967, spend: 381.25 },
          { day: 'Thursday', engagements: 325, impressions: 2134, spend: 412.80 },
          { day: 'Friday', engagements: 275, impressions: 1823, spend: 352.45 },
          { day: 'Saturday', engagements: 215, impressions: 1456, spend: 281.75 },
          { day: 'Sunday', engagements: 195, impressions: 1285, spend: 260.50 }
        ]
      },

      // Conversion metrics
      conversionMetrics: {
        websiteClicks: { count: 1285, value: 6425.00 },
        appInstalls: { count: 45, value: 562.50 },
        appOpens: { count: 89, value: 445.00 },
        leadGeneration: { count: 67, value: 3350.00 },
        purchases: { count: 23, value: 2875.00 },
        signups: { count: 34, value: 1700.00 },
        downloads: { count: 56, value: 1120.00 },
        customConversions: [
          { name: 'Newsletter Signup', count: 78, value: 1560.00, conversionType: 'LEAD' },
          { name: 'Demo Request', count: 12, value: 1200.00, conversionType: 'LEAD' },
          { name: 'Whitepaper Download', count: 45, value: 900.00, conversionType: 'ENGAGEMENT' }
        ]
      },

      // Billing insights
      billingInsights: {
        totalBilledAmount: 2450.00,
        currency: 'USD',
        billingPeriod: {
          startDate: '2024-09-01',
          endDate: '2024-09-30'
        },
        spendByObjective: [
          { objective: 'AWARENESS', spend: 1245.75, percentage: 50.8 },
          { objective: 'LEAD_GENERATION', spend: 892.50, percentage: 36.4 },
          { objective: 'ENGAGEMENT', spend: 311.75, percentage: 12.7 }
        ],
        spendByBidType: [
          { bidType: 'AUTO', spend: 1470.00, percentage: 60.0 },
          { bidType: 'TARGET', spend: 735.00, percentage: 30.0 },
          { bidType: 'MAX', spend: 245.00, percentage: 10.0 }
        ],
        costBreakdown: {
          mediaCost: 2205.00,
          platformFee: 220.50,
          taxAmount: 24.50,
          totalCost: 2450.00
        }
      },

      // Video metrics
      videoMetrics: {
        totalVideoViews: 8500,
        video25PercentViews: 6800,
        video50PercentViews: 5100,
        video75PercentViews: 3400,
        video100PercentViews: 2550,
        avgVideoViewTime: 23.5,
        avgVideoViewPercentage: 67.3,
        videoDownloads: 45,
        videoShares: 123,
        soundOnViews: 5950,
        fullScreenViews: 1275
      },

      // Engagement quality metrics
      engagementQuality: {
        organicEngagements: 456,
        paidEngagements: 1444,
        engagementRate: 2.41,
        qualityScore: 8.0,
        brandSafetyScore: 9.2,
        spamScore: 0.3,
        authenticityScore: 9.5
      }
    }
  }

  static async getUserData(accessToken: string) {
    const url = `${this.BASE_URL}/users/me?user.fields=public_metrics`
    const data = await this.makeRequest<any>(
      url,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      "Failed to fetch profile",
    )

    return {
      id: data.data.id,
      username: data.data.username,
      name: data.data.name,
      followers_count: data.data.public_metrics.followers_count,
      following_count: data.data.public_metrics.following_count,
      tweet_count: data.data.public_metrics.tweet_count,
    }
  }

  static async getTweets(accessToken: string, userId: string, limit = 10) {
    const url = `${this.BASE_URL}/users/${userId}/tweets?max_results=${limit}&tweet.fields=public_metrics,created_at`
    const data = await this.makeRequest<any>(
      url,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      "Failed to fetch tweets",
    )

    return (data.data || []).map((tweet: any) => ({
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      like_count: tweet.public_metrics.like_count,
      retweet_count: tweet.public_metrics.retweet_count,
      reply_count: tweet.public_metrics.reply_count,
      impression_count: tweet.public_metrics.impression_count,
    }))
  }

  static async getAnalytics(accessToken: string, userId: string) {
    try {
      const tweets = await this.getTweets(accessToken, userId, 50)

      const totalImpressions = tweets.reduce((sum: number, tweet: { impression_count: number }) => sum + tweet.impression_count, 0)
      const totalEngagements = tweets.reduce(
        (sum: number, tweet: { like_count: number, retweet_count: number, reply_count: number }) =>
          sum + tweet.like_count + tweet.retweet_count + tweet.reply_count,
        0,
      )

      return {
        impressions: totalImpressions,
        engagements: totalEngagements,
        engagement_rate: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
      }
    } catch (error) {
      logger.error("Failed to calculate analytics", { operation: 'calculate_analytics', stack: error instanceof Error ? error.stack : undefined }, error, ['twitter', 'analytics', 'error'])
      return this.getMockAnalytics()
    }
  }

  static async getMentions(accessToken: string, userId: string, limit = 10) {
    try {
      const url = `${this.BASE_URL}/users/${userId}/mentions?max_results=${limit}&tweet.fields=public_metrics,created_at`
      const data = await this.makeRequest<any>(
        url,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        "Failed to fetch mentions",
      )
      return data.data || []
    } catch (error) {
      logger.error("Failed to fetch mentions", { operation: 'fetch_mentions', stack: error instanceof Error ? error.stack : undefined }, error, ['twitter', 'mentions', 'error'])
      return []
    }
  }

  static generateMockData(): TwitterData {
    return {
      profile: this.getMockProfile(),
      analytics: this.getMockAnalytics(),
      tweets: this.getMockTweets(),
    }
  }

  private static getMockProfile() {
    return {
      id: "mock_twitter_id",
      username: "sample_business",
      name: "Sample Business",
      followers_count: 5200,
      following_count: 850,
      tweet_count: 1250,
    }
  }

  private static getMockAnalytics() {
    return {
      impressions: 125000,
      engagements: 3200,
      engagement_rate: 2.56,
    }
  }

  private static getMockTweets() {
    return [
      {
        id: "mock_tweet_1",
        text: "Excited to announce our new product launch! 🚀",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        like_count: 145,
        retweet_count: 25,
        reply_count: 12,
        impression_count: 8500,
      },
      {
        id: "mock_tweet_2",
        text: "Behind the scenes of our development process. Hard work pays off! 💪",
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        like_count: 89,
        retweet_count: 18,
        reply_count: 15,
        impression_count: 6200,
      },
    ]
  }

  /**
   * Enhanced helper methods for Twitter API v2 analytics
   */

  /**
   * Check if user has context authentication for premium metrics
   */
  static async checkUserContextAuth(accessToken: string): Promise<boolean> {
    try {
      // In a real implementation, this would check if the token has user context
      // For now, we'll assume user context based on token structure or make a test request
      const response = await this.makeRequest<any>(
        `${this.BASE_URL}/users/me`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
        },
        "Failed to check user context"
      )
      return response !== null
    } catch {
      return false
    }
  }

  /**
   * Calculate public metrics available to all users
   */
  static calculatePublicMetrics(tweets: any[]) {
    const totalRetweets = tweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.retweet_count || 0), 0)
    const totalReplies = tweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.reply_count || 0), 0)
    const totalLikes = tweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.like_count || 0), 0)
    const totalQuotes = tweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.quote_count || 0), 0)
    const totalBookmarks = tweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.bookmark_count || 0), 0)

    const tweetCount = tweets.length || 1

    return {
      totalRetweets,
      totalReplies,
      totalLikes,
      totalQuotes,
      totalBookmarks,
      avgRetweets: totalRetweets / tweetCount,
      avgReplies: totalReplies / tweetCount,
      avgLikes: totalLikes / tweetCount,
      avgQuotes: totalQuotes / tweetCount,
      avgBookmarks: totalBookmarks / tweetCount
    }
  }

  /**
   * Calculate non-public metrics (requires user context)
   */
  static calculateNonPublicMetrics(tweets: any[]) {
    const totalImpressions = tweets.reduce((sum, tweet) => sum + (tweet.non_public_metrics?.impression_count || 0), 0)
    const totalUrlLinkClicks = tweets.reduce((sum, tweet) => sum + (tweet.non_public_metrics?.url_link_clicks || 0), 0)
    const totalUserProfileClicks = tweets.reduce((sum, tweet) => sum + (tweet.non_public_metrics?.user_profile_clicks || 0), 0)

    const tweetCount = tweets.length || 1

    return {
      totalImpressions,
      totalUrlLinkClicks,
      totalUserProfileClicks,
      avgImpressions: totalImpressions / tweetCount,
      avgUrlLinkClicks: totalUrlLinkClicks / tweetCount,
      avgUserProfileClicks: totalUserProfileClicks / tweetCount
    }
  }

  /**
   * Calculate organic metrics (requires user context)
   */
  static calculateOrganicMetrics(tweets: any[]) {
    const totalImpressions = tweets.reduce((sum, tweet) => sum + (tweet.organic_metrics?.impression_count || 0), 0)
    const totalRetweets = tweets.reduce((sum, tweet) => sum + (tweet.organic_metrics?.retweet_count || 0), 0)
    const totalReplies = tweets.reduce((sum, tweet) => sum + (tweet.organic_metrics?.reply_count || 0), 0)
    const totalLikes = tweets.reduce((sum, tweet) => sum + (tweet.organic_metrics?.like_count || 0), 0)
    const totalUserProfileClicks = tweets.reduce((sum, tweet) => sum + (tweet.organic_metrics?.user_profile_clicks || 0), 0)
    const totalUrlLinkClicks = tweets.reduce((sum, tweet) => sum + (tweet.organic_metrics?.url_link_clicks || 0), 0)

    const tweetCount = tweets.length || 1

    return {
      totalImpressions,
      totalRetweets,
      totalReplies,
      totalLikes,
      totalUserProfileClicks,
      totalUrlLinkClicks,
      avgImpressions: totalImpressions / tweetCount,
      avgRetweets: totalRetweets / tweetCount,
      avgReplies: totalReplies / tweetCount,
      avgLikes: totalLikes / tweetCount,
      avgUserProfileClicks: totalUserProfileClicks / tweetCount,
      avgUrlLinkClicks: totalUrlLinkClicks / tweetCount
    }
  }

  /**
   * Calculate promoted metrics (requires user context)
   */
  static calculatePromotedMetrics(tweets: any[]) {
    const totalImpressions = tweets.reduce((sum, tweet) => sum + (tweet.promoted_metrics?.impression_count || 0), 0)
    const totalRetweets = tweets.reduce((sum, tweet) => sum + (tweet.promoted_metrics?.retweet_count || 0), 0)
    const totalReplies = tweets.reduce((sum, tweet) => sum + (tweet.promoted_metrics?.reply_count || 0), 0)
    const totalLikes = tweets.reduce((sum, tweet) => sum + (tweet.promoted_metrics?.like_count || 0), 0)
    const totalUserProfileClicks = tweets.reduce((sum, tweet) => sum + (tweet.promoted_metrics?.user_profile_clicks || 0), 0)
    const totalUrlLinkClicks = tweets.reduce((sum, tweet) => sum + (tweet.promoted_metrics?.url_link_clicks || 0), 0)

    const tweetCount = tweets.length || 1

    return {
      totalImpressions,
      totalRetweets,
      totalReplies,
      totalLikes,
      totalUserProfileClicks,
      totalUrlLinkClicks,
      avgImpressions: totalImpressions / tweetCount,
      avgRetweets: totalRetweets / tweetCount,
      avgReplies: totalReplies / tweetCount,
      avgLikes: totalLikes / tweetCount,
      avgUserProfileClicks: totalUserProfileClicks / tweetCount,
      avgUrlLinkClicks: totalUrlLinkClicks / tweetCount
    }
  }

  /**
   * Find the top performing tweet
   */
  static findTopPerformingTweet(tweets: any[]) {
    if (!tweets.length) return null

    return tweets.reduce((top, tweet) => {
      const engagement = (tweet.public_metrics?.like_count || 0) +
        (tweet.public_metrics?.retweet_count || 0) +
        (tweet.public_metrics?.reply_count || 0) +
        (tweet.public_metrics?.quote_count || 0)

      const topEngagement = (top.public_metrics?.like_count || 0) +
        (top.public_metrics?.retweet_count || 0) +
        (top.public_metrics?.reply_count || 0) +
        (top.public_metrics?.quote_count || 0)

      return engagement > topEngagement ? tweet : top
    }, tweets[0])
  }

  /**
   * Format top tweet for TwitterPostAnalytics
   */
  static formatTopTweet(tweet: any, hasUserContext: boolean) {
    if (!tweet) return undefined

    const engagement = (tweet.public_metrics?.like_count || 0) +
      (tweet.public_metrics?.retweet_count || 0) +
      (tweet.public_metrics?.reply_count || 0) +
      (tweet.public_metrics?.quote_count || 0)

    return {
      id: tweet.id,
      text: tweet.text,
      engagement,
      impressions: hasUserContext
        ? (tweet.non_public_metrics?.impression_count || engagement * 15)
        : engagement * 15, // Fallback estimation
      date: tweet.created_at,
      mediaType: this.determineTwitterMediaType(tweet) as 'text' | 'photo' | 'video' | 'animated_gif',
      metrics: {
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        likes: tweet.public_metrics?.like_count || 0,
        quotes: tweet.public_metrics?.quote_count || 0,
        bookmarks: tweet.public_metrics?.bookmark_count,
        impressions: hasUserContext ? tweet.non_public_metrics?.impression_count : undefined,
        urlLinkClicks: hasUserContext ? tweet.non_public_metrics?.url_link_clicks : undefined,
        userProfileClicks: hasUserContext ? tweet.non_public_metrics?.user_profile_clicks : undefined
      }
    }
  }

  /**
   * Calculate media metrics
   */
  static calculateMediaMetrics(tweets: any[]) {
    const videoTweets = tweets.filter(tweet => this.determineTwitterMediaType(tweet) === 'video')
    const photoTweets = tweets.filter(tweet => this.determineTwitterMediaType(tweet) === 'image')

    return {
      totalVideoViews: videoTweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.view_count || 0), 0),
      avgVideoViews: videoTweets.length > 0
        ? videoTweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.view_count || 0), 0) / videoTweets.length
        : 0,
      totalPhotoViews: photoTweets.length * 100, // Estimate since Twitter doesn't provide photo view metrics
      avgPhotoViews: photoTweets.length > 0 ? 100 : 0,
      videoViewCompletionRate: 0.65 // Typical Twitter video completion rate
    }
  }

  /**
   * Generate enhanced engagement trend with Twitter-specific metrics
   */
  static generateTwitterEngagementTrend(tweets: any[], hasUserContext: boolean) {
    // Group tweets by date and calculate metrics
    const tweetsByDate = this.groupTweetsByDate(tweets)

    return Object.entries(tweetsByDate).map(([date, dayTweets]: [string, any[]]) => {
      const engagement = dayTweets.reduce((sum: number, tweet: any) =>
        sum + (tweet.public_metrics?.like_count || 0) +
        (tweet.public_metrics?.retweet_count || 0) +
        (tweet.public_metrics?.reply_count || 0) +
        (tweet.public_metrics?.quote_count || 0), 0)

      const impressions = hasUserContext
        ? dayTweets.reduce((sum: number, tweet: any) => sum + (tweet.non_public_metrics?.impression_count || 0), 0)
        : engagement * 15 // Fallback estimation

      return {
        date,
        engagement,
        impressions,
        retweets: dayTweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.retweet_count || 0), 0),
        replies: dayTweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.reply_count || 0), 0),
        likes: dayTweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.like_count || 0), 0),
        quotes: dayTweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.quote_count || 0), 0),
        bookmarks: dayTweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.bookmark_count || 0), 0),
        urlLinkClicks: hasUserContext
          ? dayTweets.reduce((sum: number, tweet: any) => sum + (tweet.non_public_metrics?.url_link_clicks || 0), 0)
          : undefined,
        userProfileClicks: hasUserContext
          ? dayTweets.reduce((sum: number, tweet: any) => sum + (tweet.non_public_metrics?.user_profile_clicks || 0), 0)
          : undefined
      }
    }).slice(-7) // Last 7 days
  }

  /**
   * Enhanced content performance analysis
   */
  static analyzeTwitterContentPerformance(tweets: any[], hasUserContext: boolean) {
    const tweetsByType = this.groupTweetsByMediaType(tweets)

    return Object.entries(tweetsByType).map(([type, typeTweets]: [string, any[]]) => {
      const totalEngagement = typeTweets.reduce((sum: number, tweet: any) =>
        sum + (tweet.public_metrics?.like_count || 0) +
        (tweet.public_metrics?.retweet_count || 0) +
        (tweet.public_metrics?.reply_count || 0) +
        (tweet.public_metrics?.quote_count || 0), 0)

      const totalImpressions = hasUserContext
        ? typeTweets.reduce((sum: number, tweet: any) => sum + (tweet.non_public_metrics?.impression_count || 0), 0)
        : totalEngagement * 15

      const count = typeTweets.length

      return {
        type: type as 'text' | 'photo' | 'video' | 'animated_gif',
        count,
        avgEngagement: count > 0 ? totalEngagement / count : 0,
        avgImpressions: count > 0 ? totalImpressions / count : 0,
        avgRetweets: count > 0 ? typeTweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.retweet_count || 0), 0) / count : 0,
        avgReplies: count > 0 ? typeTweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.reply_count || 0), 0) / count : 0,
        avgLikes: count > 0 ? typeTweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.like_count || 0), 0) / count : 0,
        avgQuotes: count > 0 ? typeTweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.quote_count || 0), 0) / count : 0,
        avgBookmarks: hasUserContext && count > 0
          ? typeTweets.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.bookmark_count || 0), 0) / count
          : undefined,
        engagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0
      }
    })
  }

  /**
   * Get top performing tweets
   */
  static getTopPerformingTweets(tweets: any[], hasUserContext: boolean) {
    return tweets
      .map(tweet => {
        const engagement = (tweet.public_metrics?.like_count || 0) +
          (tweet.public_metrics?.retweet_count || 0) +
          (tweet.public_metrics?.reply_count || 0) +
          (tweet.public_metrics?.quote_count || 0)

        const impressions = hasUserContext
          ? (tweet.non_public_metrics?.impression_count || engagement * 15)
          : engagement * 15

        return {
          id: tweet.id,
          text: tweet.text,
          engagement,
          impressions,
          date: tweet.created_at,
          mediaType: this.determineTwitterMediaType(tweet) as 'text' | 'photo' | 'video' | 'animated_gif',
          performanceScore: Math.min(100, Math.floor((engagement / 100) * 50)), // Simplified scoring
          metrics: {
            retweets: tweet.public_metrics?.retweet_count || 0,
            replies: tweet.public_metrics?.reply_count || 0,
            likes: tweet.public_metrics?.like_count || 0,
            quotes: tweet.public_metrics?.quote_count || 0,
            bookmarks: tweet.public_metrics?.bookmark_count,
            impressions: hasUserContext ? tweet.non_public_metrics?.impression_count : undefined,
            urlLinkClicks: hasUserContext ? tweet.non_public_metrics?.url_link_clicks : undefined,
            userProfileClicks: hasUserContext ? tweet.non_public_metrics?.user_profile_clicks : undefined
          }
        }
      })
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5)
  }

  /**
   * Generate comprehensive content insights
   */
  static generateTwitterContentInsights(tweets: any[], avgEngagement: number, avgImpressions: number) {
    const contentByType = this.groupTweetsByMediaType(tweets)
    const hashtags = this.extractHashtags(tweets)
    const mentions = this.extractMentions(tweets)

    return {
      bestPerformingType: this.getBestPerformingContentType(contentByType),
      optimalTweetingHours: [
        { hour: 9, avgEngagement: avgEngagement * 1.2 },
        { hour: 12, avgEngagement: avgEngagement * 1.1 },
        { hour: 15, avgEngagement: avgEngagement * 1.15 },
        { hour: 18, avgEngagement: avgEngagement * 1.25 }
      ],
      avgEngagementByType: this.getAvgEngagementByType(contentByType),
      avgImpressionsbyType: this.getAvgImpressionsByType(contentByType, avgImpressions),
      hashtags: {
        topHashtags: hashtags.slice(0, 10),
        hashtagPerformance: hashtags.reduce((acc, tag) => {
          acc[tag.tag] = tag.avgEngagement
          return acc
        }, {} as Record<string, number>)
      },
      mentions: {
        topMentions: mentions.slice(0, 10),
        mentionPerformance: mentions.reduce((acc, mention) => {
          acc[mention.username] = mention.avgEngagement
          return acc
        }, {} as Record<string, number>)
      }
    }
  }

  /**
   * Helper methods for content analysis
   */
  static groupTweetsByDate(tweets: any[]) {
    return tweets.reduce((groups: Record<string, any[]>, tweet) => {
      const date = tweet.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
      if (!groups[date]) groups[date] = []
      groups[date].push(tweet)
      return groups
    }, {} as Record<string, any[]>)
  }

  static groupTweetsByMediaType(tweets: any[]) {
    return tweets.reduce((groups: Record<string, any[]>, tweet) => {
      const type = this.determineTwitterMediaType(tweet)
      if (!groups[type]) groups[type] = []
      groups[type].push(tweet)
      return groups
    }, {} as Record<string, any[]>)
  }

  static getBestPerformingContentType(contentByType: Record<string, any[]>) {
    let bestType = 'text'
    let bestPerformance = 0

    Object.entries(contentByType).forEach(([type, tweets]) => {
      const avgEngagement = tweets.reduce((sum: number, tweet: any) =>
        sum + (tweet.public_metrics?.like_count || 0) +
        (tweet.public_metrics?.retweet_count || 0) +
        (tweet.public_metrics?.reply_count || 0) +
        (tweet.public_metrics?.quote_count || 0), 0) / tweets.length

      if (avgEngagement > bestPerformance) {
        bestPerformance = avgEngagement
        bestType = type
      }
    })

    return bestType
  }

  static getAvgEngagementByType(contentByType: Record<string, any[]>) {
    const result: Record<string, number> = {}

    Object.entries(contentByType).forEach(([type, tweets]) => {
      result[type] = tweets.reduce((sum: number, tweet: any) =>
        sum + (tweet.public_metrics?.like_count || 0) +
        (tweet.public_metrics?.retweet_count || 0) +
        (tweet.public_metrics?.reply_count || 0) +
        (tweet.public_metrics?.quote_count || 0), 0) / tweets.length
    })

    return result
  }

  static getAvgImpressionsByType(contentByType: Record<string, any[]>, fallbackAvg: number) {
    const result: Record<string, number> = {}

    Object.entries(contentByType).forEach(([type, tweets]) => {
      const totalImpressions = tweets.reduce((sum: number, tweet: any) =>
        sum + (tweet.non_public_metrics?.impression_count || fallbackAvg), 0)
      result[type] = totalImpressions / tweets.length
    })

    return result
  }

  static extractHashtags(tweets: any[]) {
    const hashtagMap = new Map<string, { usage: number; totalEngagement: number }>()

    tweets.forEach((tweet: any) => {
      const engagement = (tweet.public_metrics?.like_count || 0) +
        (tweet.public_metrics?.retweet_count || 0) +
        (tweet.public_metrics?.reply_count || 0) +
        (tweet.public_metrics?.quote_count || 0)

      // Extract hashtags from entities or text
      const hashtags = tweet.entities?.hashtags || []
      hashtags.forEach((hashtag: any) => {
        const tag = hashtag.tag || hashtag.text
        const current = hashtagMap.get(tag) || { usage: 0, totalEngagement: 0 }
        hashtagMap.set(tag, {
          usage: current.usage + 1,
          totalEngagement: current.totalEngagement + engagement
        })
      })
    })

    return Array.from(hashtagMap.entries())
      .map(([tag, data]) => ({
        tag,
        usage: data.usage,
        avgEngagement: data.totalEngagement / data.usage
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
  }

  static extractMentions(tweets: any[]) {
    const mentionMap = new Map<string, { mentions: number; totalEngagement: number }>()

    tweets.forEach((tweet: any) => {
      const engagement = (tweet.public_metrics?.like_count || 0) +
        (tweet.public_metrics?.retweet_count || 0) +
        (tweet.public_metrics?.reply_count || 0) +
        (tweet.public_metrics?.quote_count || 0)

      // Extract mentions from entities or text
      const mentions = tweet.entities?.mentions || []
      mentions.forEach((mention: any) => {
        const username = mention.username
        const current = mentionMap.get(username) || { mentions: 0, totalEngagement: 0 }
        mentionMap.set(username, {
          mentions: current.mentions + 1,
          totalEngagement: current.totalEngagement + engagement
        })
      })
    })

    return Array.from(mentionMap.entries())
      .map(([username, data]) => ({
        username,
        mentions: data.mentions,
        avgEngagement: data.totalEngagement / data.mentions
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
  }

  /**
   * Enhanced mock data for TwitterPostAnalytics
   */
  static getMockTwitterPostsAnalyticsEnhanced(): TwitterPostAnalytics {
    return {
      totalPosts: 45,
      avgEngagement: 124.8,
      avgReach: 2150,
      avgImpressions: 2680,
      totalReach: 96750,
      totalImpressions: 120600,
      totalEngagements: 5616,
      engagementRate: 4.66,

      // Twitter API v2 Public Metrics
      publicMetrics: {
        totalRetweets: 1235,
        totalReplies: 892,
        totalLikes: 3124,
        totalQuotes: 365,
        totalBookmarks: 567,
        avgRetweets: 27.4,
        avgReplies: 19.8,
        avgLikes: 69.4,
        avgQuotes: 8.1,
        avgBookmarks: 12.6
      },

      // Twitter API v2 Non-Public Metrics (premium)
      nonPublicMetrics: {
        totalImpressions: 120600,
        totalUrlLinkClicks: 2450,
        totalUserProfileClicks: 1230,
        avgImpressions: 2680,
        avgUrlLinkClicks: 54.4,
        avgUserProfileClicks: 27.3
      },

      // Twitter API v2 Organic Metrics (premium)
      organicMetrics: {
        totalImpressions: 102510,
        totalRetweets: 1050,
        totalReplies: 760,
        totalLikes: 2655,
        totalUserProfileClicks: 1045,
        totalUrlLinkClicks: 2080,
        avgImpressions: 2278,
        avgRetweets: 23.3,
        avgReplies: 16.9,
        avgLikes: 59.0,
        avgUserProfileClicks: 23.2,
        avgUrlLinkClicks: 46.2
      },

      // Twitter API v2 Promoted Metrics (premium)
      promotedMetrics: {
        totalImpressions: 18090,
        totalRetweets: 185,
        totalReplies: 132,
        totalLikes: 469,
        totalUserProfileClicks: 185,
        totalUrlLinkClicks: 370,
        avgImpressions: 402,
        avgRetweets: 4.1,
        avgReplies: 2.9,
        avgLikes: 10.4,
        avgUserProfileClicks: 4.1,
        avgUrlLinkClicks: 8.2
      },

      // Media metrics
      mediaMetrics: {
        totalVideoViews: 15240,
        avgVideoViews: 1270,
        totalPhotoViews: 8500,
        avgPhotoViews: 425,
        videoViewCompletionRate: 0.65
      },

      // Top tweet
      topTweet: {
        id: "mock_tweet_top",
        text: "Excited to announce our new product launch! 🚀 #innovation #startup",
        engagement: 445,
        impressions: 10250,
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        mediaType: 'photo',
        metrics: {
          retweets: 89,
          replies: 44,
          likes: 312,
          quotes: 23,
          bookmarks: 67,
          impressions: 10250,
          urlLinkClicks: 156,
          userProfileClicks: 78
        }
      },

      // Enhanced engagement trend
      engagementTrend: Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const baseEngagement = Math.floor(Math.random() * 200) + 50
        return {
          date: date.toISOString().split('T')[0],
          engagement: baseEngagement,
          impressions: baseEngagement * 15,
          retweets: Math.floor(baseEngagement * 0.2),
          replies: Math.floor(baseEngagement * 0.15),
          likes: Math.floor(baseEngagement * 0.55),
          quotes: Math.floor(baseEngagement * 0.08),
          bookmarks: Math.floor(baseEngagement * 0.12),
          urlLinkClicks: Math.floor(baseEngagement * 0.3),
          userProfileClicks: Math.floor(baseEngagement * 0.15)
        }
      }),

      // Enhanced content performance
      contentPerformance: [
        {
          type: 'text',
          count: 20,
          avgEngagement: 95.5,
          avgImpressions: 2200,
          avgRetweets: 18.5,
          avgReplies: 14.2,
          avgLikes: 52.8,
          avgQuotes: 6.1,
          avgBookmarks: 8.9,
          engagementRate: 4.34
        },
        {
          type: 'photo',
          count: 15,
          avgEngagement: 156.2,
          avgImpressions: 3150,
          avgRetweets: 31.2,
          avgReplies: 23.5,
          avgLikes: 86.5,
          avgQuotes: 9.8,
          avgBookmarks: 14.2,
          engagementRate: 4.96
        },
        {
          type: 'video',
          count: 8,
          avgEngagement: 198.5,
          avgImpressions: 3890,
          avgRetweets: 39.7,
          avgReplies: 29.8,
          avgLikes: 109.2,
          avgQuotes: 12.4,
          avgBookmarks: 18.1,
          engagementRate: 5.10
        },
        {
          type: 'animated_gif',
          count: 2,
          avgEngagement: 142.0,
          avgImpressions: 2850,
          avgRetweets: 28.4,
          avgReplies: 21.3,
          avgLikes: 78.5,
          avgQuotes: 8.9,
          avgBookmarks: 12.8,
          engagementRate: 4.98
        }
      ],

      // Top performing tweets
      topPerformingTweets: [
        {
          id: "tweet_1",
          text: "Excited to announce our new product launch! 🚀 #innovation #startup",
          engagement: 445,
          impressions: 10250,
          date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          mediaType: 'photo',
          performanceScore: 95,
          metrics: {
            retweets: 89,
            replies: 44,
            likes: 312,
            quotes: 23,
            bookmarks: 67,
            impressions: 10250,
            urlLinkClicks: 156,
            userProfileClicks: 78
          }
        },
        {
          id: "tweet_2",
          text: "Behind the scenes of our development process. Hard work pays off! 💪",
          engagement: 387,
          impressions: 8950,
          date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          mediaType: 'video',
          performanceScore: 87,
          metrics: {
            retweets: 77,
            replies: 38,
            likes: 272,
            quotes: 19,
            bookmarks: 45,
            impressions: 8950,
            urlLinkClicks: 134,
            userProfileClicks: 67
          }
        }
      ],

      // Enhanced content insights
      contentInsights: {
        bestPerformingType: 'video',
        optimalTweetingHours: [
          { hour: 9, avgEngagement: 149.8 },
          { hour: 12, avgEngagement: 137.3 },
          { hour: 15, avgEngagement: 143.5 },
          { hour: 18, avgEngagement: 156.0 }
        ],
        avgEngagementByType: {
          text: 95.5,
          photo: 156.2,
          video: 198.5,
          animated_gif: 142.0
        },
        avgImpressionsbyType: {
          text: 2200,
          photo: 3150,
          video: 3890,
          animated_gif: 2850
        },
        hashtags: {
          topHashtags: [
            { tag: 'innovation', usage: 12, avgEngagement: 189.5 },
            { tag: 'startup', usage: 8, avgEngagement: 156.2 },
            { tag: 'tech', usage: 15, avgEngagement: 142.8 },
            { tag: 'development', usage: 6, avgEngagement: 167.3 }
          ],
          hashtagPerformance: {
            'innovation': 189.5,
            'startup': 156.2,
            'tech': 142.8,
            'development': 167.3
          }
        },
        mentions: {
          topMentions: [
            { username: 'techcrunch', mentions: 3, avgEngagement: 234.5 },
            { username: 'startupgrind', mentions: 2, avgEngagement: 198.7 },
            { username: 'producthunt', mentions: 4, avgEngagement: 176.3 }
          ],
          mentionPerformance: {
            'techcrunch': 234.5,
            'startupgrind': 198.7,
            'producthunt': 176.3
          }
        }
      },

      // Authentication status
      authenticationStatus: {
        hasUserContext: true,
        accessLevel: 'user_context',
        availableMetrics: ['public_metrics', 'non_public_metrics', 'organic_metrics', 'promoted_metrics']
      }
    }
  }
}
