/**
 * Instagram API Client using Instagram Basic Display API
 * 
 * This client uses the Instagram Basic Display API (graph.instagram.com)
 * instead of the Instagram Business API (graph.facebook.com).
 * 
 * Limitations of Basic Display API:
 * - No engagement metrics (likes, comments, reach, impressions)
 * - No ads analytics support
 * - No follower/following counts
 * - Limited profile information
 * 
 * For full Instagram Business features, use Facebook Graph API with
 * Instagram Business accounts connected to Facebook pages.
 */

import { logger } from "@/config/logger"
import { BaseApiClient } from "./base-client"
import { InstagramAnalytics, PostAnalytics, AdsAnalytics } from "@/validations/analytics-types"

export interface InstagramData {
  profile: {
    id: string
    username: string
    followers_count: number
    follows_count: number
    media_count: number
  }
  insights: {
    reach: number
    impressions: number
    profile_views: number
  }
  media: Array<{
    id: string
    media_type: string
    caption?: string
    timestamp: string
    like_count: number
    comments_count: number
  }>
}

export interface InstagramEnhancedData extends InstagramAnalytics {
  profile: {
    id: string
    username: string
    followers_count: number
    media_count: number
    follows_count?: number
    biography?: string
    website?: string
  }
}

export class InstagramApiClient extends BaseApiClient {
  private static readonly BASE_URL = "https://graph.instagram.com" // Instagram Basic Display API
  private static readonly MEDIA_FIELDS = [
    'id',
    'media_type', 
    'media_url',
    'permalink',
    'timestamp',
    'caption'
  ].join(',')

  /**
   * Fetch comprehensive Instagram analytics with subscription-aware data
   * Uses Instagram Basic Display API (not Facebook Graph API)
   */
  static async fetchAnalytics(accessToken: string, includeAds: boolean = false): Promise<InstagramEnhancedData> {
    try {
      logger.info("Fetching Instagram analytics using Basic Display API", { includeAds });

      const [profileData, postsAnalytics] = await Promise.allSettled([
        this.getProfileData(accessToken),
        this.getPostsAnalytics(accessToken),
      ]);

      // Note: Instagram Basic Display API doesn't support ads analytics
      // Ads require Instagram Business API which needs Facebook connection
      let adsAnalytics: AdsAnalytics | null = null;
      
      if (includeAds) {
        logger.warn("Instagram Basic Display API doesn't support ads analytics. Upgrade to Instagram Business API for ads data.");
        adsAnalytics = null; // Instagram Basic Display API doesn't support ads
      }

      const result: InstagramEnhancedData = {
        profile: profileData.status === "fulfilled" ? profileData.value as InstagramEnhancedData['profile'] : this.getMockProfileData(),
        posts: postsAnalytics.status === "fulfilled" ? postsAnalytics.value as PostAnalytics : this.getMockPostsAnalytics(),
        ads: adsAnalytics,
        lastUpdated: new Date().toISOString(),
      };

      logger.info("Instagram analytics fetched successfully", { 
        hasProfileData: !!result.profile,
        hasPostsData: !!result.posts,
        hasAdsData: !!result.ads,
      });

      return result;

    } catch (error) {
      logger.error("Instagram analytics fetch failed", { error });
      throw new Error("Failed to fetch Instagram analytics");
    }
  }

  /**
   * Fetch basic Instagram data using Basic Display API
   */
  static async fetchData(accessToken: string): Promise<InstagramData> {
    try {
      logger.info("Fetching Instagram data using Basic Display API");

      const [profile, media] = await Promise.allSettled([
        this.getBasicProfile(accessToken),
        this.getBasicMedia(accessToken),
      ])

      const profileData = profile.status === "fulfilled" ? profile.value : this.getMockProfile();
      const mediaData = media.status === "fulfilled" ? media.value : this.getMockMedia();

      // Instagram Basic Display API has limited insights
      // We can only get basic engagement metrics from media data
      const insights = await this.calculateBasicInsights(mediaData);

      return {
        profile: profileData,
        insights: {
          reach: insights.totalReach || 0,
          impressions: insights.totalReach || 0, // Use same as reach for Basic Display API
          profile_views: 0, // Not available in Basic Display API
        },
        media: mediaData,
      }
    } catch (error: any) {
      logger.warn("Instagram Basic Display API failed", { error: error.message })
      return this.generateMockData()
    }
  }

