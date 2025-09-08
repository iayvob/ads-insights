import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { PlatformPostingService } from "@/services/platform-posting"
import { platformRateLimit } from "@/config/middleware/platform-rate-limiter"

interface FacebookPostRequest {
  content: {
    text?: string
    hashtags?: string[]
    mentions?: string[]
    link?: string
  }
  media?: Array<{
    id: string
    url: string
    type: 'image' | 'video'
    mimeType: string
    size: number
    alt?: string
    dimensions?: { width: number; height: number }
  }>
  pageId?: string
  scheduling?: {
    publishAt: string
    timezone: string
  }
}

interface FacebookConnection {
  accessToken: string
  pageId: string
  connected: boolean
  expiresAt?: Date
  scopes?: string[]
  pageName?: string
}

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Premium access validation
    const premiumAccess = await validatePremiumAccess(session.userId, "posting")
    if (!premiumAccess.hasAccess) {
      return NextResponse.json(
        { success: false, error: "Premium subscription required" },
        { status: 403 }
      )
    }

    // Rate limiting
    const rateLimitResult = platformRateLimit('facebook', session.userId, request)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600'
          }
        }
      )
    }

    // Parse request body
    const body: FacebookPostRequest = await request.json()
    const { content, media, pageId, scheduling } = body

    // Validate Facebook-specific requirements
    if (!content?.text && (!media || media.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Facebook posts require either text content or media" },
        { status: 400 }
      )
    }

    // Get Facebook credentials
    const facebookConnection = await getFacebookConnection(request)
    if (!facebookConnection) {
      return NextResponse.json(
        { success: false, error: "Facebook account not connected" },
        { status: 400 }
      )
    }

    // Validate page access
    const targetPageId = pageId || facebookConnection.pageId
    if (!targetPageId) {
      return NextResponse.json(
        { success: false, error: "Facebook Page ID required" },
        { status: 400 }
      )
    }

    // Validate page permissions
    const hasPageAccess = await validateFacebookPageAccess(
      facebookConnection.accessToken, 
      targetPageId,
      session.userId
    )
    
    if (!hasPageAccess) {
      return NextResponse.json(
        { success: false, error: "No permission to post to this Facebook page" },
        { status: 403 }
      )
    }

    // Prepare content for posting
    const postContent = {
      text: content.text || '',
      hashtags: content.hashtags || [],
      mentions: content.mentions || [],
      // link and scheduling are not part of the expected type for postToPlatform
      media: media
        ?.filter(m => m.type === 'image' || m.type === 'video')
        .map(m => ({
          id: m.id,
          url: m.url,
          type: m.type as 'image' | 'video'
        }))
    }

    // Post to Facebook using the centralized service
    const result = await PlatformPostingService.postToPlatform(
      session,
      'facebook',
      postContent
    )

    if (result.success) {
      // Log successful post
      await logPostActivity(session.userId, 'facebook', targetPageId, result.platformPostId!)

      return NextResponse.json({
        success: true,
        data: {
          id: result.platformPostId,
          url: result.url,
          platform: 'facebook',
          status: scheduling ? 'scheduled' : 'published',
          publishedAt: scheduling ? scheduling.publishAt : new Date().toISOString()
        },
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }
      })
    } else {
      // Handle platform-specific errors
      const statusCode = getStatusCodeForError(result.error!)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          message: typeof result.error === 'object' && result.error !== null && 'message' in result.error ? (result.error as { message: string }).message : undefined
        },
        { status: statusCode }
      )
    }

  } catch (error) {
    console.error("Facebook posting error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "FACEBOOK_API_ERROR",
        message: "Failed to post to Facebook" 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve Facebook page information
export async function GET(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const facebookConnection = await getFacebookConnection(request)
    if (!facebookConnection) {
      return NextResponse.json(
        { success: false, error: "Facebook account not connected" },
        { status: 400 }
      )
    }

    // Get available pages
    const pages = await getFacebookPages(facebookConnection.accessToken)
    
    return NextResponse.json({
      success: true,
      data: {
        connected: facebookConnection.connected,
        currentPageId: facebookConnection.pageId,
        availablePages: pages,
        scopes: facebookConnection.scopes || []
      }
    })

  } catch (error) {
    console.error("Facebook pages fetch error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "FACEBOOK_API_ERROR",
        message: "Failed to fetch Facebook pages" 
      },
      { status: 500 }
    )
  }
}

