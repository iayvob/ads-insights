import { SocialPlatform } from "@/validations/posting-types"
import { AuthSession } from "@/validations/types"

export interface PlatformConnection {
  platform: SocialPlatform
  connected: boolean
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  username?: string
  userId?: string
  pageId?: string // For Facebook/Instagram pages
  accountName?: string
}

export class PlatformPostingService {
  /**
   * Get all connected platforms from session
   */
  static getConnectedPlatforms(session: AuthSession): PlatformConnection[] {
    const connections: PlatformConnection[] = []

    if (session.connectedPlatforms?.facebook) {
      const facebook = session.connectedPlatforms.facebook
      connections.push({
        platform: "facebook",
        connected: true,
        accessToken: facebook.account_tokens.access_token,
        refreshToken: facebook.account_tokens.refresh_token,
        expiresAt: new Date(facebook.account_tokens.expires_at),
        username: facebook.account.username,
        userId: facebook.account.userId,
        pageId: facebook.account.advertisingAccountId,
        accountName: facebook.account.username
      })
    }

    if (session.connectedPlatforms?.instagram) {
      const instagram = session.connectedPlatforms.instagram
      connections.push({
        platform: "instagram",
        connected: true,
        accessToken: instagram.account_tokens.access_token,
        refreshToken: instagram.account_tokens.refresh_token,
        expiresAt: new Date(instagram.account_tokens.expires_at),
        username: instagram.account.username,
        userId: instagram.account.userId,
        accountName: instagram.account.username
      })
    }

    if (session.connectedPlatforms?.twitter) {
      const twitter = session.connectedPlatforms.twitter
      connections.push({
        platform: "twitter",
        connected: true,
        accessToken: twitter.account_tokens.access_token,
        refreshToken: twitter.account_tokens.refresh_token,
        expiresAt: new Date(twitter.account_tokens.expires_at),
        username: twitter.account.username,
        userId: twitter.account.userId,
        accountName: twitter.account.username
      })
    }

    return connections
  }

  /**
   * Get specific platform connection
   */
  static getPlatformConnection(session: AuthSession, platform: SocialPlatform): PlatformConnection | null {
    const connections = this.getConnectedPlatforms(session)
    return connections.find(conn => conn.platform === platform) || null
  }

  /**
   * Check if platform connection is still valid
   */
  static isConnectionValid(connection: PlatformConnection): boolean {
    const now = new Date()
    return connection.connected && connection.expiresAt > now
  }

  /**
   * Post to platform using session data
   */
  static async postToPlatform(
    session: AuthSession,
    platform: SocialPlatform,
    content: {
      text?: string
      media?: Array<{
        id: string
        url: string
        type: 'image' | 'video'
      }>
      hashtags?: string[]
      mentions?: string[]
    }
  ): Promise<{
    success: boolean
    platformPostId?: string
    url?: string
    error?: string
  }> {
    const connection = this.getPlatformConnection(session, platform)

    if (!connection || !this.isConnectionValid(connection)) {
      return {
        success: false,
        error: `${platform} account not connected or token expired`
      }
    }

    try {
      switch (platform) {
        case "facebook":
          return await this.postToFacebook(connection, content)
        case "instagram":
          return await this.postToInstagram(connection, content)
        case "twitter":
          return await this.postToTwitter(connection, content)
        default:
          return {
            success: false,
            error: `Platform ${platform} not supported`
          }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to post to ${platform}`
      }
    }
  }

  /**
   * Post to Facebook using connection data
   */
  private static async postToFacebook(
    connection: PlatformConnection,
    content: any
  ) {
    const { accessToken, pageId } = connection

    // Facebook Graph API posting logic
    const pageAccessTokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${accessToken}`
    )

    const pageTokenData = await pageAccessTokenResponse.json()
    const pageAccessToken = pageTokenData.access_token

    const postData: any = {
      message: content.text || '',
      access_token: pageAccessToken
    }

    if (content.media && content.media.length > 0) {
      // Handle media posts
      postData.attached_media = content.media.map((media: any) => ({
        media_fbid: media.id
      }))
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      }
    )

    const result = await response.json()

    if (result.id) {
      return {
        success: true,
        platformPostId: result.id,
        url: `https://facebook.com/${result.id}`
      }
    } else {
      return {
        success: false,
        error: result.error?.message || 'Facebook posting failed'
      }
    }
  }

