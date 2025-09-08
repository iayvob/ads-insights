import { logger } from "@/config/logger"
import { AuthError } from "@/lib/errors"
import { AmazonAnalytics, PostAnalytics, AdsAnalytics } from "@/validations/analytics-types"
import { SubscriptionPlan } from "@prisma/client"
import { env } from "@/validations/env"

// Amazon-specific interfaces based on Amazon Advertising API
export interface AmazonProfile {
  profileId: string
  countryCode: string
  currencyCode: string
  dailyBudget?: number
  timezone: string
  accountInfo?: {
    marketplaceStringId: string
    sellerStringId?: string
    type: string
    name: string
    validPaymentMethod: boolean
  }
}

export interface AmazonCampaign {
  campaignId: string
  name: string
  campaignType: 'sponsoredProducts' | 'sponsoredBrands' | 'sponsoredDisplay'
  targetingType: 'manual' | 'auto'
  state: 'enabled' | 'paused' | 'archived'
  dailyBudget?: number
  startDate: string
  endDate?: string
  bidding?: {
    strategy: string
    adjustments?: Array<{
      predicate: string
      percentage: number
    }>
  }
}

export interface AmazonProductAd {
  adId: string
  campaignId: string
  adGroupId: string
  sku: string
  asin: string
  state: 'enabled' | 'paused' | 'archived'
}

export interface AmazonApiResponse<T> {
  data: T
  nextToken?: string
  totalResults?: number
}

export interface AmazonReportData {
  date: string
  campaignId?: string
  campaignName?: string
  adGroupId?: string
  adGroupName?: string
  impressions: number
  clicks: number
  cost: number
  sales: number
  orders: number
  acos: number // Advertising Cost of Sales
  roas: number // Return on Advertising Spend
  ctr: number // Click-through rate
  cpc: number // Cost per click
  cpm: number // Cost per thousand impressions
}

interface AmazonAnalyticsOptions {
  userId: string
  hasAdsAccess: boolean
  analyticsType?: 'posts' | 'ads' | 'both'
}

export class AmazonApiClient {
  private static readonly BASE_URL = 'https://advertising-api.amazon.com'
  private static readonly API_VERSION = 'v2'
  private static readonly SP_API_BASE = 'https://sellingpartnerapi-na.amazon.com'

