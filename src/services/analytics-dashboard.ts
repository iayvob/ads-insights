import { logger } from "@/config/logger"
import {
  FacebookAnalytics,
  InstagramAnalytics,
  TwitterAnalytics,
  TikTokAnalytics,
  AmazonAnalytics,
  PlatformType
} from "@/validations/analytics-types"
import { FacebookApiClient } from "./api-clients/facebook-client"
import { InstagramApiClient } from "./api-clients/instagram-client"
import { TwitterApiClient } from "./api-clients/twitter-client"
import { TikTokApiClient } from "./api-clients/tiktok-client"
import { AmazonApiClient } from "./api-clients/amazon-client"
import { AnalyticsAdapter } from "./analytics-adapter"
import { UserService } from "./user"
import { SubscriptionPlan } from "@prisma/client"

export interface DashboardOverview {
  totalReach: number
  totalEngagement: number
  totalFollowers: number
  engagementRate: number
  totalImpressions: number
  totalPosts: number
  totalAdSpend?: number // Only for premium users
  avgCpc?: number // Only for premium users
  avgCtr?: number // Only for premium users
}

export interface AnalyticsDashboardData {
  overview: DashboardOverview
  facebook?: FacebookAnalytics
  instagram?: InstagramAnalytics
  twitter?: TwitterAnalytics
  tiktok?: TikTokAnalytics
  amazon?: AmazonAnalytics
  lastUpdated: string
  connectedPlatforms: PlatformType[]
  userPlan: SubscriptionPlan
  errors?: {
    [key in PlatformType]?: {
      type: 'no_business_account' | 'connection_failed' | 'api_error' | 'token_expired'
      message: string
      details?: any
    }
  }
}

/**
 * Enhanced Dashboard Service for Analytics Structure
 * Supports separation between posts and ads analytics based on user subscription
 */
export class AnalyticsDashboardService {