  /**
   * Post to Instagram using connection data
   */
  private static async postToInstagram(
    connection: PlatformConnection,
    content: any
  ) {
    const { accessToken, userId } = connection

    // Instagram Graph API posting logic using the latest Meta API standards
    try {
      // Step 0: Get Instagram Business Account ID
      // In production, this would be a call to Graph API
      if (!userId || !accessToken) {
        return {
          success: false,
          error: 'Missing Instagram user ID or access token'
        };
      }

      const igBusinessAccount = await this.getInstagramBusinessAccount(userId, accessToken);

      if (!igBusinessAccount) {
        return {
          success: false,
          error: 'Instagram Business Account not found. Make sure your Instagram account is connected to a Facebook Page.'
        };
      }

      if (content.media && content.media.length > 0) {
        // Determine post type
        const isCarousel = content.media.length > 1;
        const isVideo = content.media[0].type === 'video';

        if (isCarousel) {
          // Step 1: Create container for each carousel item
          const childContainers = [];

          for (const media of content.media) {
            const childContainer = await fetch(
              `https://graph.facebook.com/v19.0/${igBusinessAccount}/media`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  [media.type === 'video' ? 'video_url' : 'image_url']: media.url,
                  access_token: accessToken
                })
              }
            );

            const childResult = await childContainer.json();

            if (childResult.error) {
              return {
                success: false,
                error: `Failed to create media container: ${childResult.error.message}`
              };
            }

            childContainers.push(childResult.id);
          }

          // Step 2: Create carousel container
          const carouselContainer = await fetch(
            `https://graph.facebook.com/v19.0/${igBusinessAccount}/media`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                media_type: 'CAROUSEL',
                caption: content.text || '',
                children: childContainers,
                access_token: accessToken
              })
            }
          );

          const containerResult = await carouselContainer.json();

          if (containerResult.error) {
            return {
              success: false,
              error: `Failed to create carousel container: ${containerResult.error.message}`
            };
          }

          // Step 3: Publish the carousel
          return await this.publishInstagramMedia(igBusinessAccount, accessToken, containerResult.id, 'carousel');
        } else {
          // Single media post (image or video)
          // Step 1: Create media container
          const mediaContainer = await fetch(
            `https://graph.facebook.com/v19.0/${igBusinessAccount}/media`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                [isVideo ? 'video_url' : 'image_url']: content.media[0].url,
                caption: content.text || '',
                access_token: accessToken
              })
            }
          );

          const containerResult = await mediaContainer.json();

          if (containerResult.error) {
            return {
              success: false,
              error: `Failed to create media container: ${containerResult.error.message}`
            };
          }

          // Step 2: Publish the media
          return await this.publishInstagramMedia(igBusinessAccount, accessToken, containerResult.id, isVideo ? 'video' : 'image');
        }
      } else {
        // Instagram requires media for feed posts
        // For text-only content, we'd create a Story with text overlay
        return {
          success: false,
          error: 'Instagram requires media for posting. Text-only posts are not supported.'
        };
      }
    } catch (error) {
      console.error("Instagram posting error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Instagram posting failed'
      };
    }
  }

  /**
   * Post to Twitter using connection data
   * Delegates to the Twitter API route handler for proper media handling
   */
  private static async postToTwitter(
    connection: PlatformConnection,
    content: any
  ) {
    try {
      // Format content for Twitter API route
      const postData = {
        content: content.text || '',
        media: content.media || []
      }

      // Call the Twitter API route which handles media upload properly
      const response = await fetch('/api/posting/platforms/twitter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      })

      const result = await response.json()

      if (result.success && result.data) {
        return {
          success: true,
          platformPostId: result.data.id,
          url: result.data.url
        }
      } else {
        return {
          success: false,
          error: result.message || result.error || 'Twitter posting failed'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Twitter posting failed'
      }
    }
  }

  /**
   * Get Instagram Business Account ID from user ID and access token
   */
  private static async getInstagramBusinessAccount(userId: string, accessToken: string): Promise<string | null> {
    try {
      // First, get the Facebook Pages the user has access to
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
      );

      const pagesData = await pagesResponse.json();

      if (pagesData.error || !pagesData.data || pagesData.data.length === 0) {
        console.error("No Facebook Pages found:", pagesData.error);
        return null;
      }

      // For each page, check if it has an Instagram Business Account
      for (const page of pagesData.data) {
        const igAccountResponse = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );

        const igAccountData = await igAccountResponse.json();

        if (igAccountData.instagram_business_account?.id) {
          return igAccountData.instagram_business_account.id;
        }
      }

      console.error("No Instagram Business Account found for user");
      return null;
    } catch (error) {
      console.error("Error retrieving Instagram Business Account ID:", error);
      return null;
    }
  }

  /**
   * Publish media to Instagram using creation ID
   */
  private static async publishInstagramMedia(
    igBusinessAccountId: string,
    accessToken: string,
    creationId: string,
    mediaType: 'image' | 'video' | 'carousel'
  ): Promise<{
    success: boolean;
    platformPostId?: string;
    url?: string;
    error?: string;
  }> {
    try {
      // Publish the media
      const publishResponse = await fetch(
        `https://graph.facebook.com/v19.0/${igBusinessAccountId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: accessToken
          })
        }
      );

      const publishResult = await publishResponse.json();

      if (publishResult.error) {
        return {
          success: false,
          error: publishResult.error.message || 'Failed to publish Instagram media'
        };
      }

      // Get media details
      const mediaResponse = await fetch(
        `https://graph.facebook.com/v19.0/${publishResult.id}?fields=id,permalink&access_token=${accessToken}`
      );

      const mediaDetails = await mediaResponse.json();
      const permalink = mediaDetails.permalink || `https://instagram.com/p/${publishResult.id}`;

      return {
        success: true,
        platformPostId: publishResult.id,
        url: permalink
      };
    } catch (error) {
      console.error("Error publishing Instagram media:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish Instagram media'
      };
    }
  }
}
