import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { platformRateLimit, handlePlatformError } from "@/config/middleware/platform-rate-limiter"
import { TikTokApiClient } from "@/services/api-clients/tiktok-client"
import { UserService } from "@/services/user"
import { logger } from "@/config/logger"
import {
  validateTikTokContent,
  formatTikTokContent,
  handleTikTokError,
  getTikTokErrorMessage,
  TIKTOK_LIMITS,
  type TikTokContent,
  type TikTokMediaAsset
} from "./helpers"

interface TikTokPostRequest {
  content: TikTokContent
  media?: TikTokMediaAsset[]
  postType: 'video' | 'photo'
  privacy?: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY'
  settings?: {
    disableComment?: boolean
    disableDuet?: boolean
    disableStitch?: boolean
    autoAddMusic?: boolean // For photo posts
  }
}

/**
 * POST /api/posting/platforms/tiktok
 * Post content to TikTok using Content Posting API
 */
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

    // Apply rate limiting
    const rateLimitResult = platformRateLimit('tiktok', session.userId, request)

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
            'Retry-After': (rateLimitResult.retryAfter || 3600).toString(),
          }
        }
      )
    }

    // Parse request body
    const body: TikTokPostRequest = await request.json()

    // Validate request using helpers
    const validation = validateTikTokContent(body.content, body.media)
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join('; ') },
        { status: 400 }
      )
    }

    // Get TikTok connection
    const connection = await getTikTokConnection(session.userId)
    if (!connection || !connection.connected) {
      return NextResponse.json(
        { success: false, error: "TikTok account not connected" },
        { status: 400 }
      )
    }

    // Check creator info before posting
    const creatorInfo = await TikTokApiClient.getCreatorInfo(connection.accessToken!)

    // Validate privacy level is supported (convert from our format to TikTok format)
    const privacyMap = {
      'PUBLIC': 'PUBLIC_TO_EVERYONE',
      'PRIVATE': 'SELF_ONLY',
      'FOLLOWERS_ONLY': 'MUTUAL_FOLLOW_FRIENDS'
    }

    const tiktokPrivacy = body.privacy ? privacyMap[body.privacy] : 'PUBLIC_TO_EVERYONE'
    if (body.privacy && !creatorInfo.privacy_level_options.includes(tiktokPrivacy)) {
      return NextResponse.json(
        {
          success: false,
          error: `Privacy level ${body.privacy} not supported. Available options: ${creatorInfo.privacy_level_options.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Post to TikTok
    let result
    if (body.postType === 'video' && body.media && body.media.length > 0) {
      // Video post
      const videoMedia = body.media[0] // TikTok supports one video per post
      const formattedContent = formatTikTokContent(body.content)

      result = await TikTokApiClient.postVideo(connection.accessToken!, {
        title: formattedContent.text || '',
        videoUrl: videoMedia.url,
        privacyLevel: tiktokPrivacy,
        disableComment: body.settings?.disableComment || false,
        disableDuet: body.settings?.disableDuet || false,
        disableStitch: body.settings?.disableStitch || false,
      })

    } else if (body.postType === 'photo' && body.media && body.media.length > 0) {
      // Photo post
      const photoUrls = body.media
        .filter(m => m.type === 'image')
        .slice(0, TIKTOK_LIMITS.MAX_PHOTO_COUNT)
        .map(m => m.url)

      if (photoUrls.length === 0) {
        return NextResponse.json(
          { success: false, error: "No valid images provided for photo post" },
          { status: 400 }
        )
      }

      const formattedContent = formatTikTokContent(body.content)

      result = await TikTokApiClient.postPhotos(connection.accessToken!, {
        title: formattedContent.text || '',
        description: body.content.text || '',
        imageUrls: photoUrls,
        privacyLevel: tiktokPrivacy,
        disableComment: body.settings?.disableComment || false,
        autoAddMusic: body.settings?.autoAddMusic !== false, // Default to true
      })

    } else {
      return NextResponse.json(
        { success: false, error: "Invalid post type or missing media" },
        { status: 400 }
      )
    }

    // Log successful post
    await logPostActivity({
      userId: session.userId,
      platform: 'tiktok',
      postId: result.publish_id,
      postType: body.postType,
      timestamp: new Date()
    })

    // Return success response with rate limit headers
    return NextResponse.json({
      success: true,
      data: {
        id: result.publish_id,
        url: result.share_url || `https://tiktok.com/`, // Will be available once processed
        platform: 'tiktok',
        status: result.status.toLowerCase(),
        publishedAt: new Date().toISOString(),
        postType: body.postType,
      },
      rateLimitInfo: {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime
      }
    }, {
      status: 200,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      }
    })

  } catch (error) {
    logger.error("TikTok posting error:", error)

    const tikTokError = handleTikTokError(error)

    return NextResponse.json(
      {
        success: false,
        error: tikTokError.message,
        code: tikTokError.code,
        retryable: false
      },
      { status: getStatusCodeForError(tikTokError.code) }
    )
  }
}