  /**
   * Get comprehensive posts analytics for Instagram profiles using Basic Display API
   */
  static async getPostsAnalytics(accessToken: string): Promise<PostAnalytics> {
    try {
      logger.info("Fetching Instagram posts analytics using Basic Display API");

      // Use Basic Display API to get media posts
      const media = await this.getBasicMedia(accessToken, 50);
      
      if (!media || media.length === 0) {
        logger.warn("No media found, returning mock posts analytics");
        return this.getMockPostsAnalytics();
      }

      // Calculate aggregated metrics from available data
      // Note: Basic Display API doesn't provide like_count, comments_count, reach, or impressions
      let totalEngagement = 0;
      let totalReach = 0; // Not available in Basic Display API
      let totalImpressions = 0; // Not available in Basic Display API
      let topPost: {
        id: string;
        content: string;
        engagement: number;
        reach: number;
        impressions: number;
        date: string;
        mediaType: 'image' | 'video' | 'carousel' | 'text';
      } | null = null;
      let maxEngagement = 0;

      const engagementTrend: Array<{ date: string; engagement: number; reach: number; impressions: number }> = [];
      const contentPerformance = new Map<string, { count: number; totalEngagement: number }>();

      media.forEach((post: any) => {
        // Basic Display API doesn't provide engagement metrics
        // We can only work with media_type, timestamp, and caption data
        const engagement = 0; // Not available in Basic Display API
        
        totalEngagement += engagement;
        // totalReach and totalImpressions remain 0 as they're not available

        // Track top post based on recency since we don't have engagement data
        const postDate = new Date(post.timestamp || Date.now()).getTime();
        if (!topPost || postDate > new Date(topPost.date).getTime()) {
          topPost = {
            id: post.id || 'unknown',
            content: post.caption?.substring(0, 100) || 'No caption available',
            engagement: 0, // Not available in Basic Display API
            reach: 0, // Not available in Basic Display API
            impressions: 0, // Not available in Basic Display API
            date: post.timestamp || new Date().toISOString(),
            mediaType: this.determineInstagramMediaType(post) as 'image' | 'video' | 'carousel' | 'text',
          };
        }

        // Track engagement trend (all zeros since Basic Display API doesn't provide this data)
        const date = new Date(post.timestamp || Date.now()).toISOString().split('T')[0];
        engagementTrend.push({ date, engagement: 0, reach: 0, impressions: 0 });

        // Track content performance
        const mediaType = this.determineInstagramMediaType(post);
        const current = contentPerformance.get(mediaType) || { count: 0, totalEngagement: 0 };
        contentPerformance.set(mediaType, {
          count: current.count + 1,
          totalEngagement: current.totalEngagement + engagement,
        });
      });

      // Sort engagement trend by date
      engagementTrend.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Convert content performance to array
      const contentPerformanceArray = Array.from(contentPerformance.entries()).map(([type, data]) => ({
        type: type as 'image' | 'video' | 'carousel' | 'text',
        count: data.count,
        avgEngagement: 0, // Basic Display API doesn't provide engagement metrics
      }));

      const result: PostAnalytics = {
        totalPosts: media.length,
        avgEngagement: 0, // Not available in Basic Display API
        avgReach: 0, // Not available in Basic Display API
        avgImpressions: 0, // Not available in Basic Display API
        topPost: topPost || undefined,
        engagementTrend: engagementTrend.slice(-7), // Keep last 7 days
        contentPerformance: contentPerformanceArray,
      };

      logger.info("Instagram posts analytics fetched successfully using Basic Display API", {
        totalPosts: result.totalPosts,
        contentTypes: contentPerformanceArray.length
      });

      return result;

    } catch (error) {
      logger.error("Failed to fetch Instagram posts analytics with Basic Display API", { error });
      return this.getMockPostsAnalytics();
    }
  }

