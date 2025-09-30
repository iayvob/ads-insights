import { SocialPlatform } from "@/validations/posting-types"
import { AuthSession } from "@/validations/types"
import { prisma } from "@/config/database/prisma"

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
  accessTokenSecret?: string // For Twitter OAuth 1.0a (if needed)
}

export interface PostContent {
  text?: string
  media?: Array<{
    id: string
    url: string
    type: 'image' | 'video'
    altText?: string
  }>
  hashtags?: string[]
  mentions?: string[]
  // Amazon-specific content
  brandContent?: {
    brandName: string
    headline?: string
    targetAudience?: string
    productHighlights?: string[]
  }
  productASINs?: string[]
  // TikTok-specific content
  tiktokContent?: {
    advertiserId: string
    videoProperties?: {
      title?: string
      description?: string
      tags?: string[]
      category?: string
      language?: string
      thumbnailTime?: number
    }
    privacy?: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY'
    allowComments?: boolean
    allowDuet?: boolean
    allowStitch?: boolean
    brandedContent?: boolean
    promotionalContent?: boolean
  }
}

export class PlatformPostingService {
  /**
   * Get all connected platforms from session
   */
  static async getConnectedPlatforms(session: AuthSession): Promise<PlatformConnection[]> {
    const connections: PlatformConnection[] = []

    if (session.connectedPlatforms?.facebook) {
      const facebook = session.connectedPlatforms.facebook

      // Get Facebook Page ID from AuthProvider businessAccounts 
      const authProvider = await prisma.authProvider.findFirst({
        where: {
          userId: session.userId,
          provider: 'facebook'
        }
      });

      let pageId = null;
      let pageName = facebook.account.username;

      if (authProvider?.businessAccounts) {
        try {
          const businessData = JSON.parse(authProvider.businessAccounts);
          console.log('Raw Facebook business data keys:', Object.keys(businessData));
          console.log('Facebook business data structure:', {
            hasBusinessAccounts: !!businessData.business_accounts,
            hasFacebookPages: !!businessData.facebook_pages,
            hasPages: !!businessData.pages,
            businessAccountsCount: businessData.business_accounts?.length || 0,
            facebookPagesCount: businessData.facebook_pages?.length || 0,
            pagesCount: businessData.pages?.length || 0
          });

          // Try all possible page arrays
          let pages = [];
          if (businessData.facebook_pages && businessData.facebook_pages.length > 0) {
            pages = businessData.facebook_pages;
            console.log('Using facebook_pages');
          } else if (businessData.business_accounts && businessData.business_accounts.length > 0) {
            pages = businessData.business_accounts;
            console.log('Using business_accounts');
          } else if (businessData.pages && businessData.pages.length > 0) {
            pages = businessData.pages;
            console.log('Using pages');
          }

          console.log('Facebook pages found:', pages.length, pages.map((p: any) => ({
            id: p.id,
            name: p.name,
            tasks: p.tasks,
            hasCreateContent: p.tasks && p.tasks.includes ? p.tasks.includes('CREATE_CONTENT') : false
          })));

          // Find a page with CREATE_CONTENT permissions, or just use the first one
          const primaryPage = pages.find((page: any) =>
            page.tasks && page.tasks.includes && page.tasks.includes('CREATE_CONTENT')
          ) || pages[0];

          if (primaryPage) {
            pageId = primaryPage.id;
            pageName = primaryPage.name || pageName;
            console.log('✅ Selected Facebook page:', {
              id: pageId,
              name: pageName,
              tasks: primaryPage.tasks,
              hasCreateContent: primaryPage.tasks && primaryPage.tasks.includes ? primaryPage.tasks.includes('CREATE_CONTENT') : false
            });
          } else {
            console.log('❌ No Facebook pages found in any array');
          }
        } catch (e) {
          console.error('Error parsing Facebook business accounts:', e, authProvider.businessAccounts?.substring(0, 200));
        }
      } else {
        console.log('❌ No businessAccounts field found in authProvider');
      }      // Fallback: try to use advertisingAccountId if no pages found (though this is likely wrong)
      if (!pageId && authProvider?.advertisingAccountId) {
        console.warn('No Facebook pages found, falling back to advertising account ID');
        pageId = authProvider.advertisingAccountId;
      }

      if (pageId) {
        connections.push({
          platform: "facebook",
          connected: true,
          accessToken: facebook.account_tokens.access_token,
          refreshToken: facebook.account_tokens.refresh_token,
          expiresAt: new Date(facebook.account_tokens.expires_at),
          username: facebook.account.username,
          userId: facebook.account.userId,
          pageId: pageId,
          accountName: pageName
        })
      }
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

    if (session.connectedPlatforms?.amazon) {
      const amazon = session.connectedPlatforms.amazon
      connections.push({
        platform: "amazon",
        connected: true,
        accessToken: amazon.account_tokens.access_token,
        refreshToken: amazon.account_tokens.refresh_token,
        expiresAt: new Date(amazon.account_tokens.expires_at),
        username: amazon.account.username,
        userId: amazon.account.userId,
        accountName: amazon.account.username
      })
    }

    if (session.connectedPlatforms?.tiktok) {
      const tiktok = session.connectedPlatforms.tiktok
      connections.push({
        platform: "tiktok",
        connected: true,
        accessToken: tiktok.account_tokens.access_token,
        refreshToken: tiktok.account_tokens.refresh_token,
        expiresAt: new Date(tiktok.account_tokens.expires_at),
        username: tiktok.account.username,
        userId: tiktok.account.userId,
        accountName: tiktok.account.username
      })
    }

    return connections
  }

  /**
   * Get specific platform connection
   */
  static async getPlatformConnection(session: AuthSession, platform: SocialPlatform): Promise<PlatformConnection | null> {
    const connections = await this.getConnectedPlatforms(session)
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
    content: PostContent
  ): Promise<{
    success: boolean
    platformPostId?: string
    url?: string
    error?: string
  }> {
    const connection = await this.getPlatformConnection(session, platform)

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
        case "amazon":
          return await this.postToAmazon(connection, content)
        case "tiktok":
          return await this.postToTikTok(connection, content)
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

    // Facebook Graph API posting logic - get page access token first
    const pageAccessTokenResponse = await fetch(
      `https://graph.facebook.com/v23.0/${pageId}?fields=access_token&access_token=${accessToken}`
    )

    if (!pageAccessTokenResponse.ok) {
      console.error('Failed to get Facebook page access token:', pageAccessTokenResponse.status);
      return {
        success: false,
        error: 'Failed to get page access token'
      }
    }

    const pageTokenData = await pageAccessTokenResponse.json()

    if (pageTokenData.error) {
      console.error('Facebook page access token error:', pageTokenData.error);
      return {
        success: false,
        error: pageTokenData.error.message || 'Failed to get page access token'
      }
    }

    const pageAccessToken = pageTokenData.access_token

    if (!pageAccessToken) {
      console.error('No page access token received from Facebook');
      return {
        success: false,
        error: 'No page access token received'
      }
    }

    // Ensure pageAccessToken is a string for TypeScript
    const validPageAccessToken = String(pageAccessToken)

    const postData: any = {
      message: content.text || '',
      access_token: validPageAccessToken
    }

    // Handle media posts - upload media first to get Facebook media IDs
    if (content.media && content.media.length > 0) {
      console.log('🔍 Facebook: Uploading media files first', content.media.length);

      try {
        const { postImage, postVideo } = await import('@/lib/facebook');
        const facebookMediaIds: string[] = [];

        for (const media of content.media) {
          console.log('🔍 Facebook: Processing media', { url: media.url, type: media.type });

          // Ensure we have valid parameters for Facebook API
          const mediaCaption = content.text || 'Posted via Social Media Manager';
          const mediaUrl = media.url;

          // Skip if media URL is not available
          if (!mediaUrl) {
            console.warn('❌ Facebook: Skipping media with missing URL');
            continue;
          }

          try {
            if (media.type === 'image') {
              const result = await postImage(pageId, validPageAccessToken, mediaUrl!, mediaCaption);
              console.log('✅ Facebook: Image uploaded', result);
              if (result && typeof result === 'object' && 'id' in result) {
                facebookMediaIds.push(String(result.id));
              }
            } else if (media.type === 'video') {
              const result = await postVideo(pageId, validPageAccessToken, mediaUrl!, mediaCaption);
              console.log('✅ Facebook: Video uploaded', result);
              if (result && typeof result === 'object' && 'id' in result) {
                facebookMediaIds.push(String(result.id));
              }
            }
          } catch (uploadError) {
            console.error('❌ Facebook: Media upload failed', uploadError);
            // Continue with other media files
          }
        }

        console.log('🔍 Facebook: All media processed, IDs:', facebookMediaIds);

        if (facebookMediaIds.length > 0) {
          // If we have media, the postImage/postVideo functions already created the posts
          return {
            success: true,
            platformPostId: facebookMediaIds[0], // Use first media ID as post ID
            url: `https://facebook.com/${facebookMediaIds[0]}`
          }
        }
      } catch (error) {
        console.error('❌ Facebook: Media processing failed', error);
        // Fall back to text-only post
      }
    } const response = await fetch(
      `https://graph.facebook.com/v23.0/${pageId}/feed`,
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

    // Instagram Graph API posting logic using URL-based approach
    try {
      // Step 0: Get Instagram Business Account ID
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
        console.log('🔍 Instagram: Uploading media files', content.media.length);

        try {
          // Import Instagram helper functions
          const { postInstagramImage, postInstagramVideo, postInstagramCarousel } = await import('@/lib/instagram');

          // Determine post type
          const isCarousel = content.media.length > 1;
          const isVideo = content.media[0].type === 'video';

          let result;

          if (isCarousel) {
            // Multiple media items - create carousel
            console.log('🔍 Instagram: Creating carousel post');
            result = await postInstagramCarousel(
              igBusinessAccount,
              accessToken,
              content.media.map((m: any) => ({ url: m.url, type: m.type })),
              content.text || ''
            );
          } else if (isVideo) {
            // Single video post
            console.log('🔍 Instagram: Creating video post');
            result = await postInstagramVideo(
              igBusinessAccount,
              accessToken,
              content.media[0].url,
              content.text || ''
            );
          } else {
            // Single image post
            console.log('🔍 Instagram: Creating image post');
            result = await postInstagramImage(
              igBusinessAccount,
              accessToken,
              content.media[0].url,
              content.text || ''
            );
          }

          console.log('✅ Instagram: Media uploaded successfully:', result.id);

          return {
            success: true,
            platformPostId: result.id,
            url: result.permalink || `https://instagram.com/p/${result.id}`
          };
        } catch (error) {
          console.error('❌ Instagram: Media upload failed', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Instagram media upload failed'
          };
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
   * Uses the Twitter helper functions directly
   */
  private static async postToTwitter(
    connection: PlatformConnection,
    content: any
  ) {
    try {
      // Use the Twitter helper function directly
      const result = await this.callTwitterHelper(connection, content)

      if (result.success) {
        return {
          success: true,
          platformPostId: (result as any).platformPostId,
          url: (result as any).url
        }
      } else {
        return {
          success: false,
          error: (result as any).error || 'Twitter posting failed'
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
   * Helper method to call Twitter posting functionality
   */
  private static async callTwitterHelper(
    connection: PlatformConnection,
    content: any
  ) {
    try {
      // Import the postToTwitter function dynamically to avoid circular dependencies
      const { postToTwitter } = await import('@/app/api/posting/platforms/twitter/helpers')

      const result = await postToTwitter({
        content: content.text || '',
        media: content.media || [],
        accessToken: connection.accessToken,
        accessTokenSecret: connection.accessTokenSecret || '',
        userId: connection.userId || ''
      })

      return result
    } catch (error) {
      console.error('Error calling Twitter helper:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Twitter helper error'
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

  /**
   * Post to Amazon using connection data and SP-API
   */
  private static async postToAmazon(
    connection: PlatformConnection,
    content: PostContent
  ) {
    const { accessToken, userId } = connection;

    try {
      // Import Amazon posting client and types
      const { AmazonPostingClient } = await import('./amazon-posting-client');
      const { AMAZON_MARKETPLACES } = await import('./amazon-posting-client');

      // Initialize client with connection credentials
      const amazonClient = new AmazonPostingClient({
        region: 'NA',
        marketplaceId: 'ATVPDKIKX0DER', // US marketplace by default
        refreshToken: connection.refreshToken || '',
        clientId: process.env.AMAZON_CLIENT_ID || '',
        clientSecret: process.env.AMAZON_CLIENT_SECRET || '',
        sellerId: userId || '',
        roleArn: process.env.AMAZON_ROLE_ARN || '',
        accessKeyId: process.env.AMAZON_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY || ''
      });

      // Validate required Amazon-specific content
      if (!content.brandContent) {
        return {
          success: false,
          error: 'Amazon posts require brand content information'
        };
      }

      if (!content.productASINs || content.productASINs.length === 0) {
        return {
          success: false,
          error: 'Amazon posts require at least one product ASIN'
        };
      }

      // Get product details for ASINs
      const products = [];
      for (const asin of content.productASINs.slice(0, 5)) { // Max 5 products
        try {
          const productDetails = await amazonClient.getProductByAsin(asin);
          products.push(productDetails);
        } catch (error) {
          console.warn(`Failed to get details for ASIN ${asin}:`, error);
          // Continue with basic product info
          products.push({
            asin,
            title: `Product ${asin}`,
            brand: content.brandContent.brandName,
            category: 'Unknown',
            imageUrl: undefined,
            price: { amount: 0, currency: 'USD' },
            availability: 'UNKNOWN' as const
          });
        }
      }

      // Prepare Amazon media assets
      const mediaAssets = content.media?.map((media) => ({
        assetId: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        mediaType: media.type.toUpperCase() as 'IMAGE' | 'VIDEO',
        url: media.url,
        fileName: `media_${Date.now()}.${media.type === 'video' ? 'mp4' : 'jpg'}`,
        fileSize: 0, // Would be calculated in real implementation
        dimensions: { width: 1080, height: 1080 }, // Default dimensions
        mimeType: media.type === 'video' ? 'video/mp4' : 'image/jpeg',
        status: 'READY' as const
      })) || [];

      // Prepare Amazon post content according to the schema
      const amazonPost = {
        headline: content.brandContent.headline || content.text?.substring(0, 80) || 'Check out our products',
        bodyText: content.text?.substring(0, 500) || '',
        callToAction: 'SHOP_NOW' as const,
        products,
        targetMarketplace: {
          id: 'ATVPDKIKX0DER',
          name: 'Amazon.com',
          countryCode: 'US',
          currency: 'USD',
          domain: 'https://www.amazon.com'
        },
        brandContent: {
          brandEntityId: content.brandContent.brandName, // This would be the actual entity ID in production
          brandName: content.brandContent.brandName,
          brandStoryTitle: content.brandContent.headline || 'Our Brand Story',
          brandStoryContent: content.text?.substring(0, 300) || 'Discover our amazing products.',
          brandLogoUrl: undefined,
          brandDescription: content.text?.substring(0, 500),
          brandWebsiteUrl: undefined,
          brandValues: content.brandContent.productHighlights?.slice(0, 5) || []
        },
        tags: content.hashtags?.slice(0, 10) || []
      };

      // Create Amazon post
      const result = await amazonClient.createPost(amazonPost, mediaAssets);

      if (result.postId) {
        // Submit for publishing
        const publishResult = await amazonClient.submitPost(result.postId);

        if (publishResult.success) {
          return {
            success: true,
            platformPostId: result.postId,
            url: `https://www.amazon.com/brand-store/post/${result.postId}` // Simulated URL
          };
        } else {
          return {
            success: false,
            error: 'Failed to publish Amazon post'
          };
        }
      } else {
        return {
          success: false,
          error: 'Failed to create Amazon post'
        };
      }

    } catch (error) {
      console.error("Error posting to Amazon:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post to Amazon'
      };
    }
  }

  /**
   * Post to TikTok using connection data
   */
  private static async postToTikTok(
    connection: PlatformConnection,
    content: PostContent
  ) {
    try {
      // Import TikTok posting client
      const { default: TikTokPostingClient } = await import('./tiktok-posting-client')

      const tiktokClient = new TikTokPostingClient()

      // Set authentication
      tiktokClient.setAuth({
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken,
        expiresAt: connection.expiresAt,
        advertiserId: content.tiktokContent?.advertiserId || connection.userId || ''
      })

      // TikTok requires video content
      if (!content.media || content.media.length === 0) {
        return {
          success: false,
          error: 'TikTok posts require video content'
        }
      }

      const videoMedia = content.media.find(m => m.type === 'video')
      if (!videoMedia) {
        return {
          success: false,
          error: 'TikTok posts require video content'
        }
      }

      // Fetch video file from URL (in a real implementation, this would be handled differently)
      let videoFile: Buffer
      try {
        const response = await fetch(videoMedia.url)
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.status}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        videoFile = Buffer.from(arrayBuffer)
      } catch (fetchError) {
        return {
          success: false,
          error: 'Failed to fetch video file for upload'
        }
      }

      // Prepare TikTok post content
      const tiktokPostContent = {
        videoId: '', // Will be set after upload
        caption: content.text || '',
        hashtags: content.hashtags || [],
        mentions: content.mentions || [],
        privacy: content.tiktokContent?.privacy || 'PUBLIC' as const,
        allowComments: content.tiktokContent?.allowComments ?? true,
        allowDuet: content.tiktokContent?.allowDuet ?? true,
        allowStitch: content.tiktokContent?.allowStitch ?? true,
        brandedContent: content.tiktokContent?.brandedContent ?? false,
        promotionalContent: content.tiktokContent?.promotionalContent ?? false
      }

      // Upload and publish video
      const videoProperties = content.tiktokContent?.videoProperties ? {
        title: content.tiktokContent.videoProperties.title,
        description: content.tiktokContent.videoProperties.description,
        tags: content.tiktokContent.videoProperties.tags,
        category: content.tiktokContent.videoProperties.category as any, // Type assertion for enum
        language: content.tiktokContent.videoProperties.language || 'en',
        thumbnailTime: content.tiktokContent.videoProperties.thumbnailTime
      } : undefined

      const result = await tiktokClient.createPost(
        videoFile,
        videoMedia.url.split('/').pop() || 'video.mp4',
        tiktokPostContent,
        videoProperties
      )

      if (result.postId) {
        return {
          success: true,
          platformPostId: result.postId,
          url: result.videoUrl || `https://www.tiktok.com/@user/video/${result.videoId}`
        }
      } else {
        return {
          success: false,
          error: 'Failed to create TikTok post'
        }
      }

    } catch (error) {
      console.error("Error posting to TikTok:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post to TikTok'
      }
    }
  }
}
