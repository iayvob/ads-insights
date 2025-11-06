import {
  PostAnalytics,
  AdsAnalytics,
  FacebookAnalytics,
  InstagramAnalytics,
  TwitterAnalytics,
  TikTokAnalytics,
  AmazonAnalytics
} from "@/validations/analytics-types"
import { FacebookData } from "./api-clients/facebook-client"
import { InstagramData } from "./api-clients/instagram-client"
import { TwitterData } from "./api-clients/twitter-client"
import { TikTokData } from "./api-clients/tiktok-client"
import { logger } from "@/config/logger"

/**
 * Analytics Adapter Service
 * Transforms legacy API client data into new analytics structure
 */
export class AnalyticsAdapter {

  /**
   * Transform Facebook data to new analytics format
   */
  static transformFacebookData(data: FacebookData, includeAds: boolean = false): FacebookAnalytics {
    const posts = this.transformFacebookPosts(data)
    const ads = includeAds ? this.generateMockFacebookAds() : null

    return {
      posts,
      ads,
      lastUpdated: new Date().toISOString(),
      pageData: {
        id: data.pageData.id,
        name: data.pageData.name,
        fan_count: data.pageData.fan_count,
        checkins: 0 // Not available in current API response
      }
    }
  }

  /**
   * Transform Instagram data to new analytics format
   */
  static transformInstagramData(data: InstagramData, includeAds: boolean = false): InstagramAnalytics {
    console.log('🔄 [ADAPTER] Transforming Instagram data:', {
      hasProfile: !!data.profile,
      hasPosts: !!data.posts,
      hasInsights: !!data.insights,
      hasMedia: !!data.media,
      profileUsername: data.profile?.username,
      profileFollowers: data.profile?.followers_count,
      postsKeys: data.posts ? Object.keys(data.posts) : [],
      postsData: data.posts
    })

    const posts = this.transformInstagramPosts(data)
    const ads = includeAds ? this.generateMockInstagramAds() : null

    console.log('✅ [ADAPTER] Transformed posts:', posts)

    return {
      posts,
      ads,
      lastUpdated: new Date().toISOString(),
      profile: {
        id: data.profile.id,
        username: data.profile.username,
        followers_count: data.profile.followers_count,
        media_count: data.profile.media_count
      }
    }
  }

  /**
   * Transform Twitter data to new analytics format
   */
  static transformTwitterData(data: TwitterData, includeAds: boolean = false): TwitterAnalytics {
    const posts = this.transformTwitterPosts(data)
    const ads = includeAds ? this.generateMockTwitterAds() : null

    return {
      posts,
      ads,
      lastUpdated: new Date().toISOString(),
      profile: {
        id: data.profile.id,
        username: data.profile.username,
        followers_count: data.profile.followers_count,
        tweet_count: data.profile.tweet_count
      }
    }
  }

  /**
   * Transform TikTok data to new analytics format
   */
  static transformTikTokData(data: TikTokData, includeAds: boolean = false): TikTokAnalytics {
    const posts = this.transformTikTokPosts(data)
    const ads = includeAds ? this.generateMockTikTokAds() : null

    return {
      posts,
      ads,
      lastUpdated: new Date().toISOString(),
      profile: {
        id: data.profile.open_id,
        username: data.profile.username,
        followers_count: data.profile.follower_count,
        video_count: data.profile.video_count,
        likes_count: data.profile.likes_count
      }
    }
  }

  /**
   * Transform Amazon data to new analytics format
   */
  static transformAmazonData(data: AmazonAnalytics, includeAds: boolean = false): AmazonAnalytics {
    // Amazon API client already returns the correct format, so we just pass it through
    // but ensure ads are only included for premium users
    return {
      ...data,
      ads: includeAds ? data.ads : null
    }
  }

  // Facebook post transformation
  private static transformFacebookPosts(data: FacebookData): PostAnalytics {
    const posts = data.posts || []
    const totalPosts = posts.length

    if (totalPosts === 0) {
      return this.getEmptyPostAnalytics()
    }

    // Calculate averages
    const totalEngagement = posts.reduce((sum, post) =>
      sum + (post.likes || 0) + (post.comments || 0) + (post.shares || 0), 0)
    const avgEngagement = totalEngagement / totalPosts

    // Use insights data for reach and impressions
    const avgReach = data.insights.reach / Math.max(totalPosts, 1)
    const avgImpressions = data.insights.impressions / Math.max(totalPosts, 1)

    // Find top post
    const topPost = posts.reduce((top, post) => {
      const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0)
      const topEngagement = (top.likes || 0) + (top.comments || 0) + (top.shares || 0)
      return engagement > topEngagement ? post : top
    }, posts[0])

