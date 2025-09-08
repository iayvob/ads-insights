import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { platformRateLimit, handlePlatformError } from "@/config/middleware/platform-rate-limiter"
import { TikTokApiClient } from "@/services/api-clients/tiktok-client"
import { UserService } from "@/services/user"
import { logger } from "@/config/logger"

// TikTok content validation limits based on official documentation
const TIKTOK_LIMITS = {
  TITLE_MAX_LENGTH: 150, // TikTok title/caption limit
  DESCRIPTION_MAX_LENGTH: 2200, // TikTok description limit
  MAX_HASHTAGS: 100, // TikTok allows many hashtags but recommend moderation
  MAX_VIDEO_DURATION_SEC: 600, // 10 minutes max for most accounts
  MAX_PHOTO_COUNT: 35, // Maximum photos in a carousel
  MAX_VIDEO_SIZE_MB: 287, // ~287MB max video size
  MAX_PHOTO_SIZE_MB: 50, // 50MB max photo size
  SUPPORTED_VIDEO_FORMATS: ['mp4', 'mov', 'mpeg', 'flv', 'webm', '3gp'],
  SUPPORTED_PHOTO_FORMATS: ['jpeg', 'jpg', 'gif', 'tiff', 'bmp', 'webp'],
}

interface TikTokPostRequest {
  content: {
    text: string
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
    duration?: number // For videos
    dimensions?: {
      width: number
      height: number
    }
  }>
  postType: 'video' | 'photo'
  privacy?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'
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
    
    // Validate request
    const validation = validateTikTokPost(body)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
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
    
    // Validate privacy level is supported
    if (body.privacy && !creatorInfo.privacy_level_options.includes(body.privacy)) {
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
      const fullContent = formatTikTokContent(body.content)
      
      result = await TikTokApiClient.postVideo(connection.accessToken!, {
        title: fullContent,
        videoUrl: videoMedia.url,
        privacyLevel: body.privacy || 'PUBLIC_TO_EVERYONE',
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

      const fullContent = formatTikTokContent(body.content)
      
      result = await TikTokApiClient.postPhotos(connection.accessToken!, {
        title: fullContent,
        description: body.content.text,
        imageUrls: photoUrls,
        privacyLevel: body.privacy || 'PUBLIC_TO_EVERYONE',
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
    
    const platformError = handlePlatformError('tiktok', error)
    const statusCode = getStatusCodeForError(platformError)
    
    return NextResponse.json(
      { 
        success: false, 
        error: platformError.message,
        code: platformError.code,
        retryable: platformError.isRetryable
      },
      { status: statusCode }
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
    
    const platformError = handlePlatformError('tiktok', error)
    const statusCode = getStatusCodeForError(platformError)
    
    return NextResponse.json(
      { 
        success: false, 
        error: platformError.message,
        code: platformError.code
      },
      { status: statusCode }
    )
  }
}

// Helper functions
function validateTikTokPost(body: TikTokPostRequest): { valid: boolean; error?: string } {
  // Check content
  if (!body.content?.text || body.content.text.trim().length === 0) {
    return { valid: false, error: "Content text is required" }
  }

  // Format content to check total length
  const fullContent = formatTikTokContent(body.content)
  if (fullContent.length > TIKTOK_LIMITS.TITLE_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Content too long. Maximum ${TIKTOK_LIMITS.TITLE_MAX_LENGTH} characters allowed, got ${fullContent.length}` 
    }
  }

  // Check hashtags
  if (body.content.hashtags && body.content.hashtags.length > TIKTOK_LIMITS.MAX_HASHTAGS) {
    return { 
      valid: false, 
      error: `Too many hashtags. Maximum ${TIKTOK_LIMITS.MAX_HASHTAGS} allowed` 
    }
  }

  // Check post type
  if (!body.postType || !['video', 'photo'].includes(body.postType)) {
    return { valid: false, error: "Post type must be 'video' or 'photo'" }
  }

  // Check media
  if (!body.media || body.media.length === 0) {
    return { valid: false, error: "Media is required for TikTok posts" }
  }

  // Validate media for post type
  if (body.postType === 'video') {
    const videoMedia = body.media.filter(m => m.type === 'video')
    if (videoMedia.length === 0) {
      return { valid: false, error: "Video media required for video posts" }
    }
    if (videoMedia.length > 1) {
      return { valid: false, error: "Only one video allowed per post" }
    }

    const video = videoMedia[0]
    if (video.size > TIKTOK_LIMITS.MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      return { 
        valid: false, 
        error: `Video too large. Maximum ${TIKTOK_LIMITS.MAX_VIDEO_SIZE_MB}MB allowed` 
      }
    }

    if (video.duration && video.duration > TIKTOK_LIMITS.MAX_VIDEO_DURATION_SEC) {
      return { 
        valid: false, 
        error: `Video too long. Maximum ${TIKTOK_LIMITS.MAX_VIDEO_DURATION_SEC} seconds allowed` 
      }
    }
  }

  if (body.postType === 'photo') {
    const photoMedia = body.media.filter(m => m.type === 'image')
    if (photoMedia.length === 0) {
      return { valid: false, error: "Image media required for photo posts" }
    }
    if (photoMedia.length > TIKTOK_LIMITS.MAX_PHOTO_COUNT) {
      return { 
        valid: false, 
        error: `Too many photos. Maximum ${TIKTOK_LIMITS.MAX_PHOTO_COUNT} allowed` 
      }
    }

    for (const photo of photoMedia) {
      if (photo.size > TIKTOK_LIMITS.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
        return { 
          valid: false, 
          error: `Photo too large. Maximum ${TIKTOK_LIMITS.MAX_PHOTO_SIZE_MB}MB allowed per image` 
        }
      }
    }
  }

  return { valid: true }
}

function formatTikTokContent(content: TikTokPostRequest['content']): string {
  let formatted = content.text

  // Add hashtags
  if (content.hashtags && content.hashtags.length > 0) {
    const hashtags = content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    formatted += ' ' + hashtags.join(' ')
  }

  // Add mentions
  if (content.mentions && content.mentions.length > 0) {
    const mentions = content.mentions.map(mention => mention.startsWith('@') ? mention : `@${mention}`)
    formatted += ' ' + mentions.join(' ')
  }

  return formatted.trim()
}

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

function getStatusCodeForError(error: any): number {
  switch (error.code) {
    case 'TIKTOK_TOKEN_EXPIRED':
    case 'TIKTOK_PERMISSION_DENIED':
      return 401
    case 'TIKTOK_RATE_LIMIT':
      return 429
    case 'TIKTOK_TEMPORARILY_BLOCKED':
      return 429
    case 'CONTENT_TOO_LONG':
    case 'INVALID_MEDIA':
    case 'UNSUPPORTED_MEDIA_TYPE':
      return 400
    default:
      return 500
  }
}