  /**
   * Fetch comprehensive analytics dashboard data for a user
   */
  static async getAnalyticsDashboardData(userId: string): Promise<AnalyticsDashboardData> {
    const activeProviders = await UserService.getActiveProviders(userId)

    // Debug logging
    logger.info("Getting analytics dashboard data", {
      userId,
      activeProvidersCount: activeProviders.length,
      providers: activeProviders.map(p => ({ provider: p.provider, id: p.id, expiresAt: p.expiresAt }))
    })

    // Check if user has premium subscription
    const userPlan = await this.getUserPlan(userId)
    const includeAds = userPlan === SubscriptionPlan.PREMIUM_MONTHLY || userPlan === SubscriptionPlan.PREMIUM_YEARLY

    const dashboardData: AnalyticsDashboardData = {
      overview: {
        totalReach: 0,
        totalEngagement: 0,
        totalFollowers: 0,
        engagementRate: 0,
        totalImpressions: 0,
        totalPosts: 0,
        ...(includeAds && {
          totalAdSpend: 0,
          avgCpc: 0,
          avgCtr: 0
        })
      },
      lastUpdated: new Date().toISOString(),
      connectedPlatforms: activeProviders.map((p) => p.provider as PlatformType),
      userPlan,
      errors: {}
    }

    // Fetch data from each platform
    const platformPromises = activeProviders.map((provider) =>
      this.fetchPlatformAnalytics(provider, includeAds)
    )

    const results = await Promise.allSettled(platformPromises)

    // Process results and aggregate data
    results.forEach((result, index) => {
      const provider = activeProviders[index]

      if (result.status === "fulfilled" && result.value) {
        // Assign platform-specific data
        if (provider.provider === 'facebook') {
          dashboardData.facebook = result.value as FacebookAnalytics
        } else if (provider.provider === 'instagram') {
          dashboardData.instagram = result.value as InstagramAnalytics
        } else if (provider.provider === 'twitter') {
          dashboardData.twitter = result.value as TwitterAnalytics
        } else if (provider.provider === 'tiktok') {
          dashboardData.tiktok = result.value as TikTokAnalytics
        } else if (provider.provider === 'amazon') {
          dashboardData.amazon = result.value as AmazonAnalytics
        }

        // Aggregate overview data
        this.aggregateAnalyticsOverview(dashboardData.overview, result.value, includeAds)
      } else {
        const error = result.status === "rejected" ? result.reason : "Unknown error";

        // Handle specific error types with more detailed error information
        if (error.type === "no_business_account") {
          dashboardData.errors![provider.provider as PlatformType] = {
            type: 'no_business_account',
            message: error.details?.message || "Business account required",
            details: error.details
          };
        } else if (error.type === "rate_limit") {
          dashboardData.errors![provider.provider as PlatformType] = {
            type: 'api_error',
            message: `Rate limit exceeded. Data will refresh automatically.`,
            details: {
              type: 'rate_limit',
              retryAfter: error.details?.retryAfter,
              resetTime: error.details?.resetTime
            }
          };

          logger.info(`Rate limit handled gracefully for ${provider.provider}`, {
            userId,
            platform: provider.provider,
            retryAfter: error.details?.retryAfter
          })
        } else if (error.type === "auth_error") {
          dashboardData.errors![provider.provider as PlatformType] = {
            type: 'token_expired',
            message: `Authentication failed. Please reconnect your ${provider.provider} account.`,
            details: error.details
          };
        } else {
          dashboardData.errors![provider.provider as PlatformType] = {
            type: 'api_error',
            message: error.message || "Failed to fetch data",
            details: error
          };
        }

        logger.warn(`Failed to fetch ${provider.provider} analytics`, {
          userId,
          provider: provider.provider,
          error: error.message,
          errorType: error.type,
          status: error.status
        })
      }
    })

    // Calculate derived metrics
    this.calculateDerivedMetrics(dashboardData.overview, includeAds)

    logger.info("Analytics dashboard data compiled successfully", {
      userId,
      platforms: dashboardData.connectedPlatforms,
      userPlan: dashboardData.userPlan,
      totalFollowers: dashboardData.overview.totalFollowers,
      hasErrors: Object.keys(dashboardData.errors || {}).length > 0,
      errorTypes: Object.values(dashboardData.errors || {}).map(e => e.type)
    })

    return dashboardData
  }

  /**
   * Get platform-specific analytics data
   */
  static async getPlatformAnalytics(
    userId: string,
    platform: PlatformType
  ): Promise<FacebookAnalytics | InstagramAnalytics | TwitterAnalytics | TikTokAnalytics | AmazonAnalytics> {
    const activeProviders = await UserService.getActiveProviders(userId)
    const provider = activeProviders.find((p) => p.provider === platform)

    if (!provider) {
      throw new Error(`${platform} account not connected`)
    }

    if (UserService.isTokenExpired(provider)) {
      throw new Error(`${platform} token expired`)
    }

    const userPlan = await this.getUserPlan(userId)
    const includeAds = userPlan === SubscriptionPlan.PREMIUM_MONTHLY || userPlan === SubscriptionPlan.PREMIUM_YEARLY

    return this.fetchPlatformAnalytics(provider, includeAds)
  }

  /**
   * Check if user can access ads analytics
   */
  static async canAccessAdsAnalytics(userId: string): Promise<boolean> {
    const userPlan = await this.getUserPlan(userId)
    return userPlan === SubscriptionPlan.PREMIUM_MONTHLY || userPlan === SubscriptionPlan.PREMIUM_YEARLY
  }

  /**
   * Get available analytics types for user
   */
  static async getAvailableAnalyticsTypes(userId: string): Promise<Array<'posts' | 'ads'>> {
    const userPlan = await this.getUserPlan(userId)
    return userPlan === SubscriptionPlan.PREMIUM_MONTHLY || userPlan === SubscriptionPlan.PREMIUM_YEARLY ? ['posts', 'ads'] : ['posts']
  }

  // Private helper methods