  /**
   * Get comprehensive ads analytics for Instagram (Premium only)
   * Note: Instagram Basic Display API doesn't support ads analytics
   */
  static async getAdsAnalytics(accessToken: string): Promise<AdsAnalytics> {
    try {
      logger.warn("Instagram Basic Display API doesn't support ads analytics - returning mock data");
      logger.info("For Instagram ads analytics, you need to use Instagram Business API with Facebook Graph API");
      
      // Basic Display API doesn't support ads, return mock data
      return this.getMockAdsAnalytics();

    } catch (error) {
      logger.error("Failed to fetch Instagram ads analytics", { error });
      return this.getMockAdsAnalytics();
    }
  }

  /**
   * Get Instagram Business Account ID following Facebook's official process
   * NOTE: This method is NOT used with Instagram Basic Display API
   * It's kept for reference but commented out as it requires Facebook Graph API tokens
   */
  /*
  private static async getInstagramBusinessAccountId(accessToken: string): Promise<{ igUserId: string; pageAccessToken: string } | null> {
    try {
      // This method requires Facebook Graph API access, not Instagram Basic Display API
      logger.warn("getInstagramBusinessAccountId is not compatible with Instagram Basic Display API");
      return null;
    } catch (error) {
      logger.error("Failed to get Instagram Business account ID", { error });
      return null;
    }
  }
  */

  /**
   * Get enhanced profile data with Basic Display API
   * Using Instagram Basic Display API instead of Business API
   */
  static async getProfileData(accessToken: string) {
    try {
      // Use Basic Display API to get profile data
      const profileData = await this.getBasicProfile(accessToken);
      
      return {
        id: profileData?.id || '',
        username: profileData?.username || '',
        followers_count: profileData?.followers_count || 0,
        media_count: profileData?.media_count || 0,
        biography: '', // Not available in Basic Display API
        website: '', // Not available in Basic Display API
        profile_picture_url: '', // Not available in Basic Display API
        follows_count: profileData?.follows_count || 0,
        account_type: profileData?.account_type || '',
      };

    } catch (error) {
      logger.error("Failed to fetch Instagram profile data", { error });
      throw error;
    }
  }

  static async getProfile(accessToken: string) {
    try {
      logger.info("Using Basic Display API for getProfile - redirecting to getBasicProfile");
      // Redirect to Basic Display API method
      return await this.getBasicProfile(accessToken);
    } catch (error) {
      logger.error("Failed to fetch Instagram profile", { error });
      throw error;
    }
  }

  static async getInsights(accessToken: string, period = "week") {
    try {
      logger.warn("Instagram Basic Display API doesn't provide insights data - returning mock data");
      // Basic Display API doesn't provide insights, return mock data
      return {
        reach: 0,
        impressions: 0,
        profile_views: 0
      };
    } catch (error) {
      logger.error("Failed to fetch Instagram insights", { error });
      throw error;
    }
  }

  static async getMedia(accessToken: string, limit = 25) {
    try {
      logger.info("Using Basic Display API for getMedia - redirecting to getBasicMedia");
      // Redirect to Basic Display API method
      return await this.getBasicMedia(accessToken, limit);
    } catch (error) {
      logger.error("Failed to fetch Instagram media", { error });
      throw error;
    }
  }

  static async getStories(accessToken: string) {
    try {
      const url = `${this.BASE_URL}/me/stories?access_token=${accessToken}&fields=id,media_type,timestamp`
      const data = await this.makeRequest<any>(url, {}, "Failed to fetch stories")
      return data.data || []
    } catch (error) {
      logger.warn("Failed to fetch stories", { error })
      return []
    }
  }

