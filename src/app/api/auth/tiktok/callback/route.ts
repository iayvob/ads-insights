import { type NextRequest, NextResponse } from "next/server"
import { OAuthService } from "@/services/oauth"
import { UserService } from "@/services/user"
import { logger } from "@/config/logger"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders } from "@/controllers/api-response"
import { ServerSessionService } from "@/services/session-server"
import { env } from "@/validations/env"
import { AuthSession, UserWithProviders } from "@/validations/types"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

const appUrl = env.APP_URL

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)

  const params = {
    code: searchParams.get("code"),
    state: searchParams.get("state"),
    error: searchParams.get("error"),
  }

  // Validate callback parameters
  if (params.error) {
    logger.warn("TikTok auth denied", { error: params.error })
    return NextResponse.redirect(`${appUrl}/profile?error=tiktok_auth_denied&tab=connections`)
  }

  // Verify required parameters
  if (!params.code) {
    logger.warn("Missing authorization code", { params })
    return NextResponse.redirect(`${appUrl}/profile?error=missing_code&tab=connections`)
  }

  // Get current session
  const session = await ServerSessionService.getSession(request)
  if (!session?.user?.username) {
    logger.warn("User not authenticated for TikTok connection")
    return NextResponse.redirect(`${appUrl}/login?error=not_authenticated`)
  }

  try {
    // Exchange code for access token using OAuth service
    const redirectUri = `${appUrl}/api/auth/tiktok/callback`
    const tokenData = await OAuthService.exchangeTikTokCode(params.code, redirectUri)

    // Get user data using OAuth service
    const tiktokUser = await OAuthService.getTikTokUserData(tokenData.access_token)

    // Get or create user data
    let ObjectUserData: UserWithProviders
    if (session?.userId) {
      // User already exists from previous auth
      ObjectUserData = await UserService.getUserWithProviders(session.userId)
    } else {
      // Check if user exists by provider
      const existingUser = await UserService.findUserByProvider("tiktok", tiktokUser.open_id)
      if (existingUser) {
        ObjectUserData = existingUser
      } else {
        ObjectUserData = await UserService.findOrCreateUserByEmail(`tiktok_${tiktokUser.open_id}@temp.local`, {
          username: tiktokUser.username || tiktokUser.display_name,
        })
      }
    }

    // Create or update auth provider with enhanced data
    await UserService.upsertAuthProvider(ObjectUserData?.id, {
      provider: "tiktok",
      providerId: tiktokUser.open_id,
      username: tiktokUser.username || tiktokUser.display_name,
      displayName: tiktokUser.display_name,
      profileImage: tiktokUser.avatar_url || "",
      name: tiktokUser.display_name,
      followersCount: 0, // TikTok Basic API doesn't provide follower count
      mediaCount: 0, // TikTok Basic API doesn't provide video count
      canAccessInsights: false, // Basic API has limited analytics
      canPublishContent: true, // TikTok allows content publishing
      canManageAds: false, // Would require ads API access
      analyticsSummary: JSON.stringify({
        display_name: tiktokUser.display_name || "",
        username: tiktokUser.username || "",
        union_id: tiktokUser.union_id || "",
        avatar_url: tiktokUser.avatar_url || "",
      }),
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
    })

    // Update session with full connectedPlatforms structure
    const updatedSession: AuthSession = {
      userId: ObjectUserData?.id,
      plan: ObjectUserData?.plan,
      user: {
        email: ObjectUserData?.email,
        username: ObjectUserData?.username,
        image: ObjectUserData?.image || undefined,
      },
      user_tokens: {
        access_token: session?.user_tokens?.access_token || "", // Keep existing if available
        refresh_token: session?.user_tokens?.refresh_token,
        expires_at: session?.user_tokens?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      connectedPlatforms: {
        ...session?.connectedPlatforms,
        tiktok: {
          account: {
            userId: tiktokUser.open_id,
            username: tiktokUser.username || tiktokUser.display_name || '',
            display_name: tiktokUser.display_name,
            businesses: [],
            adAccounts: [],
            advertisingAccountId: '',
          },
          account_tokens: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
          }
        }
      },
    }

    logger.info("TikTok auth completed", { userId: session.user.username, providerId: tiktokUser.open_id })

    const response = NextResponse.redirect(`${appUrl}/profile?success=tiktok_connected&tab=connections`)
    const withSession = await ServerSessionService.setSession(request, updatedSession, response)
    return addSecurityHeaders(withSession)

  } catch (error) {
    logger.error("TikTok OAuth callback error", { error });
    return NextResponse.redirect(`${appUrl}/profile?tab=connections&error=callback_failed`);
  }
})
