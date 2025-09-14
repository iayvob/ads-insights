import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { PlatformPostingService } from "@/services/platform-posting"
import { platformRateLimit } from "@/config/middleware/platform-rate-limiter"
import { getFacebookConnection, validateFacebookAccess, logPostActivity, postToFacebook } from "./helpers"

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
    const hasPageAccess = await validateFacebookAccess(session.userId)

    if (!hasPageAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "FACEBOOK_PAGE_ACCESS_ERROR",
          message: "No permission to post to this Facebook page. Make sure you have admin access."
        },
        { status: 403 }
      )
    }

    // Format content for posting
    const formattedContent = content.text || ''
    const hashtags = content.hashtags?.map(tag => `#${tag}`).join(' ') || ''
    const fullContent = formattedContent + (hashtags ? '\n\n' + hashtags : '')

    // Combine with any link
    const linkContent = content.link ? `\n\n${content.link}` : ''
    const postContent = fullContent + linkContent

    // Process media for Facebook API
    const processedMedia = media
      ?.filter(m => m.type === 'image' || m.type === 'video')
      .map(m => ({
        id: m.id,
        url: m.url,
        type: m.type as 'image' | 'video',
        mimeType: m.mimeType
      }));

    // Post to Facebook using Graph API
    const result = await postToFacebook({
      content: postContent,
      media: processedMedia,
      pageId: targetPageId,
      accessToken: facebookConnection.accessToken
    });

    if (result.success) {
      // For successful posts, the result will have either platformPostId (for feed posts) or mediaId (for photo uploads)
      const postId = 'platformPostId' in result ? result.platformPostId :
        'mediaId' in result ? result.mediaId : null;

      if (postId) {
        // Log successful post
        await logPostActivity(session.userId, postId)

        return NextResponse.json({
          success: true,
          data: {
            id: postId,
            url: 'url' in result ? result.url : `https://facebook.com/${postId}`,
            platform: 'facebook',
            status: scheduling ? 'scheduled' : 'published',
            publishedAt: scheduling ? scheduling.publishAt : new Date().toISOString()
          },
          rateLimitInfo: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime
          }
        })
      }
    } else {
      // Handle platform-specific errors
      const statusCode = getStatusCodeForError(result.error || "Unknown error")
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.error || "Unknown error"
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

// Helper function to map errors to status codes
function getStatusCodeForError(error: string): number {
  switch (error) {
    case "INVALID_ACCESS_TOKEN":
    case "TOKEN_EXPIRED":
      return 401;
    case "INSUFFICIENT_PERMISSIONS":
    case "SCOPE_REQUIRED":
      return 403;
    case "RATE_LIMIT_EXCEEDED":
      return 429;
    case "INVALID_PARAMETER":
    case "INVALID_REQUEST":
      return 400;
    default:
      return 500;
  }
}

// Function to get Facebook pages (simplified for this example)
async function getFacebookPages(accessToken: string): Promise<any[]> {
  try {
    // In a production environment, you would call the Facebook Graph API
    // For now, return mock data
    return [
      {
        id: "123456789",
        name: "My Business Page",
        category: "Business",
        access_token: "PAGE_ACCESS_TOKEN",
        tasks: ["ANALYZE", "CREATE_CONTENT", "MODERATE"]
      },
      {
        id: "987654321",
        name: "My Personal Page",
        category: "Personal Blog",
        access_token: "PAGE_ACCESS_TOKEN",
        tasks: ["ANALYZE", "CREATE_CONTENT", "MODERATE"]
      }
    ];
  } catch (error) {
    console.error("Error fetching Facebook pages:", error);
    return [];
  }
}