  private static async fetchPlatformAnalytics(provider: any, includeAds: boolean) {
    try {
      switch (provider.provider) {
        case "facebook": {
          const rawData = await FacebookApiClient.fetchData(provider.accessToken)
          return AnalyticsAdapter.transformFacebookData(rawData, includeAds)
        }
        case "instagram": {
          try {
            // Instagram now uses Facebook Business Login with stored business account data
            logger.info("Processing Instagram analytics", {
              providerId: provider.id,
              hasAccessToken: !!provider.accessToken,
              accessTokenLength: provider.accessToken?.length,
              hasBusinessAccounts: !!provider.businessAccounts,
              businessAccountsType: typeof provider.businessAccounts,
            });

            console.log('🔍 [INSTAGRAM-DASHBOARD] Starting Instagram analytics fetch')
            console.log('🔑 [INSTAGRAM-DASHBOARD] Access token:', provider.accessToken?.substring(0, 30) + '...')
            console.log('📋 [INSTAGRAM-DASHBOARD] Provider businessAccounts:', {
              exists: !!provider.businessAccounts,
              type: typeof provider.businessAccounts,
              length: typeof provider.businessAccounts === 'string'
                ? provider.businessAccounts.length
                : Array.isArray(provider.businessAccounts)
                  ? provider.businessAccounts.length
                  : 'not an array',
              raw: provider.businessAccounts ?
                (typeof provider.businessAccounts === 'string'
                  ? provider.businessAccounts.substring(0, 200)
                  : JSON.stringify(provider.businessAccounts).substring(0, 200))
                : 'null'
            })

            // Parse businessAccounts to get fallback profile data
            let fallbackProfileData: any = undefined
            try {
              console.log('🔍 [INSTAGRAM-DASHBOARD] Attempting to parse businessAccounts...')

              if (provider.businessAccounts) {
                let parsedData = typeof provider.businessAccounts === 'string'
                  ? JSON.parse(provider.businessAccounts)
                  : provider.businessAccounts

                console.log('📊 [INSTAGRAM-DASHBOARD] Parsed businessAccounts:', {
                  type: typeof parsedData,
                  isArray: Array.isArray(parsedData),
                  keys: typeof parsedData === 'object' && parsedData !== null ? Object.keys(parsedData) : 'N/A',
                  hasBusinessAccountsProperty: parsedData && typeof parsedData === 'object' && 'business_accounts' in parsedData
                })

                // Extract the business_accounts array from the nested structure
                // The OAuth callback stores it as: { business_accounts: [...], facebook_pages: [...] }
                const businessAccounts = parsedData && typeof parsedData === 'object' && 'business_accounts' in parsedData
                  ? parsedData.business_accounts
                  : (Array.isArray(parsedData) ? parsedData : null)

                console.log('📊 [INSTAGRAM-DASHBOARD] Extracted business accounts array:', {
                  isArray: Array.isArray(businessAccounts),
                  length: Array.isArray(businessAccounts) ? businessAccounts.length : 'not array',
                  firstAccountKeys: Array.isArray(businessAccounts) && businessAccounts[0]
                    ? Object.keys(businessAccounts[0])
                    : 'no first account'
                })

                // Get the first Instagram business account as fallback
                const firstAccount = Array.isArray(businessAccounts) && businessAccounts.length > 0 ? businessAccounts[0] : null
                if (firstAccount) {
                  fallbackProfileData = {
                    username: firstAccount.username,
                    followers_count: firstAccount.followers_count,
                    media_count: firstAccount.media_count,
                    biography: firstAccount.biography,
                    website: firstAccount.website,
                    profile_picture_url: firstAccount.profile_picture_url
                  }
                  console.log('✅ [INSTAGRAM-DASHBOARD] Successfully extracted fallback profile data:', {
                    username: fallbackProfileData.username,
                    followers: fallbackProfileData.followers_count,
                    media: fallbackProfileData.media_count
                  })
                } else {
                  console.warn('⚠️ [INSTAGRAM-DASHBOARD] No first account found in businessAccounts')
                }
              } else {
                console.warn('⚠️ [INSTAGRAM-DASHBOARD] provider.businessAccounts is null/undefined')
              }
            } catch (parseError) {
              console.error('❌ [INSTAGRAM-DASHBOARD] Error parsing businessAccounts:', parseError)
              console.error('❌ [INSTAGRAM-DASHBOARD] Raw businessAccounts value:', provider.businessAccounts)
            }

            // Call the actual Instagram API with the provider's access token
            // InstagramApiClient.fetchAnalytics() already returns InstagramAnalytics format
            const instagramData = await InstagramApiClient.fetchAnalytics(
              provider.accessToken || '',
              includeAds,
              fallbackProfileData // Pass fallback data for when profile API fails
            )

            console.log('✅ [INSTAGRAM-DASHBOARD] Instagram API response:', {
              hasProfile: !!instagramData.profile,
              hasPosts: !!instagramData.posts,
              hasAds: !!instagramData.ads,
              totalPosts: instagramData.posts?.totalPosts,
              avgEngagement: instagramData.posts?.avgEngagement,
              profileUsername: instagramData.profile?.username
            })

            logger.info("Instagram analytics fetched from API", {
              providerId: provider.id,
              hasProfile: !!instagramData.profile,
              hasPosts: !!instagramData.posts,
              hasAds: !!instagramData.ads,
              totalPosts: instagramData.posts?.totalPosts,
              avgEngagement: instagramData.posts?.avgEngagement,
              profileUsername: instagramData.profile?.username
            })

            // ✅ InstagramApiClient.fetchAnalytics() ALREADY returns InstagramAnalytics format
            // NO TRANSFORMATION NEEDED - data is already structured correctly!
            // Return InstagramAnalytics format directly
            return {
              posts: instagramData.posts,
              ads: instagramData.ads, // Already null if no ads, don't generate fake data
              lastUpdated: instagramData.lastUpdated,
              profile: instagramData.profile
            }
          } catch (error: any) {
            console.error('❌ [INSTAGRAM-DASHBOARD] Error:', error)
            logger.error("Failed to fetch Instagram analytics", {
              error: error.message,
              stack: error.stack
            })
            // Handle Instagram Business account specific errors
            if (error.code === "NO_BUSINESS_ACCOUNT" || error.message?.includes("Instagram Business account")) {
              const businessAccountError = new Error("Instagram Business account not connected") as Error & {
                code?: string;
                type?: string;
                details?: any;
              };
              businessAccountError.code = "NO_BUSINESS_ACCOUNT";
              businessAccountError.type = "no_business_account";
              businessAccountError.details = {
                message: "To view Instagram insights, convert your Instagram account to a Business account and connect it to a Facebook page.",
                helpUrl: "https://help.instagram.com/502981923235522"
              };
              throw businessAccountError;
            }
            throw error; // Re-throw other errors
          }
        }
        case "twitter": {
          try {
            // Get user plan to determine if ads analytics should be included
            const userPlan = await this.getUserPlan(provider.userId || '')
            const subscriptionPlan = userPlan === SubscriptionPlan.PREMIUM_MONTHLY || userPlan === SubscriptionPlan.PREMIUM_YEARLY ? 'PREMIUM' : 'FREEMIUM'

            // 🔍 DEBUG: Log token information
            // NOTE: OAuth 2.0 Bearer tokens are typically 80-150+ characters (often base64 encoded)
            // OAuth 1.0a tokens are typically 50 characters
            const isOAuth2 = provider.accessToken?.length >= 80;
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔑 TWITTER TOKEN DEBUG - Analytics Dashboard');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📋 Provider Info:', {
              id: provider.id,
              provider: provider.provider,
              userId: provider.userId,
              hasAccessToken: !!provider.accessToken,
              accessTokenLength: provider.accessToken?.length,
              accessTokenPreview: provider.accessToken?.substring(0, 20) + '...',
              tokenType: isOAuth2 ? 'OAuth 2.0 Bearer (CORRECT)' : 'OAuth 1.0a (WRONG for API v2!)',
            });
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            const rawData = await TwitterApiClient.fetchAnalytics(provider.accessToken, subscriptionPlan as any)
            return rawData // TwitterApiClient.fetchAnalytics already returns TwitterAnalytics format
          } catch (error: any) {
            // Handle Twitter/X API specific errors
            if (error.type === 'rate_limit') {
              logger.warn(`Twitter rate limit exceeded for provider ${provider.provider}`, {
                retryAfter: error.details?.retryAfter,
                resetTime: error.details?.resetTime
              })

              // Return mock data for rate limited requests to prevent dashboard failure
              const userPlan = await this.getUserPlan(provider.userId || '')
              const subscriptionPlan = userPlan === SubscriptionPlan.PREMIUM_MONTHLY || userPlan === SubscriptionPlan.PREMIUM_YEARLY ? 'PREMIUM' : 'FREEMIUM'
              return TwitterApiClient.generateMockTwitterAnalytics(subscriptionPlan as any)
            }

            if (error.type === 'auth_error') {
              // Token might be expired or invalid
              logger.warn(`Twitter authentication failed for provider ${provider.provider} - attempting token refresh`, {
                status: error.status,
                details: error.details,
                providerId: provider.id,
                hasRefreshToken: !!provider.refreshToken
              })

              // Try to refresh the token if refresh token is available
              if (provider.refreshToken) {
                try {
                  logger.info(`Attempting to refresh Twitter token for provider ${provider.id}`)
                  const { TokenRefreshService } = await import('@/services/token-refresh')
                  const refreshResult = await TokenRefreshService.refreshTwitterToken(
                    provider.userId || '',
                    provider.id,
                    provider.refreshToken
                  )

                  if (refreshResult.refreshed) {
                    logger.info(`Successfully refreshed Twitter token, retrying analytics fetch`)
                    // Get updated provider with new token
                    const updatedProvider = await UserService.getProviderById(provider.id)
                    if (updatedProvider && updatedProvider.accessToken) {
                      // Retry the analytics fetch with new token
                      const userPlan = await this.getUserPlan(provider.userId || '')
                      const subscriptionPlan = userPlan === SubscriptionPlan.PREMIUM_MONTHLY || userPlan === SubscriptionPlan.PREMIUM_YEARLY ? 'PREMIUM' : 'FREEMIUM'
                      const rawData = await TwitterApiClient.fetchAnalytics(updatedProvider.accessToken, subscriptionPlan as any)
                      return rawData
                    }
                  } else {
                    logger.error(`Failed to refresh Twitter token: ${refreshResult.message || refreshResult.error}`)
                  }
                } catch (refreshError) {
                  logger.error(`Exception during Twitter token refresh`, {
                    error: refreshError instanceof Error ? refreshError.message : String(refreshError)
                  })
                }
              }

              throw new Error(`Twitter token expired or invalid. Please reconnect your Twitter account.`)
            }

            throw error; // Re-throw other errors
          }
        }
        case "tiktok": {
          try {
            const rawData = await TikTokApiClient.fetchData(provider.accessToken)
            return AnalyticsAdapter.transformTikTokData(rawData, includeAds)
          } catch (error: any) {
            // Handle TikTok API specific errors
            if (error.type === 'rate_limit') {
              logger.warn(`TikTok rate limit exceeded for provider ${provider.provider}`, {
                retryAfter: error.details?.retryAfter,
                resetTime: error.details?.resetTime
              })

              // Return mock data for rate limited requests
              const mockTikTokData: TikTokAnalytics = {
                profile: {
                  id: 'mock_tiktok_123',
                  username: 'sample_creator',
                  followers_count: 15000,
                  video_count: 45,
                  likes_count: 125000
                },
                posts: {
                  totalPosts: 45,
                  avgEngagement: 850,
                  avgReach: 12000,
                  avgImpressions: 15000,
                  engagementTrend: [],
                  contentPerformance: [
                    { type: 'video', count: 35, avgEngagement: 950 },
                    { type: 'image', count: 10, avgEngagement: 650 }
                  ]
                },
                ads: includeAds ? {
                  totalSpend: 890,
                  totalReach: 52000,
                  totalImpressions: 145000,
                  totalClicks: 2900,
                  cpm: 6.14,
                  cpc: 0.31,
                  ctr: 2.00,
                  roas: 4.1,
                  spendTrend: [],
                  audienceInsights: {
                    ageGroups: [{ range: '18-24', percentage: 45 }],
                    genders: [{ gender: 'Female', percentage: 62 }],
                    topLocations: [{ location: 'Los Angeles, CA', percentage: 28 }]
                  }
                } : null,
                lastUpdated: new Date().toISOString()
              }
              return mockTikTokData
            }

            throw error; // Re-throw other errors
          }
        }
        case "amazon": {
          try {
            // Amazon client already returns the correct analytics format
            const userPlan = await this.getUserPlan(provider.userId || '')
            const subscriptionPlan = userPlan === SubscriptionPlan.PREMIUM_MONTHLY || userPlan === SubscriptionPlan.PREMIUM_YEARLY ? 'PREMIUM' : 'FREEMIUM'

            const rawData = await AmazonApiClient.fetchAnalytics(
              provider.accessToken,
              provider.profileId || '',
              subscriptionPlan as any,
              { userId: provider.userId || '', hasAdsAccess: includeAds }
            )
            return AnalyticsAdapter.transformAmazonData(rawData, includeAds)
          } catch (error: any) {
            // Handle Amazon API specific errors
            if (error.type === 'rate_limit') {
              logger.warn(`Amazon rate limit exceeded for provider ${provider.provider}`, {
                retryAfter: error.details?.retryAfter,
                resetTime: error.details?.resetTime
              })

              // Return mock data for rate limited requests
              const userPlan = await this.getUserPlan(provider.userId || '')
              const subscriptionPlan = userPlan === SubscriptionPlan.PREMIUM_MONTHLY || userPlan === SubscriptionPlan.PREMIUM_YEARLY ? 'PREMIUM' : 'FREEMIUM'
              return AmazonApiClient.generateMockData(subscriptionPlan as any, { userId: provider.userId || '', hasAdsAccess: includeAds })
            }

            throw error; // Re-throw other errors
          }
        }
        default:
          throw new Error(`Unsupported platform: ${provider.provider}`)
      }
    } catch (error: any) {
      logger.error(`Failed to fetch ${provider.provider} analytics`, {
        error: error.message,
        type: error.type,
        status: error.status,
        retryable: error.retryable
      })
      throw error
    }
  }

  private static aggregateAnalyticsOverview(
    overview: DashboardOverview,
    platformData: FacebookAnalytics | InstagramAnalytics | TwitterAnalytics | TikTokAnalytics | AmazonAnalytics,
    includeAds: boolean
  ) {
    // Aggregate posts data
    const posts = platformData.posts
    overview.totalPosts += posts.totalPosts
    overview.totalEngagement += posts.avgEngagement * posts.totalPosts
    overview.totalReach += posts.avgReach * posts.totalPosts
    overview.totalImpressions += posts.avgImpressions * posts.totalPosts

    // Add follower count from profile data
    if ('pageData' in platformData && platformData.pageData) {
      // Facebook page data
      overview.totalFollowers += platformData.pageData.fan_count
    } else if ('profile' in platformData && platformData.profile) {
      // Check if it's an Amazon profile (has 'name' instead of 'followers_count')
      if ('name' in platformData.profile) {
        // Amazon profile doesn't have followers, skip
      } else if ('followers_count' in platformData.profile) {
        // Instagram, Twitter, TikTok profiles
        overview.totalFollowers += platformData.profile.followers_count
      }
    }

    // Aggregate ads data for premium users
    if (includeAds && platformData.ads) {
      const ads = platformData.ads
      if (overview.totalAdSpend !== undefined) {
        overview.totalAdSpend += ads.totalSpend
      }
      // We'll calculate averages later in calculateDerivedMetrics
    }
  }

  private static calculateDerivedMetrics(overview: DashboardOverview, includeAds: boolean) {
    // Calculate engagement rate
    if (overview.totalReach > 0) {
      overview.engagementRate = (overview.totalEngagement / overview.totalReach) * 100
    }

    // Calculate average ads metrics for premium users
    if (includeAds && overview.totalAdSpend !== undefined) {
      // These would be calculated from individual platform ads data
      // For now, using mock calculations
      overview.avgCpc = overview.totalAdSpend && overview.totalImpressions > 0
        ? (overview.totalAdSpend / (overview.totalImpressions * 0.025)) // Assuming 2.5% CTR
        : 0

      overview.avgCtr = overview.totalImpressions > 0
        ? ((overview.totalAdSpend || 0) / (overview.avgCpc || 1)) / overview.totalImpressions * 100
        : 0
    }
  }

  private static async getUserPlan(userId: string): Promise<SubscriptionPlan> {
    try {
      // This should check the user's actual subscription status
      const user = await UserService.getUserWithProviders(userId)
      return user.plan
    } catch (error) {
      logger.warn("Failed to get user plan, defaulting to free", { userId, error })
      return SubscriptionPlan.FREEMIUM
    }
  }
}