/**
 * GET /api/posting/platforms/tiktok
 * Get TikTok connection status and creator info
 */
export async function GET(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Apply rate limiting for GET requests too
    const rateLimitResult = platformRateLimit('tiktok', session.userId, request)

    const headers = {
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    }

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': (rateLimitResult.retryAfter || 3600).toString(),
          }
        }
      )
    }

    const connection = await getTikTokConnection(session.userId)

    if (!connection || !connection.connected) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          error: "TikTok account not connected"
        }
      }, { headers })
    }

    // Get creator info
    const creatorInfo = await TikTokApiClient.getCreatorInfo(connection.accessToken!)

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        creator: {
          username: creatorInfo.creator_username,
          nickname: creatorInfo.creator_nickname,
          avatar_url: creatorInfo.creator_avatar_url,
          privacy_options: creatorInfo.privacy_level_options,
          max_video_duration: creatorInfo.max_video_post_duration_sec,
          settings: {
            comment_disabled: creatorInfo.comment_disabled,
            duet_disabled: creatorInfo.duet_disabled,
            stitch_disabled: creatorInfo.stitch_disabled,
          }
        },
        limits: TIKTOK_LIMITS
      }
    }, { headers })

  } catch (error) {
    logger.error("TikTok connection check error:", error)

    const tikTokError = handleTikTokError(error)

    return NextResponse.json(
      {
        success: false,
        error: tikTokError.message,
        code: tikTokError.code
      },
      { status: getStatusCodeForError(tikTokError.code) }
    )
  }
}

// Helper functions
async function getTikTokConnection(userId: string) {
  // This would fetch TikTok connection from database
  // Mock connection for now
  const connections = await UserService.getActiveProviders(userId)
  const tiktokConnection = connections.find(p => p.provider === 'tiktok')

  if (!tiktokConnection) {
    return null
  }

  return {
    accessToken: tiktokConnection.accessToken,
    connected: true,
    expiresAt: tiktokConnection.expiresAt
  }
}

async function logPostActivity(params: {
  userId: string
  platform: string
  postId: string
  postType: string
  timestamp: Date
}) {
  try {
    logger.info("TikTok post activity logged", {
      userId: params.userId,
      platform: params.platform,
      postId: params.postId,
      postType: params.postType,
      timestamp: params.timestamp
    })

    // Here you would save to database
    // await PostActivityService.log({
    //   userId: params.userId,
    //   platform: params.platform,
    //   postId: params.postId,
    //   postType: params.postType,
    //   timestamp: params.timestamp
    // })

  } catch (error) {
    logger.error("Error logging TikTok post activity:", error)
    // Non-blocking - don't throw
  }
}

function getStatusCodeForError(errorCode: string): number {
  switch (errorCode) {
    case 'PLATFORM_NOT_CONNECTED':
    case 'INSUFFICIENT_PERMISSIONS':
      return 401
    case 'RATE_LIMIT_EXCEEDED':
      return 429
    case 'INVALID_CONTENT':
    case 'TIKTOK_INVALID_VIDEO_FORMAT':
    case 'TIKTOK_VIDEO_TOO_LARGE':
    case 'TIKTOK_VIDEO_TOO_LONG':
      return 400
    default:
      return 500
  }
}