  /**
   * Main method to fetch analytics based on subscription level
   */
  static async fetchAnalytics(
    accessToken: string, 
    profileId: string,
    userPlan: SubscriptionPlan,
    options: AmazonAnalyticsOptions
  ): Promise<AmazonAnalytics> {
    try {
      // Get user profile first
      const profile = await this.getProfile(accessToken, profileId)
      
      // Fetch posts analytics (product listings for Amazon)
      const postsAnalytics = await this.getPostsAnalytics(accessToken, profileId)
      
      // Fetch ads analytics only for premium users
      const adsAnalytics = userPlan !== SubscriptionPlan.FREEMIUM 
        ? await this.getAdsAnalytics(accessToken, profileId)
        : null

      return {
        profile: {
          id: profile.profileId,
          name: profile.accountInfo?.name || '',
          marketplace: profile.countryCode,
          seller_id: profile.accountInfo?.sellerStringId
        },
        posts: postsAnalytics,
        ads: adsAnalytics,
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Error fetching Amazon analytics:', error)
      // Return mock data as fallback
      return this.generateMockData(userPlan, options)
    }
  }

  /**
   * Get Amazon Advertising profile
   */
  static async getProfile(accessToken: string, profileId: string): Promise<AmazonProfile> {
    try {
      const response = await fetch(`${this.BASE_URL}/${this.API_VERSION}/profiles/${profileId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Amazon-Advertising-API-ClientId': env.AMAZON_CLIENT_ID || '',
          'Amazon-Advertising-API-Scope': profileId
        }
      })

      if (!response.ok) {
        throw new Error(`Amazon profile API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('Error fetching Amazon profile:', error)
      throw new AuthError('Failed to fetch Amazon profile data')
    }
  }

  /**
   * Get posts analytics (product performance)
   */
  static async getPostsAnalytics(accessToken: string, profileId: string): Promise<PostAnalytics> {
    try {
      // For Amazon, "posts" represent product listings and their organic performance
      const [campaigns, products] = await Promise.all([
        this.getCampaigns(accessToken, profileId),
        this.getProductPerformance(accessToken, profileId)
      ])

      const processedData = this.generateAmazonProductTrend(products)
      const contentAnalysis = this.analyzeAmazonContentPerformance(products)

      return {
        totalPosts: products.length,
        avgEngagement: this.calculateAverageMetric(products, 'orders'),
        avgReach: this.calculateAverageMetric(products, 'impressions'),
        avgImpressions: this.calculateAverageMetric(products, 'impressions'),
        topPost: this.getTopPerformingProduct(products),
        engagementTrend: processedData,
        contentPerformance: contentAnalysis
      }
    } catch (error) {
      logger.error('Error fetching Amazon posts analytics:', error)
      return this.getMockAmazonPostsAnalytics()
    }
  }

  /**
   * Get ads analytics (advertising performance) - Premium only
   */
  static async getAdsAnalytics(accessToken: string, profileId: string): Promise<AdsAnalytics | null> {
    try {
      // Premium feature: Amazon Advertising API access
      if (!accessToken || !profileId) {
        return this.getMockAmazonAdsAnalytics()
      }

      return this.getMockAmazonAdsAnalytics() // Using mock data for now
    } catch (error) {
      logger.error('Error fetching Amazon ads analytics:', error)
      return this.getMockAmazonAdsAnalytics()
    }
  }

  /**
   * Get campaigns data
   */
  static async getCampaigns(accessToken: string, profileId: string): Promise<AmazonCampaign[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/${this.API_VERSION}/sp/campaigns`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Amazon-Advertising-API-ClientId': env.AMAZON_CLIENT_ID || '',
          'Amazon-Advertising-API-Scope': profileId
        }
      })

      if (!response.ok) {
        throw new Error(`Amazon campaigns API error: ${response.status}`)
      }

      const campaigns: AmazonCampaign[] = await response.json()
      return campaigns.filter(campaign => campaign.state === 'enabled')
    } catch (error) {
      logger.error('Error fetching Amazon campaigns:', error)
      return []
    }
  }

  /**
   * Get product performance data
   */
  static async getProductPerformance(accessToken: string, profileId: string): Promise<AmazonReportData[]> {
    try {
      // This would typically involve creating and downloading reports from Amazon's reporting API
      // For now, returning mock data structure
      return this.generateMockProductData()
    } catch (error) {
      logger.error('Error fetching Amazon product performance:', error)
      return this.generateMockProductData()
    }
  }

  /**
   * Generate mock data for development and fallback
   */
  static generateMockData(userPlan: SubscriptionPlan, options: AmazonAnalyticsOptions): AmazonAnalytics {
    return {
      profile: {
        id: 'mock-profile-123',
        name: 'Sample Amazon Store',
        marketplace: 'US',
        seller_id: 'A1B2C3D4E5F6G7'
      },
      posts: this.getMockAmazonPostsAnalytics(),
      ads: userPlan !== SubscriptionPlan.FREEMIUM ? this.getMockAmazonAdsAnalytics() : null,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Mock posts analytics data
   */
  static getMockAmazonPostsAnalytics(): PostAnalytics {
    const mockProducts = [
      { date: '2025-08-10', orders: 45, impressions: 1200, revenue: 2250 },
      { date: '2025-08-11', orders: 52, impressions: 1350, revenue: 2600 },
      { date: '2025-08-12', orders: 38, impressions: 980, revenue: 1900 },
      { date: '2025-08-13', orders: 61, impressions: 1580, revenue: 3050 },
      { date: '2025-08-14', orders: 48, impressions: 1240, revenue: 2400 },
      { date: '2025-08-15', orders: 55, impressions: 1420, revenue: 2750 }
    ]

    return {
      totalPosts: 24, // Total active product listings
      avgEngagement: 50, // Average orders per day
      avgReach: 1295, // Average impressions
      avgImpressions: 1295,
      topPost: {
        id: 'B08N5WRWNW',
        content: 'Wireless Bluetooth Headphones - Premium Sound Quality',
        engagement: 89,
        reach: 2400,
        impressions: 2400,
        date: '2025-08-13',
        mediaType: 'image'
      },
      engagementTrend: mockProducts.map(p => ({
        date: p.date,
        engagement: p.orders,
        reach: p.impressions,
        impressions: p.impressions
      })),
      contentPerformance: [
        { type: 'image', count: 18, avgEngagement: 52 },
        { type: 'video', count: 4, avgEngagement: 68 },
        { type: 'carousel', count: 2, avgEngagement: 45 },
        { type: 'text', count: 0, avgEngagement: 0 }
      ]
    }
  }

  /**
   * Mock ads analytics data
   */
  static getMockAmazonAdsAnalytics(): AdsAnalytics {
    const mockAdSpend = [
      { date: '2025-08-10', spend: 245, reach: 5200, impressions: 8400, clicks: 126 },
      { date: '2025-08-11', spend: 289, reach: 6100, impressions: 9800, clicks: 147 },
      { date: '2025-08-12', spend: 198, reach: 4300, impressions: 7200, clicks: 98 },
      { date: '2025-08-13', spend: 334, reach: 7200, impressions: 11500, clicks: 172 },
      { date: '2025-08-14', spend: 267, reach: 5800, impressions: 9100, clicks: 134 },
      { date: '2025-08-15', spend: 312, reach: 6700, impressions: 10200, clicks: 156 }
    ]

    const totalSpend = mockAdSpend.reduce((sum, day) => sum + day.spend, 0)
    const totalClicks = mockAdSpend.reduce((sum, day) => sum + day.clicks, 0)
    const totalImpressions = mockAdSpend.reduce((sum, day) => sum + day.impressions, 0)

    return {
      totalSpend,
      totalReach: mockAdSpend.reduce((sum, day) => sum + day.reach, 0),
      totalImpressions,
      totalClicks,
      cpm: totalSpend / (totalImpressions / 1000),
      cpc: totalSpend / totalClicks,
      ctr: (totalClicks / totalImpressions) * 100,
      roas: 4.2, // Return on ad spend
      topAd: {
        id: 'sp-ad-123456',
        name: 'Sponsored Product - Bluetooth Headphones',
        spend: 89,
        reach: 1200,
        impressions: 1800,
        clicks: 45,
        ctr: 2.5,
        date: '2025-08-13'
      },
      spendTrend: mockAdSpend,
      audienceInsights: {
        ageGroups: [
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 28 },
          { range: '18-24', percentage: 20 },
          { range: '45-54', percentage: 12 },
          { range: '55+', percentage: 5 }
        ],
        genders: [
          { gender: 'male', percentage: 58 },
          { gender: 'female', percentage: 42 }
        ],
        topLocations: [
          { location: 'California', percentage: 22 },
          { location: 'Texas', percentage: 18 },
          { location: 'New York', percentage: 15 },
          { location: 'Florida', percentage: 12 },
          { location: 'Other', percentage: 33 }
        ]
      }
    }
  }

  // Utility methods for data processing

  static generateAmazonProductTrend(products: AmazonReportData[]): Array<{
    date: string
    engagement: number
    reach: number
    impressions: number
  }> {
    // Group products by date and aggregate metrics
    const dailyMetrics = products.reduce((acc, product) => {
      if (!acc[product.date]) {
        acc[product.date] = { engagement: 0, reach: 0, impressions: 0 }
      }
      acc[product.date].engagement += product.orders
      acc[product.date].reach += product.impressions
      acc[product.date].impressions += product.impressions
      return acc
    }, {} as Record<string, { engagement: number; reach: number; impressions: number }>)

    return Object.entries(dailyMetrics).map(([date, metrics]) => ({
      date,
      ...metrics
    }))
  }

  static analyzeAmazonContentPerformance(products: AmazonReportData[]): Array<{
    type: 'image' | 'video' | 'carousel' | 'text'
    count: number
    avgEngagement: number
  }> {
    // Simulate content type analysis for Amazon products
    const totalProducts = products.length
    return [
      { type: 'image', count: Math.floor(totalProducts * 0.75), avgEngagement: 45 },
      { type: 'video', count: Math.floor(totalProducts * 0.15), avgEngagement: 62 },
      { type: 'carousel', count: Math.floor(totalProducts * 0.10), avgEngagement: 38 },
      { type: 'text', count: 0, avgEngagement: 0 }
    ]
  }

  static calculateAverageMetric(data: AmazonReportData[], metric: keyof AmazonReportData): number {
    if (data.length === 0) return 0
    const sum = data.reduce((acc, item) => acc + (Number(item[metric]) || 0), 0)
    return Math.round(sum / data.length)
  }

  static getTopPerformingProduct(products: AmazonReportData[]): PostAnalytics['topPost'] {
    if (products.length === 0) return undefined

    const topProduct = products.reduce((best, current) => 
      current.orders > best.orders ? current : best
    )

    return {
      id: topProduct.campaignId || 'unknown',
      content: topProduct.campaignName || 'Top Performing Product',
      engagement: topProduct.orders,
      reach: topProduct.impressions,
      impressions: topProduct.impressions,
      date: topProduct.date,
      mediaType: 'image'
    }
  }

  static generateMockProductData(): AmazonReportData[] {
    const dates = ['2025-08-10', '2025-08-11', '2025-08-12', '2025-08-13', '2025-08-14', '2025-08-15']
    return dates.map(date => ({
      date,
      campaignId: `campaign-${Math.random().toString(36).substr(2, 9)}`,
      campaignName: `Product Campaign ${date}`,
      impressions: Math.floor(Math.random() * 2000) + 800,
      clicks: Math.floor(Math.random() * 100) + 30,
      cost: Math.floor(Math.random() * 200) + 100,
      sales: Math.floor(Math.random() * 1000) + 500,
      orders: Math.floor(Math.random() * 50) + 20,
      acos: Math.random() * 30 + 10,
      roas: Math.random() * 3 + 2,
      ctr: Math.random() * 2 + 1,
      cpc: Math.random() * 2 + 0.5,
      cpm: Math.random() * 10 + 5
    }))
  }
}