// Legacy dashboard service compatibility wrapper
export class DashboardService {
  /**
   * @deprecated Use AnalyticsDashboardService.getAnalyticsDashboardData instead
   */
  static async getDashboardData(userId: string) {
    logger.warn("DashboardService.getDashboardData is deprecated, use AnalyticsDashboardService instead")

    // For backward compatibility, convert new format to old format
    const analyticsData = await AnalyticsDashboardService.getAnalyticsDashboardData(userId)

    return {
      overview: {
        totalReach: analyticsData.overview.totalReach,
        totalEngagement: analyticsData.overview.totalEngagement,
        totalFollowers: analyticsData.overview.totalFollowers,
        engagementRate: analyticsData.overview.engagementRate,
        totalImpressions: analyticsData.overview.totalImpressions,
        totalPosts: analyticsData.overview.totalPosts,
      },
      // Convert analytics format back to legacy format if needed
      facebook: analyticsData.facebook ? this.convertToLegacyFormat('facebook', analyticsData.facebook) : undefined,
      instagram: analyticsData.instagram ? this.convertToLegacyFormat('instagram', analyticsData.instagram) : undefined,
      twitter: analyticsData.twitter ? this.convertToLegacyFormat('twitter', analyticsData.twitter) : undefined,
      lastUpdated: analyticsData.lastUpdated,
      connectedPlatforms: analyticsData.connectedPlatforms,
    }
  }

