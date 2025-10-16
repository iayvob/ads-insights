import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { platformRateLimit } from "@/config/middleware/platform-rate-limiter"
import { getTwitterConnection, validateTwitterAccess, postToTwitter, logPostActivity } from "./helpers"

interface TwitterPostRequest {
  content: string;
  media?: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    mimeType?: string;
    size?: number;
    alt?: string;
  }>;
}

import { postingHealthMonitor } from "@/services/posting-health-monitor";
import {
  PlatformErrorCodes,
  handlePlatformError
} from "@/app/api/posting/platforms/common/error-handler";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: PlatformErrorCodes.AUTH_ERROR,
          message: "Authentication required"
        },
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
    const rateLimitResult = platformRateLimit('twitter', session.userId, request)
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
    const body: TwitterPostRequest = await request.json()
    const { content, media } = body

    // Validate Twitter-specific requirements
    if (!content && (!media || media.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: "TWITTER_CONTENT_ERROR",
          message: "Twitter posts require either text content or media"
        },
        { status: 400 }
      )
    }

    // Twitter character limit validation (X allows 280 characters)
    if (content && content.length > 280) {
      return NextResponse.json(
        {
          success: false,
          error: "TWITTER_CONTENT_ERROR",
          message: "Twitter content exceeds 280 character limit"
        },
        { status: 400 }
      )
    }

    // Media validation - Twitter allows up to 4 images or 1 video
    if (media && media.length > 0) {
      const imageCount = media.filter(m => m.type === 'image').length
      const videoCount = media.filter(m => m.type === 'video').length

      if (imageCount > 4) {
        return NextResponse.json(
          {
            success: false,
            error: "TWITTER_MEDIA_ERROR",
            message: "Twitter allows a maximum of 4 images per tweet"
          },
          { status: 400 }
        )
      }

      if (videoCount > 1) {
        return NextResponse.json(
          {
            success: false,
            error: "TWITTER_MEDIA_ERROR",
            message: "Twitter allows only 1 video per tweet"
          },
          { status: 400 }
        )
      }

      if (imageCount > 0 && videoCount > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "TWITTER_MEDIA_ERROR",
            message: "Twitter does not allow mixing images and videos in the same tweet"
          },
          { status: 400 }
        )
      }
    }

    // Check if user has Twitter connected
    const twitterConnection = await getTwitterConnection(request)
    if (!twitterConnection) {
      return NextResponse.json(
        {
          success: false,
          error: "TWITTER_AUTH_ERROR",
          message: "Twitter account not connected or token expired. Please reconnect your Twitter account."
        },
        { status: 400 }
      )
    }

    // Validate Twitter access
    const hasAccess = await validateTwitterAccess(session.userId)
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "TWITTER_PERMISSION_ERROR",
          message: "Insufficient permissions to post to Twitter. Ensure your account has write permissions."
        },
        { status: 403 }
      )
    }

    console.log('🔐 Twitter posting with connection authType:', twitterConnection.authType || 'undefined', 'hasSecret:', !!twitterConnection.accessTokenSecret)
    console.log('🔍 Twitter connection details:', {
      hasAccessToken: !!twitterConnection.accessToken,
      tokenLength: twitterConnection.accessToken?.length || 0,
      userId: twitterConnection.userId,
      username: twitterConnection.username
    })

    // Post to Twitter using new X API v2 helpers
    const result = await postToTwitter({
      content,
      media,
      accessToken: twitterConnection.accessToken,
      accessTokenSecret: twitterConnection.accessTokenSecret,
      userId: twitterConnection.userId,
      authType: twitterConnection.authType || 'oauth2', // Use dynamic auth type from connection
      request
    })

    if (result.success) {
      // Log successful post
      if (result.platformPostId) {
        await logPostActivity(session.userId, result.platformPostId)
      }

      // Record success in health monitor
      const responseTime = Date.now() - startTime;
      postingHealthMonitor.recordSuccess('twitter', responseTime);

      return NextResponse.json({
        success: true,
        data: {
          id: result.platformPostId,
          url: result.url || `https://x.com/user/status/${result.platformPostId}`,
          platform: 'twitter',
          status: result.status,
          publishedAt: new Date().toISOString(),
          type: media && media.length > 0 ? "media_tweet" : "text_tweet"
        },
        message: "Successfully posted to X",
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }
      })
    } else {
      // Record failure in health monitor
      postingHealthMonitor.recordFailure(
        'twitter',
        result.error || "Unknown Twitter error",
        "TWITTER_API_ERROR"
      );

      // Handle errors
      return NextResponse.json(
        {
          success: false,
          error: "TWITTER_API_ERROR",
          message: result.error || "Failed to post to Twitter"
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Twitter posting error:", error);

    // Record failure in health monitor
    postingHealthMonitor.recordFailure(
      'twitter',
      error instanceof Error ? error.message : "Unknown error",
      "TWITTER_INTERNAL_ERROR",
      error
    );

    // Use our common error handler
    return handlePlatformError(error, 'twitter');
  }
}

// GET endpoint to retrieve Twitter account information
export async function GET(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const twitterConnection = await getTwitterConnection(request)
    if (!twitterConnection) {
      return NextResponse.json(
        { success: false, error: "Twitter account not connected" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: twitterConnection.connected,
        username: twitterConnection.username,
        userId: twitterConnection.userId,
        expiresAt: twitterConnection.expiresAt
      }
    })

  } catch (error) {
    console.error("Twitter account fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "TWITTER_API_ERROR",
        message: "Failed to fetch Twitter account information"
      },
      { status: 500 }
    )
  }
}
