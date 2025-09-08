import { type NextRequest, NextResponse } from "next/server"
import { withErrorHandling } from "@/config/middleware/middleware"
import { ServerSessionService } from "@/services/session-server"
import { UserService } from "@/services/user"
import { AuthSession } from "@/validations/types"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

/**
 * GET /api/user/profile
 * Returns the current user profile information with platform data from database
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    const session = await ServerSessionService.getSession(request)

    if (!session?.userId) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        error: "Unauthorized"
      }, { status: 401 })
    }

    // Get user data with auth providers from database
    const userWithProviders = await UserService.getUserWithProviders(session.userId)
    
    if (!userWithProviders) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        error: "User not found"
      }, { status: 404 })
    }

    // Extract platform connection status from connectedPlatforms
    const platformStatus = {
      facebook: Boolean(session.connectedPlatforms?.facebook),
      instagram: Boolean(session.connectedPlatforms?.instagram),
      twitter: Boolean(session.connectedPlatforms?.twitter),
      amazon: Boolean(session.connectedPlatforms?.amazon),
      tiktok: Boolean(session.connectedPlatforms?.tiktok),
    }

    // Build auth providers array from database data
    const authProviders = userWithProviders.authProviders.map(provider => ({
      provider: provider.provider,
      username: provider.username || '',
      email: provider.email || '',
      displayName: provider.displayName || '',
      profileImage: provider.profileImage || '',
      createdAt: provider.createdAt.toISOString(),
      expiresAt: provider.expiresAt ? provider.expiresAt.toISOString() : null,
      followersCount: provider.followersCount || 0,
      mediaCount: provider.mediaCount || 0,
      canAccessInsights: provider.canAccessInsights || false,
      canPublishContent: provider.canPublishContent || false,
      canManageAds: provider.canManageAds || false,
    }))

    // Return comprehensive profile data in expected format
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: userWithProviders.id,
          email: userWithProviders.email,
          username: userWithProviders.username,
          image: userWithProviders.image,
          plan: userWithProviders.plan,
          createdAt: userWithProviders.createdAt.toISOString(),
          updatedAt: userWithProviders.updatedAt.toISOString(),
          lastLogin: userWithProviders.lastLogin ? userWithProviders.lastLogin.toISOString() : null,
          authProviders,
        }
      },
      authenticated: true,
      userId: userWithProviders.id,
      user: {
        id: userWithProviders.id,
        email: userWithProviders.email,
        username: userWithProviders.username,
        image: userWithProviders.image,
      },
      plan: userWithProviders.plan,
      connectedPlatforms: session.connectedPlatforms || {},
      platformStatus,
      connectedCount: authProviders.length,
      profile: {
        user_tokens: session.user_tokens,
      },
    })

    // Add cache control headers to ensure fresh data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({
      authenticated: false,
      user: null,
      error: "Internal server error"
    }, { status: 500 })
  }
})
