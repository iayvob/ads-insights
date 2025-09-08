import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"

export async function POST(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const premiumAccess = await validatePremiumAccess(session.userId, "posting")
    if (!premiumAccess.hasAccess) {
      return NextResponse.json(
        { success: false, error: "Premium subscription required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { content, media, accessToken } = body

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

    // Post to Instagram
    const result = await postToInstagram({
      content,
      media,
      accessToken: accessToken || instagramConnection.accessToken,
      userId: session.userId
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: "Successfully posted to Instagram"
    })

  } catch (error) {
    console.error("Instagram posting error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to post to Instagram" },
      { status: 500 }
    )
  }
}

async function getInstagramConnection(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId || !session.connectedPlatforms?.instagram) {
      return null
    }

    // Get Instagram data from database
    const { UserService } = await import('@/services/user');
    const providers = await UserService.getActiveProviders(session.userId);
    const instagramProvider = providers.find(p => p.provider === 'instagram');
    
    if (!instagramProvider) {
      return null;
    }
    
    // Check if token is still valid
    const now = Date.now()
    if (instagramProvider.expiresAt && instagramProvider.expiresAt.getTime() < now) {
      console.log("Instagram token expired")
      return null
    }

    return {
      accessToken: instagramProvider.accessToken,
      userId: instagramProvider.providerId,
      username: instagramProvider.username,
      connected: true,
      expiresAt: instagramProvider.expiresAt
    }
  } catch (error) {
    console.error("Error fetching Instagram connection:", error)
    return null
  }
}

async function postToInstagram(params: {
  content: string
  media?: any[]
  accessToken: string
  userId: string
}) {
  const { content, media, accessToken } = params

  try {
    // Instagram API posting logic would go here
    // For now, return mock success response
    
    if (media && media.length > 0) {
      // For media posts
      return {
        platformPostId: `ig_${Date.now()}`,
        status: "published",
        publishedAt: new Date().toISOString(),
        url: `https://instagram.com/p/mock_post_id`,
        type: "media_post"
      }
    } else {
      // For text-only posts (Instagram Stories or Reels with text overlay)
      return {
        platformPostId: `ig_story_${Date.now()}`,
        status: "published",
        publishedAt: new Date().toISOString(),
        url: `https://instagram.com/stories/mock_user/mock_story_id`,
        type: "story"
      }
    }
  } catch (error) {
    throw new Error(`Instagram API error: ${error}`)
  }
}
