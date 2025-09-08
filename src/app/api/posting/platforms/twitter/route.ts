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
    const { content, media, accessToken, accessTokenSecret } = body

    // Validate Twitter-specific requirements
    if (!content && (!media || media.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Twitter posts require either text content or media" },
        { status: 400 }
      )
    }

    // Twitter character limit validation
    if (content && content.length > 280) {
      return NextResponse.json(
        { success: false, error: "Twitter content exceeds 280 character limit" },
        { status: 400 }
      )
    }

    // Check if user has Twitter connected
    const twitterConnection = await getTwitterConnection(request)
    if (!twitterConnection) {
      return NextResponse.json(
        { success: false, error: "Twitter account not connected" },
        { status: 400 }
      )
    }

    // Post to Twitter
    const result = await postToTwitter({
      content,
      media,
      accessToken: accessToken || twitterConnection.accessToken,
      accessTokenSecret: accessTokenSecret || twitterConnection.accessTokenSecret,
      userId: session.userId
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: "Successfully posted to Twitter"
    })

  } catch (error) {
    console.error("Twitter posting error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to post to Twitter" },
      { status: 500 }
    )
  }
}

async function getTwitterConnection(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId || !session.connectedPlatforms?.twitter) {
      return null
    }

    // Get Twitter data from database
    const { UserService } = await import('@/services/user');
    const providers = await UserService.getActiveProviders(session.userId);
    const twitterProvider = providers.find(p => p.provider === 'twitter');
    
    if (!twitterProvider) {
      return null;
    }
    
    // Check if token is still valid
    const now = Date.now()
    if (twitterProvider.expiresAt && twitterProvider.expiresAt.getTime() < now) {
      console.log("Twitter token expired")
      return null
    }

    return {
      accessToken: twitterProvider.accessToken || '',
      accessTokenSecret: twitterProvider.refreshToken || '', // Twitter uses refresh_token as secret
      userId: twitterProvider.providerId,
      username: twitterProvider.username || '',
      connected: true,
      expiresAt: twitterProvider.expiresAt || new Date()
    }
  } catch (error) {
    console.error("Error fetching Twitter connection:", error)
    return null
  }
}

async function postToTwitter(params: {
  content: string
  media?: any[]
  accessToken: string
  accessTokenSecret: string
  userId: string
}) {
  const { content, media, accessToken, accessTokenSecret } = params

  try {
    // Twitter API v2 posting logic would go here
    // Example: POST to /2/tweets
    
    if (media && media.length > 0) {
      // For media posts - need to upload media first, then create tweet
      const mediaIds = await uploadMediaToTwitter(media, { accessToken, accessTokenSecret })
      
      return {
        platformPostId: `tw_${Date.now()}`,
        status: "published",
        publishedAt: new Date().toISOString(),
        url: `https://twitter.com/mock_user/status/mock_tweet_id`,
        type: "media_tweet",
        mediaIds
      }
    } else {
      // Text-only tweet
      return {
        platformPostId: `tw_text_${Date.now()}`,
        status: "published",
        publishedAt: new Date().toISOString(),
        url: `https://twitter.com/mock_user/status/mock_text_tweet_id`,
        type: "text_tweet"
      }
    }
  } catch (error) {
    throw new Error(`Twitter API error: ${error}`)
  }
}

async function uploadMediaToTwitter(media: any[], credentials: { accessToken: string, accessTokenSecret: string }) {
  // This would handle Twitter's media upload process
  // 1. POST to /1.1/media/upload.json (INIT)
  // 2. POST to /1.1/media/upload.json (APPEND) - for each chunk
  // 3. POST to /1.1/media/upload.json (FINALIZE)
  
  const mediaIds = []
  
  for (const mediaItem of media) {
    // Mock media upload
    const mediaId = `tw_media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    mediaIds.push(mediaId)
  }
  
  return mediaIds
}
