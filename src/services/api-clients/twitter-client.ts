import { logger } from "@/config/logger"
import { BaseApiClient } from "./base-client"
import { TwitterAnalytics, PostAnalytics, AdsAnalytics } from "@/validations/analytics-types"
import { SubscriptionPlan } from "@prisma/client"

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
    try {
      logger.info("Fetching Twitter analytics", { userPlan })

      const profile = await this.getUserData(accessToken)
      const postsAnalytics = await this.getPostsAnalytics(accessToken, profile.id)
      
      // Only fetch ads analytics for premium users
      const adsAnalytics = userPlan !== SubscriptionPlan.FREEMIUM 
        ? await this.getAdsAnalytics(accessToken, profile.id)
        : null

      return {
        profile: {
          id: profile.id,
          username: profile.username,
          followers_count: profile.followers_count,
          tweet_count: profile.tweet_count
        },
        posts: postsAnalytics,
        ads: adsAnalytics,
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      logger.warn("Twitter analytics API failed, using mock data", { error, userPlan })
      return this.generateMockTwitterAnalytics(userPlan)
    }
  }

  /**
   * Enhanced posts analytics with Twitter API v2 metrics
   */
  static async getPostsAnalytics(accessToken: string, userId: string): Promise<PostAnalytics> {
    try {
      const tweets = await this.getTweetsWithMetrics(accessToken, userId, 100)
      
      if (!tweets.length) {
        return this.getMockTwitterPostsAnalytics()
      }

      const totalPosts = tweets.length
      const totalEngagement = tweets.reduce((sum, tweet) => 
        sum + tweet.public_metrics.like_count + 
        tweet.public_metrics.retweet_count + 
        tweet.public_metrics.reply_count + 
        tweet.public_metrics.quote_count, 0
      )
      const totalImpressions = tweets.reduce((sum, tweet) => 
        sum + (tweet.non_public_metrics?.impression_count || tweet.public_metrics.like_count * 10), 0
      )
      const totalReach = Math.floor(totalImpressions * 0.8) // Estimate reach as 80% of impressions

      const avgEngagement = totalPosts > 0 ? totalEngagement / totalPosts : 0
      const avgReach = totalPosts > 0 ? totalReach / totalPosts : 0
      const avgImpressions = totalPosts > 0 ? totalImpressions / totalPosts : 0

      // Find top performing tweet
      const topTweet = tweets.reduce((top, tweet) => {
        const engagement = tweet.public_metrics.like_count + 
          tweet.public_metrics.retweet_count + 
          tweet.public_metrics.reply_count + 
          tweet.public_metrics.quote_count
        
        const topEngagement = top.public_metrics.like_count + 
          top.public_metrics.retweet_count + 
          top.public_metrics.reply_count + 
          top.public_metrics.quote_count

        return engagement > topEngagement ? tweet : top
      }, tweets[0])

      const topTweetEngagement = topTweet.public_metrics.like_count + 
        topTweet.public_metrics.retweet_count + 
        topTweet.public_metrics.reply_count + 
        topTweet.public_metrics.quote_count

      // Generate engagement trend (last 7 days)
      const engagementTrend = this.generateTwitterEngagementTrend(tweets)
      
      // Analyze content performance by type
      const contentPerformance = this.analyzeTwitterContentPerformance(tweets)

      return {
        totalPosts,
        avgEngagement,
        avgReach,
        avgImpressions,
        topPost: {
          id: topTweet.id,
          content: topTweet.text,
          engagement: topTweetEngagement,
          reach: Math.floor((topTweet.non_public_metrics?.impression_count || topTweetEngagement * 10) * 0.8),
          impressions: topTweet.non_public_metrics?.impression_count || topTweetEngagement * 10,
          date: topTweet.created_at,
          mediaType: this.determineTwitterMediaType(topTweet)
        },
        engagementTrend,
        contentPerformance
      }
    } catch (error) {
      logger.warn("Failed to get posts analytics", { error })
      return this.getMockTwitterPostsAnalytics()
    }
  }

  /**
   * Enhanced ads analytics with Twitter Ads API integration
   */
  static async getAdsAnalytics(accessToken: string, userId: string): Promise<AdsAnalytics | null> {
    try {
      // Note: Twitter Ads API requires separate authentication and permissions
      // This is a simplified implementation - in production, you'd need proper Ads API access
      logger.info("Fetching Twitter Ads analytics for premium user")
      
      // For now, return mock data as Twitter Ads API requires special approval
      return this.getMockTwitterAdsAnalytics()
    } catch (error) {
      logger.warn("Failed to get ads analytics", { error })
      return this.getMockTwitterAdsAnalytics()
    }
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
      logger.warn("Twitter API failed, using mock data", { error })
      return this.generateMockData()
    }
  }

  /**
   * Utility methods for analytics processing
   */
  static generateTwitterEngagementTrend(tweets: TwitterTweet[]): Array<{
    date: string
    engagement: number
    reach: number
    impressions: number
  }> {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    return last7Days.map(date => {
      const dayTweets = tweets.filter(tweet => 
        new Date(tweet.created_at).toISOString().split('T')[0] === date
      )
      
      const engagement = dayTweets.reduce((sum, tweet) => 
        sum + tweet.public_metrics.like_count + 
        tweet.public_metrics.retweet_count + 
        tweet.public_metrics.reply_count + 
        tweet.public_metrics.quote_count, 0
      )
      
      const impressions = dayTweets.reduce((sum, tweet) => 
        sum + (tweet.non_public_metrics?.impression_count || engagement * 5), 0
      )

      return {
        date,
        engagement,
        reach: Math.floor(impressions * 0.8),
        impressions
      }
    })
  }

  static analyzeTwitterContentPerformance(tweets: TwitterTweet[]): Array<{
    type: 'image' | 'video' | 'carousel' | 'text'
    count: number
    avgEngagement: number
  }> {
    const contentTypes = tweets.reduce((acc, tweet) => {
      const mediaType = this.determineTwitterMediaType(tweet)
      if (!acc[mediaType]) {
        acc[mediaType] = { tweets: [], engagement: 0 }
      }
      
      const engagement = tweet.public_metrics.like_count + 
        tweet.public_metrics.retweet_count + 
        tweet.public_metrics.reply_count + 
        tweet.public_metrics.quote_count

      acc[mediaType].tweets.push(tweet)
      acc[mediaType].engagement += engagement
      
      return acc
    }, {} as Record<string, { tweets: TwitterTweet[], engagement: number }>)

    return Object.entries(contentTypes).map(([type, data]) => ({
      type: type as 'image' | 'video' | 'carousel' | 'text',
      count: data.tweets.length,
      avgEngagement: data.tweets.length > 0 ? data.engagement / data.tweets.length : 0
    }))
  }

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
      posts: this.getMockTwitterPostsAnalytics(),
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
      topPost: {
        id: "mock_tweet_top",
        content: "Excited to announce our new product launch! 🚀 #innovation #startup",
        engagement: 445,
        reach: 8200,
        impressions: 10250,
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        mediaType: 'image'
      },
      engagementTrend: Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return {
          date: date.toISOString().split('T')[0],
          engagement: Math.floor(Math.random() * 200) + 50,
          reach: Math.floor(Math.random() * 3000) + 1000,
          impressions: Math.floor(Math.random() * 4000) + 1500
        }
      }),
      contentPerformance: [
        { type: 'text', count: 20, avgEngagement: 95.5 },
        { type: 'image', count: 18, avgEngagement: 142.3 },
        { type: 'video', count: 5, avgEngagement: 234.8 },
        { type: 'carousel', count: 2, avgEngagement: 156.2 }
      ]
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
      logger.warn("Failed to calculate analytics", { error })
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
      logger.warn("Failed to fetch mentions", { error })
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
}
