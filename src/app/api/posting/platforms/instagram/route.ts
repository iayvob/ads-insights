import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { platformRateLimit } from "@/config/middleware/platform-rate-limiter"
import { getInstagramConnection, validateInstagramAccess, postToInstagram, logPostActivity } from "./helpers"

export async function POST(request: NextRequest) {
  try {
    // Authentication check
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
    const rateLimitResult = platformRateLimit('instagram', session.userId, request)
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
    const body = await request.json()
    const { content, media } = body

    // Validate Instagram-specific requirements
    if (!content && (!media || media.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Instagram posts require either content or media" },
        { status: 400 }
      )
    }

    // Check if user has Instagram connected
    const instagramConnection = await getInstagramConnection(request)
    if (!instagramConnection) {
      return NextResponse.json(
        { success: false, error: "Instagram account not connected" },
        { status: 400 }
      )
    }

    // Validate Instagram permissions
    const hasPermissions = await validateInstagramAccess(session.userId)

    if (!hasPermissions) {
      return NextResponse.json(
        {
          success: false,
          error: "INSTAGRAM_PERMISSION_ERROR",
          message: "Insufficient permissions to post to Instagram. Make sure your Instagram account is a Business or Creator account connected to a Facebook Page."
        },
        { status: 403 }
      )
    }

    // Validate media requirements
    if (media && media.length > 0) {
      // Check for valid media types and formats
      const validMediaTypes = ['image', 'video'];
      const invalidMedia = media.filter((m: { type: string }) => !validMediaTypes.includes(m.type));

      if (invalidMedia.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_MEDIA_TYPE",
            message: "Instagram only supports image and video content types"
          },
          { status: 400 }
        )
      }

      // Check carousel limitations (max 10 items)
      if (media.length > 10) {
        return NextResponse.json(
          {
            success: false,
            error: "MEDIA_LIMIT_EXCEEDED",
            message: "Instagram carousel posts can contain a maximum of 10 media items"
          },
          { status: 400 }
        )
      }

      // Check aspect ratio requirements (should be between 4:5 and 1.91:1 for feed posts)
      for (const item of media) {
        if (item.type === 'image' && item.dimensions) {
          const { width, height } = item.dimensions;
          if (width && height) {
            const aspectRatio = width / height;

            // Instagram feed post aspect ratio limits
            if (aspectRatio < 0.8 || aspectRatio > 1.91) {
              return NextResponse.json(
                {
                  success: false,
                  error: "INVALID_ASPECT_RATIO",
                  message: "Instagram images must have an aspect ratio between 4:5 and 1.91:1"
                },
                { status: 400 }
              )
            }
          }
        }
      }
    }

    // Post to Instagram
    const result = await postToInstagram({
      content,
      media,
      accessToken: instagramConnection.accessToken || '',
      userId: session.userId
    })

    // The helper function now returns objects with success property
    if ('success' in result && result.success) {
      // Log successful post
      if (result.platformPostId) {
        await logPostActivity(session.userId, result.platformPostId);
      }

      return NextResponse.json({
        success: true,
        data: {
          id: result.platformPostId,
          url: result.url,
          platform: 'instagram',
          status: result.status,
          publishedAt: result.publishedAt,
          type: result.type
        },
        message: "Successfully posted to Instagram",
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }
      })
    } else {
      // Handle errors
      return NextResponse.json(
        {
          success: false,
          error: 'error' in result ? result.error : "Failed to post to Instagram"
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Instagram posting error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INSTAGRAM_API_ERROR",
        message: "Failed to post to Instagram"
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve Instagram account information
export async function GET(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const instagramConnection = await getInstagramConnection(request)
    if (!instagramConnection) {
      return NextResponse.json(
        { success: false, error: "Instagram account not connected" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: instagramConnection.connected,
        username: instagramConnection.username,
        userId: instagramConnection.userId,
        expiresAt: instagramConnection.expiresAt
      }
    })

  } catch (error) {
    console.error("Instagram account fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INSTAGRAM_API_ERROR",
        message: "Failed to fetch Instagram account information"
      },
      { status: 500 }
    )
  }
}