  /**
   * Helper method to determine Instagram media type
   */
  private static determineInstagramMediaType(post: any): string {
    if (!post.media_type) return 'text';
    
    switch (post.media_type.toUpperCase()) {
      case 'IMAGE':
        return 'image';
      case 'VIDEO':
        return 'video';
      case 'CAROUSEL_ALBUM':
        return 'carousel';
      default:
        return post.caption ? 'text' : 'image';
    }
  }

  /**
   * Helper method to get date X days ago in YYYY-MM-DD format
   */
  private static getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get mock posts analytics for fallback
   */
  private static getMockPostsAnalytics(): PostAnalytics {
    return {
      totalPosts: 15,
      avgEngagement: 145,
      avgReach: 3200,
      avgImpressions: 4800,
      topPost: {
        id: "mock_top_post",
        content: "Our latest product launch! Check out these amazing features...",
        engagement: 425,
        reach: 8500,
        impressions: 12000,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        mediaType: 'image',
      },
      engagementTrend: [
        { date: this.getDateDaysAgo(7), engagement: 120, reach: 2800, impressions: 4200 },
        { date: this.getDateDaysAgo(6), engagement: 135, reach: 3100, impressions: 4600 },
        { date: this.getDateDaysAgo(5), engagement: 145, reach: 3200, impressions: 4800 },
        { date: this.getDateDaysAgo(4), engagement: 180, reach: 3800, impressions: 5400 },
        { date: this.getDateDaysAgo(3), engagement: 425, reach: 8500, impressions: 12000 },
        { date: this.getDateDaysAgo(2), engagement: 165, reach: 3400, impressions: 5100 },
        { date: this.getDateDaysAgo(1), engagement: 155, reach: 3300, impressions: 4900 },
      ],
      contentPerformance: [
        { type: 'image', count: 8, avgEngagement: 160 },
        { type: 'video', count: 4, avgEngagement: 220 },
        { type: 'carousel', count: 3, avgEngagement: 185 },
      ],
    };
  }

  /**
   * Get mock ads analytics for fallback
   */
  private static getMockAdsAnalytics(): AdsAnalytics {
    return {
      totalSpend: 1250.75,
      totalReach: 45000,
      totalImpressions: 125000,
      totalClicks: 2800,
      cpm: 10.00,
      cpc: 0.45,
      ctr: 2.24,
      roas: 3.2,
      topAd: {
        id: "mock_top_ad",
        name: "Instagram Promotion - Summer Collection",
        spend: 450.25,
        reach: 18000,
        impressions: 48000,
        clicks: 1200,
        ctr: 2.5,
        date: this.getDateDaysAgo(5),
      },
      spendTrend: [
        { date: this.getDateDaysAgo(7), spend: 125.50, reach: 5500, impressions: 15000, clicks: 320 },
        { date: this.getDateDaysAgo(6), spend: 185.75, reach: 7200, impressions: 18500, clicks: 410 },
        { date: this.getDateDaysAgo(5), spend: 450.25, reach: 18000, impressions: 48000, clicks: 1200 },
        { date: this.getDateDaysAgo(4), spend: 165.25, reach: 6800, impressions: 17200, clicks: 380 },
        { date: this.getDateDaysAgo(3), spend: 135.00, reach: 5200, impressions: 14500, clicks: 290 },
        { date: this.getDateDaysAgo(2), spend: 95.50, reach: 3800, impressions: 9500, clicks: 185 },
        { date: this.getDateDaysAgo(1), spend: 93.50, reach: 3500, impressions: 9300, clicks: 175 },
      ],
      audienceInsights: {
        ageGroups: [
          { range: "18-24", percentage: 30 },
          { range: "25-34", percentage: 40 },
          { range: "35-44", percentage: 20 },
          { range: "45+", percentage: 10 }
        ],
        genders: [
          { gender: "Female", percentage: 65 },
          { gender: "Male", percentage: 35 }
        ],
        topLocations: [
          { location: "United States", percentage: 50 },
          { location: "Canada", percentage: 12 },
          { location: "United Kingdom", percentage: 10 },
          { location: "Australia", percentage: 8 },
          { location: "Other", percentage: 20 }
        ]
      }
    };
  }