// Helper functions

async function getFacebookConnection(request: NextRequest): Promise<FacebookConnection | null> {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId || !session.connectedPlatforms?.facebook) {
      return null
    }

    // Get Facebook data from database
    const { UserService } = await import('@/services/user');
    const providers = await UserService.getActiveProviders(session.userId);
    const facebookProvider = providers.find(p => p.provider === 'facebook');
    
    if (!facebookProvider) {
      return null;
    }
    
    // Check if token is still valid
    const now = Date.now()
    if (facebookProvider.expiresAt && facebookProvider.expiresAt.getTime() < now) {
      console.log("Facebook token expired")
      return null
    }

    return {
      accessToken: facebookProvider.accessToken || '',
      pageId: facebookProvider.advertisingAccountId || '', // Use the primary page/ad account ID
      connected: true,
      scopes: ['pages_manage_posts', 'pages_read_engagement'],
      expiresAt: facebookProvider.expiresAt || undefined,
      pageName: facebookProvider.username || ''
    }
  } catch (error) {
    console.error("Error fetching Facebook connection:", error)
    return null
  }
}

async function validateFacebookPageAccess(
  accessToken: string, 
  pageId: string, 
  userId: string
): Promise<boolean> {
  try {
    // Validate that the user has access to post to this page
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=access_token,can_post&access_token=${accessToken}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'AdInsights-Social-Manager/1.0'
        }
      }
    )

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.can_post === true

  } catch (error) {
    console.error("Error validating Facebook page access:", error)
    return false
  }
}

async function getFacebookPages(accessToken: string): Promise<any[]> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,can_post&access_token=${accessToken}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'AdInsights-Social-Manager/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch pages')
    }

    const data = await response.json()
    return data.data || []

  } catch (error) {
    console.error("Error fetching Facebook pages:", error)
    return []
  }
}

async function logPostActivity(
  userId: string, 
  platform: string, 
  pageId: string, 
  postId: string
): Promise<void> {
  try {
    // Log the post activity to your database
    console.log(`Post logged: User ${userId} posted to ${platform} (${pageId}): ${postId}`)
    
    // Implementation would save to database:
    // await db.postActivity.create({
    //   userId,
    //   platform,
    //   pageId,
    //   postId,
    //   timestamp: new Date()
    // })
    
  } catch (error) {
    console.error("Error logging post activity:", error)
    // Non-blocking - don't throw
  }
}

function getStatusCodeForError(error: any): number {
  switch (error.code) {
    case 'FB_TOKEN_EXPIRED':
    case 'FB_PERMISSION_DENIED':
      return 401
    case 'FB_RATE_LIMIT':
      return 429
    case 'FB_TEMPORARILY_BLOCKED':
      return 429
    case 'CONTENT_TOO_LONG':
    case 'INVALID_MEDIA':
      return 400
    default:
      return 500
  }
}

async function postToFacebook(params: {
  content: string
  media?: any[]
  pageId: string
  accessToken: string
  userId: string
}) {
  const { content, media, pageId, accessToken } = params

  try {
    // Facebook Graph API posting logic would go here
    // Example: POST to /{page-id}/feed or /{page-id}/photos
    
    if (media && media.length > 0) {
      // For media posts
      if (media.length === 1) {
        // Single media post
        return {
          platformPostId: `fb_${Date.now()}`,
          status: "published",
          publishedAt: new Date().toISOString(),
          url: `https://facebook.com/${pageId}/posts/mock_post_id`,
          type: "media_post"
        }
      } else {
        // Multiple media - album post
        return {
          platformPostId: `fb_album_${Date.now()}`,
          status: "published",
          publishedAt: new Date().toISOString(),
          url: `https://facebook.com/${pageId}/posts/mock_album_id`,
          type: "album_post"
        }
      }
    } else {
      // Text-only post
      return {
        platformPostId: `fb_text_${Date.now()}`,
        status: "published",
        publishedAt: new Date().toISOString(),
        url: `https://facebook.com/${pageId}/posts/mock_text_post_id`,
        type: "text_post"
      }
    }
  } catch (error) {
    throw new Error(`Facebook API error: ${error}`)
  }
}