  private static convertToLegacyFormat(platform: string, analyticsData: any) {
    // Convert new analytics format to legacy format for backward compatibility
    switch (platform) {
      case 'facebook':
        return {
          pageData: analyticsData.pageData,
          insights: {
            reach: analyticsData.posts.avgReach * analyticsData.posts.totalPosts,
            impressions: analyticsData.posts.avgImpressions * analyticsData.posts.totalPosts,
            engagement: analyticsData.posts.avgEngagement * analyticsData.posts.totalPosts,
            page_views: 0 // Not available in new format
          },
          posts: [] // Would need to reconstruct from analytics data
        }
      case 'instagram':
        return {
          profile: analyticsData.profile,
          insights: {
            reach: analyticsData.posts.avgReach * analyticsData.posts.totalPosts,
            impressions: analyticsData.posts.avgImpressions * analyticsData.posts.totalPosts,
            profile_views: 0 // Not available in new format
          },
          media: [] // Would need to reconstruct from analytics data
        }
      case 'twitter':
        return {
          profile: analyticsData.profile,
          analytics: {
            impressions: analyticsData.posts.avgImpressions * analyticsData.posts.totalPosts,
            engagements: analyticsData.posts.avgEngagement * analyticsData.posts.totalPosts,
            engagement_rate: analyticsData.posts.avgEngagement > 0
              ? (analyticsData.posts.avgEngagement / (analyticsData.posts.avgImpressions || 1)) * 100
              : 0
          },
          tweets: [] // Would need to reconstruct from analytics data
        }
      default:
        return analyticsData
    }
  }
}