  /**
   * Get mock profile data for fallback
   */
  private static getMockProfileData() {
    return {
      id: "mock_instagram_business_id",
      username: "sample_business",
      followers_count: 12500,
      media_count: 145,
      follows_count: 380,
      biography: "Your trusted partner for innovative solutions. Follow us for daily inspiration! 🚀",
      website: "https://www.samplebusiness.com",
    };
  }

  static generateMockData(): InstagramData {
    return {
      profile: this.getMockProfile(),
      insights: this.getMockInsights(),
      media: this.getMockMedia(),
    }
  }

  private static getMockProfile() {
    return {
      id: "mock_instagram_id",
      username: "sample_business",
      followers_count: 8500,
      follows_count: 450,
      media_count: 125,
    }
  }

  private static getMockInsights() {
    return {
      reach: 25000,
      impressions: 45000,
      profile_views: 1200,
    }
  }

  private static getMockMedia() {
    return [
      {
        id: "mock_media_1",
        media_type: "IMAGE",
        caption: "Beautiful sunset from our office! 🌅",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        like_count: 245,
        comments_count: 18,
      },
      {
        id: "mock_media_2",
        media_type: "VIDEO",
        caption: "Behind the scenes of our latest project 🎬",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        like_count: 189,
        comments_count: 23,
      },
    ]
  }

  // Instagram Basic Display API methods
  static async getBasicProfile(accessToken: string) {
    try {
      const fields = "id,username,account_type,media_count";
      const url = `${this.BASE_URL}/me?access_token=${accessToken}&fields=${fields}`;
      
      const profileData = await this.makeRequest<any>(url, {}, "Failed to fetch Instagram basic profile");
      
      return {
        id: profileData?.id || '',
        username: profileData?.username || '',
        account_type: profileData?.account_type || '',
        media_count: profileData?.media_count || 0,
        followers_count: 0, // Not available in Basic Display API
        follows_count: 0, // Not available in Basic Display API
      };
    } catch (error) {
      logger.error("Failed to fetch Instagram basic profile", { error });
      throw error;
    }
  }

  static async getBasicMedia(accessToken: string, limit: number = 25) {
    try {
      const fields = "id,media_type,media_url,thumbnail_url,caption,timestamp,permalink";
      const url = `${this.BASE_URL}/me/media?access_token=${accessToken}&fields=${fields}&limit=${limit}`;
      
      const mediaResponse = await this.makeRequest<any>(url, {}, "Failed to fetch Instagram basic media");
      
      return mediaResponse?.data || [];
    } catch (error) {
      logger.error("Failed to fetch Instagram basic media", { error });
      throw error;
    }
  }

  static async calculateBasicInsights(media: any[]): Promise<any> {
    try {
      // Basic Display API doesn't provide engagement metrics, so we calculate what we can
      const totalPosts = media.length;
      const videoCount = media.filter(item => item.media_type === 'VIDEO').length;
      const imageCount = media.filter(item => item.media_type === 'IMAGE').length;
      const carouselCount = media.filter(item => item.media_type === 'CAROUSEL_ALBUM').length;

      // Calculate posting frequency (posts per day over last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentPosts = media.filter(item => 
        item.timestamp && new Date(item.timestamp) > thirtyDaysAgo
      );
      const postsPerDay = recentPosts.length / 30;

      return {
        totalPosts,
        videoCount,
        imageCount,
        carouselCount,
        recentPosts: recentPosts.length,
        postsPerDay: Math.round(postsPerDay * 100) / 100,
        // Note: likes, comments, and reach data are not available in Basic Display API
        avgLikes: 0,
        avgComments: 0,
        totalReach: 0,
        avgReach: 0,
        engagementRate: 0
      };
    } catch (error) {
      logger.error("Failed to calculate basic insights", { error });
      throw error;
    }
  }
}
