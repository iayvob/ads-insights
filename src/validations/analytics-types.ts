// Analytics data types for posts and ads insights

export interface PostAnalytics {
  totalPosts: number
  avgEngagement: number
  avgReach: number
  avgImpressions: number
  topPost?: {
    id: string
    content: string
    engagement: number
    reach: number
    impressions: number
    date: string
    mediaType?: 'image' | 'video' | 'carousel' | 'text'
  }
  engagementTrend: Array<{
    date: string
    engagement: number
    reach: number
    impressions: number
  }>
  contentPerformance: Array<{
    type: 'image' | 'video' | 'carousel' | 'text'
    count: number
    avgEngagement: number
  }>
}

export interface AdsAnalytics {
  totalSpend: number
  totalReach: number
  totalImpressions: number
  totalClicks: number
  cpm: number // Cost per mille (thousand impressions)
  cpc: number // Cost per click
  ctr: number // Click-through rate
  roas: number // Return on ad spend
  topAd?: {
    id: string
    name: string
    spend: number
    reach: number
    impressions: number
    clicks: number
    ctr: number
    date: string
  }
  spendTrend: Array<{
    date: string
    spend: number
    reach: number
    impressions: number
    clicks: number
  }>
  audienceInsights: {
    ageGroups: Array<{ range: string; percentage: number }>
    genders: Array<{ gender: string; percentage: number }>
    topLocations: Array<{ location: string; percentage: number }>
  }
}

export interface PlatformAnalytics {
  posts: PostAnalytics
  ads: AdsAnalytics | null // null for free users
  lastUpdated: string
}

export interface FacebookAnalytics extends PlatformAnalytics {
  pageData?: {
    id: string
    name: string
    fan_count: number
    checkins: number
  }
}

export interface InstagramAnalytics extends PlatformAnalytics {
  profile?: {
    id: string
    username: string
    followers_count: number
    media_count: number
  }
}

export interface TwitterAnalytics extends PlatformAnalytics {
  profile?: {
    id: string
    username: string
    followers_count: number
    tweet_count: number
  }
}

export interface TikTokAnalytics extends PlatformAnalytics {
  profile?: {
    id: string
    username: string
    followers_count: number
    video_count: number
    likes_count: number
  }
}

export interface AmazonAnalytics extends PlatformAnalytics {
  profile?: {
    id: string
    name: string
    marketplace?: string
    seller_id?: string
  }
}

export type AnalyticsType = 'posts' | 'ads'
export type PlatformType = 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'amazon'
