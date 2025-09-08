import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { PostRequestSchema, PostResponse, PostingErrorCodes, PlatformConstraints, MediaUpload } from "@/validations/posting-types"
import { validatePremiumAccess } from "@/lib/subscription-access"

interface PublishResult {
  results: Record<string, {
    status: "published" | "failed";
    postId?: string;
    error?: string;
    publishedAt?: string;
  }>;
  publishedAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get and validate session
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Validate premium access for posting feature
    const premiumAccess = await validatePremiumAccess(session.userId, "posting")
    if (!premiumAccess.hasAccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: PostingErrorCodes.PREMIUM_REQUIRED,
          message: "Premium subscription required for posting features" 
        },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = PostRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: PostingErrorCodes.INVALID_CONTENT,
          message: "Invalid request data",
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const { platforms, content, media, schedule, isDraft } = validationResult.data

    // Validate platform connections
    const connectedPlatforms = await validatePlatformConnections(session.userId, platforms)
    const missingConnections = platforms.filter(p => !connectedPlatforms.includes(p))
    
    if (missingConnections.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: PostingErrorCodes.PLATFORM_NOT_CONNECTED,
          message: `Please connect to: ${missingConnections.join(", ")}`,
          details: { missingPlatforms: missingConnections }
        },
        { status: 400 }
      )
    }

    // Validate content and media for each platform
    const validationErrors = validatePlatformContent(platforms, content, media || [])
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: PostingErrorCodes.INVALID_CONTENT,
          message: "Content validation failed for some platforms",
          details: validationErrors
        },
        { status: 400 }
      )
    }

    // Create post record
    const postId = await createPost({
      userId: session.userId,
      platforms,
      content,
      media,
      schedule,
      isDraft
    })

    // If not a draft, publish immediately or schedule
    let publishResult: PublishResult | undefined
    if (!isDraft) {
      if (schedule) {
        publishResult = await schedulePost(postId, schedule.scheduledAt)
      } else {
        publishResult = await publishPost(postId, platforms)
      }
    }

    // Prepare response
    const response: PostResponse = {
      id: postId,
      status: isDraft ? "draft" : schedule ? "scheduled" : "published",
      platforms: platforms.map(platform => ({
        platform,
        status: isDraft ? "pending" : publishResult?.results?.[platform]?.status || "pending",
        platformPostId: publishResult?.results?.[platform]?.postId,
        error: publishResult?.results?.[platform]?.error,
        publishedAt: publishResult?.results?.[platform]?.publishedAt
      })),
      content: {
        text: content.content,
        hashtags: content.hashtags,
        mentions: content.mentions,
        link: content.link
      },
      media: media?.map(m => ({
        id: m.filename, // This would be replaced with actual uploaded media ID
        url: "", // This would be the CDN URL
        filename: m.filename,
        type: m.type,
        size: m.size,
        dimensions: m.dimensions,
        duration: m.duration
      })),
      scheduledAt: schedule?.scheduledAt.toISOString(),
      publishedAt: publishResult?.publishedAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: isDraft ? "Post saved as draft" : schedule ? "Post scheduled successfully" : "Post published successfully"
    })

  } catch (error) {
    console.error("Posting API error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred" 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // draft, scheduled, published
    const platform = searchParams.get("platform")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")

    const posts = await getUserPosts(session.userId, {
      status,
      platform,
      limit,
      offset
    })

    return NextResponse.json({
      success: true,
      data: posts
    })

  } catch (error) {
    console.error("Get posts error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve posts" 
      },
      { status: 500 }
    )
  }
}

// Helper functions (these would be implemented in separate service files)
async function validatePlatformConnections(userId: string, platforms: string[]): Promise<string[]> {
  // This would check the user's connected platforms from the database
  // For now, return empty array to simulate no connections for testing
  return []
}

function validatePlatformContent(platforms: string[], content: any, media: MediaUpload[]): any[] {
  const errors = []
  
  for (const platform of platforms) {
    const constraints = PlatformConstraints[platform as keyof typeof PlatformConstraints]
    
    // Validate content length
    if (content.content.length > constraints.maxContentLength) {
      errors.push({
        platform,
        field: "content",
        message: `Content exceeds maximum length of ${constraints.maxContentLength} characters`
      })
    }
    
    // Validate media count
    if (media && media.length > constraints.maxMedia) {
      errors.push({
        platform,
        field: "media",
        message: `Too many media files. Maximum allowed: ${constraints.maxMedia}`
      })
    }
    
    // Validate media types and sizes
    if (media) {
      for (const mediaItem of media) {
        if (!constraints.supportedMediaTypes.includes(mediaItem.mimeType as any)) {
          errors.push({
            platform,
            field: "media",
            message: `Unsupported media type: ${mediaItem.mimeType}`
          })
        }
        
        const maxSize = mediaItem.type === "video" ? constraints.maxVideoSize : constraints.maxImageSize
        if (mediaItem.size > maxSize) {
          errors.push({
            platform,
            field: "media",
            message: `Media file too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
          })
        }
      }
    }
  }
  
  return errors
}

async function createPost(postData: any): Promise<string> {
  // This would create a post record in the database
  // Return a mock ID for now
  return `post_${Date.now()}`
}

async function schedulePost(postId: string, scheduledAt: Date): Promise<PublishResult> {
  // This would add the post to a scheduling queue/database
  return {
    results: {},
    publishedAt: scheduledAt.toISOString()
  }
}

async function publishPost(postId: string, platforms: string[]): Promise<PublishResult> {
  // This would publish to each platform's API
  const results: Record<string, any> = {}
  
  for (const platform of platforms) {
    try {
      // Mock successful publication
      results[platform] = {
        status: "published",
        postId: `${platform}_${Date.now()}`,
        publishedAt: new Date().toISOString()
      }
    } catch (error) {
      results[platform] = {
        status: "failed",
        error: `Failed to publish to ${platform}`
      }
    }
  }
  
  return {
    results,
    publishedAt: new Date().toISOString()
  }
}

async function getUserPosts(userId: string, filters: any): Promise<PostResponse[]> {
  // This would fetch posts from the database
  // Return mock data for now
  return []
}