    // Generate trend data (last 7 days)
    const engagementTrend = this.generateTrendData(totalEngagement, data.insights.reach, data.insights.impressions)

    // Analyze content performance
    const contentPerformance = [
      { type: 'text' as const, count: posts.length, avgEngagement }
    ]

    return {
      totalPosts,
      avgEngagement,
      avgReach,
      avgImpressions,
      topPost: topPost ? {
        id: topPost.id,
        content: topPost.message || '',
        engagement: (topPost.likes || 0) + (topPost.comments || 0) + (topPost.shares || 0),
        reach: avgReach,
        impressions: avgImpressions,
        date: topPost.created_time,
        mediaType: 'text'
      } : undefined,
      engagementTrend,
      contentPerformance
    }
  }

  // Instagram post transformation
  private static transformInstagramPosts(data: InstagramData): PostAnalytics {
    const media = data.media || []
    const totalPosts = media.length

    if (totalPosts === 0) {
      return this.getEmptyPostAnalytics()
    }

    // Calculate averages
    const totalEngagement = media.reduce((sum, item) =>
      sum + (item.like_count || 0) + (item.comments_count || 0), 0)
    const avgEngagement = totalEngagement / totalPosts

    // Use insights data for reach and impressions
    const avgReach = data.insights.reach / Math.max(totalPosts, 1)
    const avgImpressions = data.insights.impressions / Math.max(totalPosts, 1)

    // Find top post
    const topPost = media.reduce((top, item) => {
      const engagement = (item.like_count || 0) + (item.comments_count || 0)
      const topEngagement = (top.like_count || 0) + (top.comments_count || 0)
      return engagement > topEngagement ? item : top
    }, media[0])

    // Generate trend data
    const engagementTrend = this.generateTrendData(totalEngagement, data.insights.reach, data.insights.impressions)

    // Analyze content performance by media type
    const contentTypes = media.reduce((acc, item) => {
      const type = item.media_type?.toLowerCase() as 'image' | 'video' | 'carousel'
      if (!acc[type]) acc[type] = { count: 0, totalEngagement: 0 }
      acc[type].count++
      acc[type].totalEngagement += (item.like_count || 0) + (item.comments_count || 0)
      return acc
    }, {} as Record<string, { count: number; totalEngagement: number }>)

    const contentPerformance = Object.entries(contentTypes).map(([type, stats]) => ({
      type: (type === 'image' ? 'image' : type === 'video' ? 'video' : 'carousel') as 'image' | 'video' | 'carousel',
      count: stats.count,
      avgEngagement: stats.totalEngagement / stats.count
    }))

    return {
      totalPosts,
      avgEngagement,
      avgReach,
      avgImpressions,
      topPost: topPost ? {
        id: topPost.id,
        content: topPost.caption || '',
        engagement: (topPost.like_count || 0) + (topPost.comments_count || 0),
        reach: avgReach,
        impressions: avgImpressions,
        date: topPost.timestamp,
        mediaType: topPost.media_type?.toLowerCase() as 'image' | 'video' | 'carousel'
      } : undefined,
      engagementTrend,
      contentPerformance
    }
  }

  // Twitter post transformation
  private static transformTwitterPosts(data: TwitterData): PostAnalytics {
    const tweets = data.tweets || []
    const totalPosts = tweets.length

    if (totalPosts === 0) {
      return this.getEmptyPostAnalytics()
    }

    // Calculate averages
    const totalEngagement = tweets.reduce((sum, tweet) =>
      sum + (tweet.like_count || 0) + (tweet.retweet_count || 0) + (tweet.reply_count || 0), 0)
    const avgEngagement = totalEngagement / totalPosts

    // Use analytics data for reach and impressions
    const avgReach = (data.analytics.impressions * 0.7) / Math.max(totalPosts, 1) // Estimate reach as 70% of impressions
    const avgImpressions = data.analytics.impressions / Math.max(totalPosts, 1)

    // Find top post
    const topPost = tweets.reduce((top, tweet) => {
      const engagement = (tweet.like_count || 0) + (tweet.retweet_count || 0) + (tweet.reply_count || 0)
      const topEngagement = (top.like_count || 0) + (top.retweet_count || 0) + (top.reply_count || 0)
      return engagement > topEngagement ? tweet : top
    }, tweets[0])

    // Generate trend data
    const engagementTrend = this.generateTrendData(totalEngagement, avgReach * totalPosts, data.analytics.impressions)

    // Twitter content is mostly text
    const contentPerformance = [
      { type: 'text' as const, count: tweets.length, avgEngagement }
    ]

    return {
      totalPosts,
      avgEngagement,
      avgReach,
      avgImpressions,
      topPost: topPost ? {
        id: topPost.id,
        content: topPost.text || '',
        engagement: (topPost.like_count || 0) + (topPost.retweet_count || 0) + (topPost.reply_count || 0),
        reach: avgReach,
        impressions: topPost.impression_count || avgImpressions,
        date: topPost.created_at,
        mediaType: 'text'
      } : undefined,
      engagementTrend,
      contentPerformance
    }
  }

  // Helper methods
  private static getEmptyPostAnalytics(): PostAnalytics {
    return {
      totalPosts: 0,
      avgEngagement: 0,
      avgReach: 0,
      avgImpressions: 0,
      engagementTrend: [],
      contentPerformance: []
    }
  }

  private static generateTrendData(totalEngagement: number, totalReach: number, totalImpressions: number) {
    // Generate mock trend data for the last 7 days
    const trends = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const variance = 0.8 + Math.random() * 0.4 // 80% to 120% variance

      trends.push({
        date: date.toISOString().split('T')[0],
        engagement: Math.round((totalEngagement / 7) * variance),
        reach: Math.round((totalReach / 7) * variance),
        impressions: Math.round((totalImpressions / 7) * variance)
      })
    }

    return trends
  }

  // Mock ads data generators (for premium features)
  private static generateMockFacebookAds(): AdsAnalytics {
    return {
      totalSpend: 1250.00,
      totalReach: 45000,
      totalImpressions: 125000,
      totalClicks: 3200,
      cpm: 10.00,
      cpc: 0.39,
      ctr: 2.56,
      roas: 4.2,
      topAd: {
        id: 'fb_ad_001',
        name: 'Product Launch Campaign',
        spend: 450.00,
        reach: 18000,
        impressions: 52000,
        clicks: 1200,
        ctr: 2.31,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      spendTrend: this.generateSpendTrend(1250),
      audienceInsights: {
        ageGroups: [
          { range: '18-24', percentage: 15 },
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 28 },
          { range: '45-54', percentage: 15 },
          { range: '55+', percentage: 7 }
        ],
        genders: [
          { gender: 'Female', percentage: 55 },
          { gender: 'Male', percentage: 45 }
        ],
        topLocations: [
          { location: 'New York, NY', percentage: 25 },
          { location: 'Los Angeles, CA', percentage: 18 },
          { location: 'Chicago, IL', percentage: 12 }
        ]
      }
    }
  }

  private static generateMockInstagramAds(): AdsAnalytics {
    return {
      totalSpend: 850.00,
      totalReach: 32000,
      totalImpressions: 89000,
      totalClicks: 2100,
      cpm: 9.55,
      cpc: 0.40,
      ctr: 2.36,
      roas: 3.8,
      topAd: {
        id: 'ig_ad_001',
        name: 'Brand Awareness Campaign',
        spend: 320.00,
        reach: 12500,
        impressions: 38000,
        clicks: 850,
        ctr: 2.24,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      spendTrend: this.generateSpendTrend(850),
      audienceInsights: {
        ageGroups: [
          { range: '18-24', percentage: 25 },
          { range: '25-34', percentage: 40 },
          { range: '35-44', percentage: 22 },
          { range: '45-54', percentage: 10 },
          { range: '55+', percentage: 3 }
        ],
        genders: [
          { gender: 'Female', percentage: 62 },
          { gender: 'Male', percentage: 38 }
        ],
        topLocations: [
          { location: 'Los Angeles, CA', percentage: 28 },
          { location: 'New York, NY', percentage: 22 },
          { location: 'Miami, FL', percentage: 15 }
        ]
      }
    }
  }

  private static generateMockTwitterAds(): AdsAnalytics {
    return {
      totalSpend: 650.00,
      totalReach: 28000,
      totalImpressions: 75000,
      totalClicks: 1800,
      cpm: 8.67,
      cpc: 0.36,
      ctr: 2.40,
      roas: 3.5,
      topAd: {
        id: 'tw_ad_001',
        name: 'Engagement Campaign',
        spend: 280.00,
        reach: 11000,
        impressions: 32000,
        clicks: 720,
        ctr: 2.25,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      spendTrend: this.generateSpendTrend(650),
      audienceInsights: {
        ageGroups: [
          { range: '18-24', percentage: 20 },
          { range: '25-34', percentage: 38 },
          { range: '35-44', percentage: 25 },
          { range: '45-54', percentage: 12 },
          { range: '55+', percentage: 5 }
        ],
        genders: [
          { gender: 'Male', percentage: 58 },
          { gender: 'Female', percentage: 42 }
        ],
        topLocations: [
          { location: 'San Francisco, CA', percentage: 24 },
          { location: 'New York, NY', percentage: 20 },
          { location: 'Austin, TX', percentage: 18 }
        ]
      }
    }
  }

  private static generateSpendTrend(totalSpend: number) {
    const trends = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const variance = 0.7 + Math.random() * 0.6 // 70% to 130% variance
      const dailySpend = (totalSpend / 7) * variance

      trends.push({
        date: date.toISOString().split('T')[0],
        spend: Math.round(dailySpend * 100) / 100,
        reach: Math.round(6000 * variance),
        impressions: Math.round(15000 * variance),
        clicks: Math.round(350 * variance)
      })
    }

    return trends
  }

  // TikTok post transformation
  private static transformTikTokPosts(data: TikTokData): PostAnalytics {
    const videos = data.videos || []
    const photos = data.photos || []
    const totalPosts = videos.length + photos.length

    if (totalPosts === 0) {
      return this.getEmptyPostAnalytics()
    }

    // Calculate averages from videos and photos
    const totalViews = [...videos, ...photos].reduce((sum, item) => sum + (item.view_count || 0), 0)
    const totalLikes = [...videos, ...photos].reduce((sum, item) => sum + (item.like_count || 0), 0)
    const totalShares = [...videos, ...photos].reduce((sum, item) => sum + (item.share_count || 0), 0)
    const totalComments = [...videos, ...photos].reduce((sum, item) => sum + (item.comment_count || 0), 0)

    const avgEngagement = (totalLikes + totalShares + totalComments) / totalPosts
    const avgReach = totalViews * 0.8 / totalPosts // Estimate reach as 80% of views
    const avgImpressions = totalViews / totalPosts

    // Find top post (video or photo with highest engagement)
    const allPosts = [
      ...videos.map(v => ({ ...v, type: 'video' as const, id: v.video_id, created_time: v.create_time })),
      ...photos.map(p => ({ ...p, type: 'image' as const, id: p.photo_id, created_time: p.create_time }))
    ]

    const topPost = allPosts.reduce((top, post) => {
      const engagement = (post.like_count || 0) + (post.share_count || 0) + (post.comment_count || 0)
      const topEngagement = (top.like_count || 0) + (top.share_count || 0) + (top.comment_count || 0)
      return engagement > topEngagement ? post : top
    }, allPosts[0])

    // Generate trend data
    const engagementTrend = this.generateTrendData(avgEngagement * totalPosts, avgReach * totalPosts, avgImpressions * totalPosts)

    // Analyze content performance
    const contentPerformance = []
    if (videos.length > 0) {
      const videoEngagement = videos.reduce((sum, video) =>
        sum + (video.like_count || 0) + (video.share_count || 0) + (video.comment_count || 0), 0) / videos.length
      contentPerformance.push({ type: 'video' as const, count: videos.length, avgEngagement: videoEngagement })
    }
    if (photos.length > 0) {
      const photoEngagement = photos.reduce((sum, photo) =>
        sum + (photo.like_count || 0) + (photo.share_count || 0) + (photo.comment_count || 0), 0) / photos.length
      contentPerformance.push({ type: 'image' as const, count: photos.length, avgEngagement: photoEngagement })
    }

    return {
      totalPosts,
      avgEngagement,
      avgReach,
      avgImpressions,
      topPost: topPost ? {
        id: topPost.id,
        content: topPost.title || topPost.description || '',
        engagement: (topPost.like_count || 0) + (topPost.share_count || 0) + (topPost.comment_count || 0),
        reach: avgReach,
        impressions: topPost.view_count || avgImpressions,
        date: new Date(topPost.created_time * 1000).toISOString(),
        mediaType: topPost.type
      } : undefined,
      engagementTrend,
      contentPerformance
    }
  }

  private static generateMockTikTokAds(): AdsAnalytics {
    return {
      totalSpend: 890.00,
      totalReach: 52000,
      totalImpressions: 145000,
      totalClicks: 2900,
      cpm: 6.14,
      cpc: 0.31,
      ctr: 2.00,
      roas: 4.1,
      topAd: {
        id: 'tt_ad_001',
        name: 'Video Creative Campaign',
        spend: 320.00,
        reach: 20000,
        impressions: 55000,
        clicks: 1100,
        ctr: 2.00,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      spendTrend: this.generateSpendTrend(890),
      audienceInsights: {
        ageGroups: [
          { range: '18-24', percentage: 45 },
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 15 },
          { range: '45-54', percentage: 4 },
          { range: '55+', percentage: 1 }
        ],
        genders: [
          { gender: 'Female', percentage: 62 },
          { gender: 'Male', percentage: 38 }
        ],
        topLocations: [
          { location: 'Los Angeles, CA', percentage: 28 },
          { location: 'Miami, FL', percentage: 22 },
          { location: 'New York, NY', percentage: 18 }
        ]
      }
    }
  }
}
