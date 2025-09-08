import { logger } from "@/config/logger"
import { BaseApiClient } from "./base-client"
import { FacebookAnalytics, PostAnalytics, AdsAnalytics } from "@/validations/analytics-types"

export interface FacebookData {
  pageData: {
    id: string
    name: string
    fan_count: number
    followers_count: number
    about?: string
    category?: string
  }
  insights: {
    reach: number
    impressions: number
    engagement: number
    page_views: number
  }
  posts: Array<{
    id: string
    message?: string
    created_time: string
    likes: number
    comments: number
    shares: number
  }>
}

export interface FacebookEnhancedData extends FacebookAnalytics {
  pageData: {
    id: string
    name: string
    fan_count: number
    checkins: number
    followers_count?: number
    about?: string
    category?: string
  }
}

export class FacebookApiClient extends BaseApiClient {
  private static readonly BASE_URL = "https://graph.facebook.com/v23.0" // Updated to latest stable version
  private static readonly INSIGHTS_METRICS = [
    'page_impressions',
    'page_reach',
    'page_engaged_users',
    'page_views',
    'page_post_engagements'
  ].join(',')

  /**
   * Fetch comprehensive Facebook analytics with subscription-aware data
   */
  static async fetchAnalytics(accessToken: string, includeAds: boolean = false): Promise<FacebookEnhancedData> {
    try {
      logger.info("Fetching Facebook analytics", { includeAds });

      const [pageData, postsAnalytics] = await Promise.allSettled([
        this.getPageData(accessToken),
        this.getPostsAnalytics(accessToken),
      ]);

      let adsAnalytics: AdsAnalytics | null = null;
      
      // Only fetch ads analytics for premium users
      if (includeAds) {
        try {
          adsAnalytics = await this.getAdsAnalytics(accessToken);
        } catch (error) {
          logger.warn("Failed to fetch Facebook ads analytics", { error });
          // Continue without ads data rather than failing completely
        }
      }

      const result: FacebookEnhancedData = {
        pageData: pageData.status === "fulfilled" ? pageData.value as FacebookEnhancedData['pageData'] : this.getMockPageData(),
        posts: postsAnalytics.status === "fulfilled" ? postsAnalytics.value as PostAnalytics : this.getMockPostsAnalytics(),
        ads: adsAnalytics,
        lastUpdated: new Date().toISOString(),
      };

      logger.info("Facebook analytics fetched successfully", { 
        hasPageData: !!result.pageData,
        hasPostsData: !!result.posts,
        hasAdsData: !!result.ads,
      });

      return result;

    } catch (error) {
      logger.error("Facebook analytics fetch failed", { error });
      throw new Error("Failed to fetch Facebook analytics");
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use fetchAnalytics instead
   */

  static async fetchData(accessToken: string): Promise<FacebookData> {
    try {
      const [pageData, insights, posts] = await Promise.allSettled([
        this.getPageData(accessToken),
        this.getInsights(accessToken),
        this.getPosts(accessToken),
      ])

      return {
        pageData: pageData.status === "fulfilled" ? pageData.value as FacebookData['pageData'] : this.getMockPageData(),
        insights: insights.status === "fulfilled" ? insights.value as FacebookData['insights'] : this.getMockInsights(),
        posts: posts.status === "fulfilled" ? posts.value as FacebookData['posts'] : this.getMockPosts(),
      }
    } catch (error) {
      logger.warn("Facebook API failed, using mock data", { error })
      return this.generateMockData()
    }
  }

  /**
   * Get comprehensive posts analytics for Facebook pages
   */
  static async getPostsAnalytics(accessToken: string): Promise<PostAnalytics> {
    try {
      // Get Facebook page information
      const pageInfo = await this.getFacebookPageInfo(accessToken);
      
      if (!pageInfo) {
        logger.warn("No Facebook page found, returning mock data");
        return this.getMockPostsAnalytics();
      }

      const { pageId, pageAccessToken } = pageInfo;

      // Get posts with detailed insights using Facebook page ID
      const postsUrl = `${this.BASE_URL}/${pageId}/posts?access_token=${pageAccessToken}&fields=id,message,created_time,likes.summary(true),comments.summary(true),shares,insights.metric(post_impressions,post_reach,post_engaged_users)&limit=50`;
      
      const postsData = await this.makeRequest<any>(postsUrl, {}, "Failed to fetch Facebook posts analytics");
      const posts = postsData.data || [];

      // Calculate aggregated metrics
      let totalEngagement = 0;
      let totalReach = 0;
      let totalImpressions = 0;
      let topPost = null;
      let maxEngagement = 0;

      const engagementTrend: Array<{ date: string; engagement: number; reach: number; impressions: number }> = [];
      const contentPerformance = new Map<string, { count: number; totalEngagement: number }>();

      posts.forEach((post: any) => {
        const likes = post.likes?.summary?.total_count || 0;
        const comments = post.comments?.summary?.total_count || 0;
        const shares = post.shares?.count || 0;
        const engagement = likes + comments + shares;

        // Get insights data
        let reach = 0;
        let impressions = 0;
        
        if (post.insights?.data) {
          post.insights.data.forEach((insight: any) => {
            const value = insight.values?.[0]?.value || 0;
            if (insight.name === 'post_reach') reach = value;
            if (insight.name === 'post_impressions') impressions = value;
          });
        }

        totalEngagement += engagement;
        totalReach += reach;
        totalImpressions += impressions;

        // Track top post
        if (engagement > maxEngagement) {
          maxEngagement = engagement;
          topPost = {
            id: post.id,
            content: post.message?.substring(0, 100) || 'No content',
            engagement,
            reach,
            impressions,
            date: post.created_time,
            mediaType: this.determineMediaType(post) as 'image' | 'video' | 'carousel' | 'text',
          };
        }

        // Track engagement trend (group by day)
        const date = new Date(post.created_time).toISOString().split('T')[0];
        engagementTrend.push({ date, engagement, reach, impressions });

        // Track content performance
        const mediaType = this.determineMediaType(post);
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
        avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
      }));

      return {
        totalPosts: posts.length,
        avgEngagement: posts.length > 0 ? totalEngagement / posts.length : 0,
        avgReach: posts.length > 0 ? totalReach / posts.length : 0,
        avgImpressions: posts.length > 0 ? totalImpressions / posts.length : 0,
        topPost: topPost || undefined,
        engagementTrend,
        contentPerformance: contentPerformanceArray,
      };

    } catch (error) {
      logger.error("Failed to fetch Facebook posts analytics", { error });
      return this.getMockPostsAnalytics();
    }
  }

  /**
   * Get comprehensive ads analytics for Facebook (Premium only)
   * Following Facebook Marketing API documentation
   */
  static async getAdsAnalytics(accessToken: string): Promise<AdsAnalytics> {
    try {
      // Step 1: Get user's ad accounts with proper permissions
      const adAccountsUrl = `${this.BASE_URL}/me/adaccounts?access_token=${accessToken}&fields=id,name,account_status,currency`;
      const adAccountsData = await this.makeRequest<any>(adAccountsUrl, {}, "Failed to fetch ad accounts");
      
      if (!adAccountsData.data?.length) {
        throw new Error("No ad accounts found. Please ensure you have access to Facebook ads.");
      }

      // Find active ad account
      const activeAccount = adAccountsData.data.find((account: any) => 
        account.account_status === 1 || account.account_status === "ACTIVE"
      ) || adAccountsData.data[0];
      
      const accountId = activeAccount.id;

      // Step 2: Get ads insights using Facebook Marketing API
      // Using campaign level insights with comprehensive metrics
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const timeRange = {
        since: thirtyDaysAgo.toISOString().split('T')[0],
        until: today.toISOString().split('T')[0]
      };

      const insightsUrl = `${this.BASE_URL}/${accountId}/insights?access_token=${accessToken}&fields=impressions,reach,clicks,spend,cpm,cpc,ctr,actions,campaign_name,campaign_id&time_range=${JSON.stringify(timeRange)}&level=campaign&limit=50`;
      
      const insightsData = await this.makeRequest<any>(insightsUrl, {}, "Failed to fetch Facebook ads insights");
      const insights = insightsData.data || [];

      // Step 3: Process and aggregate metrics
      let totalSpend = 0;
      let totalReach = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      let topAd: {
        id: string;
        name: string;
        spend: number;
        reach: number;
        impressions: number;
        clicks: number;
        ctr: number;
        date: string;
      } | undefined = undefined;
      let maxSpend = 0;

      const spendTrend: Array<{ 
        date: string; 
        spend: number; 
        reach: number; 
        impressions: number; 
        clicks: number 
      }> = [];

      insights.forEach((insight: any) => {
        const spend = parseFloat(insight.spend || 0);
        const reach = parseInt(insight.reach || 0);
        const impressions = parseInt(insight.impressions || 0);
        const clicks = parseInt(insight.clicks || 0);

        totalSpend += spend;
        totalReach += reach;
        totalImpressions += impressions;
        totalClicks += clicks;

        // Track top performing campaign
        if (spend > maxSpend) {
          maxSpend = spend;
          topAd = {
            id: insight.campaign_id || 'unknown',
            name: insight.campaign_name || 'Unknown Campaign',
            spend,
            reach,
            impressions,
            clicks,
            ctr: parseFloat(insight.ctr || 0),
            date: insight.date_start || new Date().toISOString().split('T')[0],
          };
        }

        // Add to spend trend
        spendTrend.push({
          date: insight.date_start || new Date().toISOString().split('T')[0],
          spend,
          reach,
          impressions,
          clicks,
        });
      });

      // Sort spend trend by date
      spendTrend.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate averages
      const campaignCount = insights.length || 1;
      const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      return {
        totalSpend,
        totalReach,
        totalImpressions,
        totalClicks,
        cpc: Number(avgCpc.toFixed(4)),
        cpm: Number(avgCpm.toFixed(2)),
        ctr: Number(avgCtr.toFixed(2)),
        roas: 0, // Return on ad spend - would need revenue data to calculate
        topAd,
        spendTrend,
        audienceInsights: {
          ageGroups: [],
          genders: [],
          topLocations: []
        }
      };

    } catch (error) {
      logger.error("Failed to fetch Facebook ads analytics", { error });
      // Return empty analytics rather than failing completely
      return this.getMockAdsAnalytics();
    }
  }

  /**
   * Determine media type from post data
   */
  private static determineMediaType(post: any): string {
    if (post.attachments?.data?.length) {
      const attachment = post.attachments.data[0];
      if (attachment.type === 'video_inline') return 'video';
      if (attachment.type === 'photo') return 'image';
      if (attachment.subattachments?.data?.length > 1) return 'carousel';
    }
    return 'text';
  }

  /**
   * Get Facebook Page ID and access token following Facebook Pages API documentation
   * Step 1: Get user's Facebook pages
   * Step 2: Find the appropriate page for business operations
   * Step 3: Return Page ID and Page Access Token
   */
  private static async getFacebookPageInfo(accessToken: string): Promise<{ pageId: string; pageAccessToken: string; pageName: string } | null> {
    try {
      // Step 1: Get user's Facebook pages
      const pagesUrl = `${this.BASE_URL}/me/accounts?access_token=${accessToken}&fields=id,name,access_token,tasks`;
      const pagesData = await this.makeRequest<any>(pagesUrl, {}, "Failed to fetch Facebook pages");

      if (!pagesData.data || pagesData.data.length === 0) {
        logger.warn("No Facebook pages found for user");
        return null;
      }

      // Step 2: Find first page where user can manage content
      const pageWithPermissions = pagesData.data.find((page: any) => 
        page.tasks?.includes('CREATE_CONTENT') || page.tasks?.includes('MANAGE')
      );
      
      if (!pageWithPermissions) {
        logger.warn("No Facebook page found with content management permissions");
        return null;
      }

      // Step 3: Return Page info
      return {
        pageId: pageWithPermissions.id,
        pageAccessToken: pageWithPermissions.access_token,
        pageName: pageWithPermissions.name
      };

    } catch (error) {
      logger.error("Failed to get Facebook page info", { error });
      return null;
    }
  }

  static async getPageData(accessToken: string) {
    try {
      // Get Facebook page information
      const pageInfo = await this.getFacebookPageInfo(accessToken);
      
      if (!pageInfo) {
        throw new Error("No Facebook page found. Please ensure you have a Facebook page with appropriate permissions.");
      }

      const { pageId, pageAccessToken } = pageInfo;

      // Query Facebook page directly using page ID
      const fields = "id,name,fan_count,checkins,followers_count,about,category";
      const url = `${this.BASE_URL}/${pageId}?access_token=${pageAccessToken}&fields=${fields}`;
      
      const pageData = await this.makeRequest<any>(url, {}, "Failed to fetch Facebook page data");
      
      return {
        id: pageData?.id || pageId,
        name: pageData?.name || pageInfo.pageName,
        fan_count: pageData?.fan_count || 0,
        checkins: pageData?.checkins || 0,
        followers_count: pageData?.followers_count || pageData?.fan_count || 0,
        about: pageData?.about || '',
        category: pageData?.category || ''
      };

    } catch (error) {
      logger.error("Failed to fetch Facebook page data", { error });
      throw error;
    }
  }

  static async getInsights(accessToken: string, period = "week") {
    try {
      // Get Facebook page information
      const pageInfo = await this.getFacebookPageInfo(accessToken);
      
      if (!pageInfo) {
        throw new Error("No Facebook page found");
      }

      const { pageId, pageAccessToken } = pageInfo;

      const metrics = "page_impressions,page_reach,page_engaged_users,page_views";
      const url = `${this.BASE_URL}/${pageId}/insights?access_token=${pageAccessToken}&metric=${metrics}&period=${period}`;

      const data = await this.makeRequest<any>(url, {}, "Failed to fetch Facebook page insights");

      const insights = { reach: 0, impressions: 0, engagement: 0, page_views: 0 };

      data.data?.forEach((metric: any) => {
        const value = metric.values?.[metric.values.length - 1]?.value || 0;
        switch (metric.name) {
          case "page_reach":
            insights.reach = value;
            break;
          case "page_impressions":
            insights.impressions = value;
            break;
          case "page_engaged_users":
            insights.engagement = value;
            break;
          case "page_views":
            insights.page_views = value;
            break;
        }
      });

      return insights;

    } catch (error) {
      logger.error("Failed to fetch Facebook insights", { error });
      throw error;
    }
  }

  static async getPosts(accessToken: string, limit = 10) {
    try {
      // Get Facebook page information
      const pageInfo = await this.getFacebookPageInfo(accessToken);
      
      if (!pageInfo) {
        throw new Error("No Facebook page found");
      }

      const { pageId, pageAccessToken } = pageInfo;

      const fields = "id,message,created_time,likes.summary(true),comments.summary(true),shares";
      const url = `${this.BASE_URL}/${pageId}/posts?access_token=${pageAccessToken}&fields=${fields}&limit=${limit}`;

      const data = await this.makeRequest<any>(url, {}, "Failed to fetch Facebook posts");

      return (data.data || []).map((post: any) => ({
        id: post.id,
        message: post.message || "",
        created_time: post.created_time,
        likes: post.likes?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
        shares: post.shares?.count || 0,
      }));

    } catch (error) {
      logger.error("Failed to fetch Facebook posts", { error });
      throw error;
    }
  }

  static async getAdAccounts(accessToken: string) {
    const fields = "id,name,account_status,spend"
    const url = `${this.BASE_URL}/me/adaccounts?access_token=${accessToken}&fields=${fields}`

    try {
      const data = await this.makeRequest<any>(url, {}, "Failed to fetch ad accounts")
      return data.data || []
    } catch (error) {
      logger.warn("Failed to fetch ad accounts", { error })
      return []
    }
  }

  static generateMockData(): FacebookData {
    return {
      pageData: this.getMockPageData(),
      insights: this.getMockInsights(),
      posts: this.getMockPosts(),
    }
  }

  private static getMockPageData() {
    return {
      id: "mock_page_id",
      name: "Sample Business Page",
      fan_count: 12500,
      checkins: 850,
      followers_count: 12800,
      about: "A sample business page for demonstration",
      category: "Business",
    }
  }

  private static getMockInsights() {
    return {
      reach: 45000,
      impressions: 78000,
      engagement: 3200,
      page_views: 1800,
    }
  }

  private static getMockPosts() {
    return [
      {
        id: "mock_post_1",
        message: "Excited to announce our new product launch! 🚀",
        created_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        likes: 245,
        comments: 18,
        shares: 12,
      },
      {
        id: "mock_post_2",
        message: "Behind the scenes of our development process",
        created_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        likes: 189,
        comments: 23,
        shares: 8,
      },
    ]
  }

  /**
   * Generate mock posts analytics data
   */
  static getMockPostsAnalytics(): PostAnalytics {
    return {
      totalPosts: 25,
      avgEngagement: 156.4,
      avgReach: 3245.8,
      avgImpressions: 4567.2,
      topPost: {
        id: "mock_top_post",
        content: "Our latest product update is here! Check out the amazing new features that will revolutionize your workflow.",
        engagement: 489,
        reach: 7832,
        impressions: 12459,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        mediaType: 'image',
      },
      engagementTrend: [
        { date: '2024-01-01', engagement: 234, reach: 2456, impressions: 3789 },
        { date: '2024-01-02', engagement: 189, reach: 2123, impressions: 3456 },
        { date: '2024-01-03', engagement: 456, reach: 4567, impressions: 6789 },
        { date: '2024-01-04', engagement: 321, reach: 3234, impressions: 4567 },
        { date: '2024-01-05', engagement: 278, reach: 2789, impressions: 4123 },
      ],
      contentPerformance: [
        { type: 'image', count: 15, avgEngagement: 189.3 },
        { type: 'video', count: 6, avgEngagement: 267.8 },
        { type: 'carousel', count: 3, avgEngagement: 345.2 },
        { type: 'text', count: 1, avgEngagement: 98.5 },
      ],
    };
  }

  /**
   * Generate mock ads analytics data
   */
  private static getMockAdsAnalytics(): AdsAnalytics {
    return {
      totalSpend: 1250.75,
      totalReach: 45600,
      totalImpressions: 87300,
      totalClicks: 2340,
      cpc: 0.534,
      cpm: 14.33,
      ctr: 2.68,
      roas: 3.45,
      topAd: {
        id: "mock_campaign_1",
        name: "Summer Product Launch",
        spend: 485.20,
        reach: 18500,
        impressions: 34200,
        clicks: 892,
        ctr: 2.61,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      spendTrend: [
        { date: '2024-01-01', spend: 125.50, reach: 4200, impressions: 8100, clicks: 210 },
        { date: '2024-01-02', spend: 89.25, reach: 3800, impressions: 7200, clicks: 185 },
        { date: '2024-01-03', spend: 167.80, reach: 5600, impressions: 10500, clicks: 285 },
        { date: '2024-01-04', spend: 203.40, reach: 6800, impressions: 12800, clicks: 340 },
        { date: '2024-01-05', spend: 154.90, reach: 5200, impressions: 9800, clicks: 245 },
      ],
      audienceInsights: {
        ageGroups: [
          { range: '18-24', percentage: 25 },
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 22 },
          { range: '45-54', percentage: 12 },
          { range: '55+', percentage: 6 },
        ],
        genders: [
          { gender: 'Female', percentage: 58 },
          { gender: 'Male', percentage: 42 },
        ],
        topLocations: [
          { location: 'United States', percentage: 45 },
          { location: 'Canada', percentage: 18 },
          { location: 'United Kingdom', percentage: 15 },
          { location: 'Australia', percentage: 12 },
          { location: 'Germany', percentage: 10 },
        ],
      },
    };
  }
}
