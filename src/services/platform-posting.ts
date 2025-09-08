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
    
    // Instagram Basic Display API posting logic
    // Note: Actual Instagram posting requires Instagram Business API
    
    if (content.media && content.media.length > 0) {
      // Create media container first
      const mediaContainer = await fetch(
        `https://graph.facebook.com/v19.0/${userId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: content.media[0].url,
            caption: content.text || '',
            access_token: accessToken
          })
        }
      )

      const containerResult = await mediaContainer.json()
      
      if (containerResult.id) {
        // Publish the media
        const publishResponse = await fetch(
          `https://graph.facebook.com/v19.0/${userId}/media_publish`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              creation_id: containerResult.id,
              access_token: accessToken
            })
          }
        )

        const publishResult = await publishResponse.json()
        
        return {
          success: true,
          platformPostId: publishResult.id,
          url: `https://instagram.com/p/${publishResult.id}`
        }
      }
    }
    
    return {
      success: false,
      error: 'Instagram posting failed'
    }
  }

  /**
   * Post to Twitter using connection data
   */
  private static async postToTwitter(
    connection: PlatformConnection,
    content: any
  ) {
    const { accessToken } = connection
    
    // Twitter API v2 posting logic
    const tweetData: any = {
      text: content.text || ''
    }

    if (content.media && content.media.length > 0) {
      // Handle media attachments
      tweetData.media = {
        media_ids: content.media.map((media: any) => media.id)
      }
    }

    const response = await fetch(
      'https://api.twitter.com/2/tweets',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tweetData)
      }
    )

    const result = await response.json()
    
    if (result.data?.id) {
      return {
        success: true,
        platformPostId: result.data.id,
        url: `https://twitter.com/${connection.username}/status/${result.data.id}`
      }
    } else {
      return {
        success: false,
        error: result.errors?.[0]?.detail || 'Twitter posting failed'
      }
    }
  }
}
