import { logger } from "@/config/logger"
import { AuthError } from "../../lib/errors"

export class InstagramInsightsService {
  private static readonly BASE_URL = "https://graph.facebook.com/v23.0" // Updated to Facebook Graph API v23.0 for Instagram Business
  
  static async getInsights(accessToken: string) {
    try {
      const [profile, insights, media] = await Promise.all([
        this.getProfile(accessToken),
        this.getInsightsData(accessToken),
        this.getRecentMedia(accessToken),
      ])

      return {
        profile,
        insights,
        media,
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      logger.error("Failed to fetch Instagram insights", { error })
      throw new AuthError("Failed to fetch Instagram data")
    }
  }

  private static async getProfile(accessToken: string) {
    try {
      // First get Facebook pages with Instagram Business accounts
      const pagesResponse = await fetch(
        `${this.BASE_URL}/me/accounts?access_token=${accessToken}&fields=instagram_business_account{id,username,followers_count,media_count,profile_picture_url}`
      );

      if (!pagesResponse.ok) {
        throw new Error("Failed to fetch pages data")
      }

      const pagesData = await pagesResponse.json();
      
      // Find the first page with an Instagram Business account
      const pageWithInstagram = pagesData.data?.find((page: any) => page.instagram_business_account);
      
      if (pageWithInstagram?.instagram_business_account) {
        return {
          id: pageWithInstagram.instagram_business_account.id,
          username: pageWithInstagram.instagram_business_account.username,
          followers_count: pageWithInstagram.instagram_business_account.followers_count || 0,
          follows_count: 0, // Not available in Business API
          media_count: pageWithInstagram.instagram_business_account.media_count || 0,
          profile_picture_url: pageWithInstagram.instagram_business_account.profile_picture_url
        };
      }

      // Fallback - try direct Instagram accounts
      const directResponse = await fetch(
        `${this.BASE_URL}/me?access_token=${accessToken}&fields=instagram_accounts{id,username,profile_picture_url}`
      );
      
      if (directResponse.ok) {
        const directData = await directResponse.json();
        const igAccount = directData.instagram_accounts?.data?.[0];
        if (igAccount) {
          return {
            id: igAccount.id,
            username: igAccount.username,
            followers_count: 0,
            follows_count: 0,
            media_count: 0,
            profile_picture_url: igAccount.profile_picture_url
          };
        }
      }

      return {};
    } catch (error) {
      logger.warn("Failed to fetch Instagram profile", { error })
      return {}
    }
  }

  private static async getInsightsData(accessToken: string) {
    try {
      // First get the Instagram Business account ID
      const pagesResponse = await fetch(
        `${this.BASE_URL}/me/accounts?access_token=${accessToken}&fields=instagram_business_account{id}`
      );

      if (!pagesResponse.ok) {
        throw new Error("Failed to fetch pages data");
      }

      const pagesData = await pagesResponse.json();
      const pageWithInstagram = pagesData.data?.find((page: any) => page.instagram_business_account);
      
      if (!pageWithInstagram?.instagram_business_account?.id) {
        logger.warn("No Instagram Business account found");
        return {
          reach: 0,
          impressions: 0,
          profile_views: 0,
          engagement: 0,
          avg_engagement: 0,
          story_views: 0,
        };
      }

      const igBusinessId = pageWithInstagram.instagram_business_account.id;

      // Get insights for Instagram Business account
      const insightsResponse = await fetch(
        `${this.BASE_URL}/${igBusinessId}/insights?access_token=${accessToken}&metric=impressions,reach,profile_views&period=week`
      );

      if (!insightsResponse.ok) {
        throw new Error("Failed to fetch insights data");
      }

      const data = await insightsResponse.json();

      // Process insights data
      const insights = {
        reach: 0,
        impressions: 0,
        profile_views: 0,
        engagement: 0,
        avg_engagement: 0,
        story_views: 0,
      }

      if (data.data) {
        data.data.forEach((metric: any) => {
          const latestValue = metric.values?.[metric.values.length - 1]?.value || 0

          switch (metric.name) {
            case "reach":
              insights.reach = latestValue
              break
            case "impressions":
              insights.impressions = latestValue
              break
            case "profile_views":
              insights.profile_views = latestValue
              break
          }
        })
      }

      return insights
    } catch (error) {
      logger.warn("Failed to fetch Instagram insights", { error })
      return {
        reach: 0,
        impressions: 0,
        profile_views: 0,
        engagement: 0,
        avg_engagement: 0,
        story_views: 0,
      }
    }
  }

  private static async getRecentMedia(accessToken: string) {
    try {
      // First get the Instagram Business account ID
      const pagesResponse = await fetch(
        `${this.BASE_URL}/me/accounts?access_token=${accessToken}&fields=instagram_business_account{id}`
      );

      if (!pagesResponse.ok) {
        throw new Error("Failed to fetch pages data");
      }

      const pagesData = await pagesResponse.json();
      const pageWithInstagram = pagesData.data?.find((page: any) => page.instagram_business_account);
      
      if (!pageWithInstagram?.instagram_business_account?.id) {
        logger.warn("No Instagram Business account found for media fetch");
        return [];
      }

      const igBusinessId = pageWithInstagram.instagram_business_account.id;

      // Get recent media for Instagram Business account
      const response = await fetch(
        `${this.BASE_URL}/${igBusinessId}/media?access_token=${accessToken}&fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=10`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch media data");
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.warn("Failed to fetch Instagram media", { error })
      return []
    }
  }
}
