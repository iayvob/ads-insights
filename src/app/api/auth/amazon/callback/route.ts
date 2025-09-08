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
    logger.warn("Amazon auth denied", { error: params.error })
    return NextResponse.redirect(`${appUrl}/profile?error=amazon_auth_denied&tab=connections`)
  }

  // Verify required parameters
  if (!params.code || !params.state) {
    logger.warn("Missing authorization code or state", { params })
    return NextResponse.redirect(`${appUrl}/profile?error=missing_params&tab=connections`)
  }

  // Get current session
  const session = await ServerSessionService.getSession(request)
  if (!session?.user?.username) {
    logger.warn("User not authenticated for Amazon connection")
    return NextResponse.redirect(`${appUrl}/login?error=not_authenticated`)
  }

  // Verify state parameter
  if (session?.state !== params.state) {
    logger.warn("Invalid state parameter", { sessionState: session?.state, callbackState: params.state })
    return NextResponse.redirect(`${appUrl}/profile?error=invalid_state&tab=connections`)
  }

  try {
    // Exchange code for access token using OAuth service
    const redirectUri = `${appUrl}/api/auth/amazon/callback`
    const tokenData = await OAuthService.exchangeAmazonCode(params.code, redirectUri)

    // Get user data using OAuth service
    const amazonUser = await OAuthService.getAmazonUserData(tokenData.access_token)

    // Get or create user data
    let ObjectUserData: UserWithProviders
    if (session?.userId) {
      // User already exists from previous auth
      ObjectUserData = await UserService.getUserWithProviders(session.userId)
    } else {
      // Check if user exists by provider
      const existingUser = await UserService.findUserByProvider("amazon", amazonUser.user_id)
      if (existingUser) {
        ObjectUserData = existingUser
      } else {
        ObjectUserData = await UserService.findOrCreateUserByEmail(amazonUser.email || `amazon_${amazonUser.user_id}@temp.local`, {
          username: amazonUser.name,
        })
      }
    }

    // Create or update auth provider with enhanced data
    await UserService.upsertAuthProvider(ObjectUserData?.id, {
      provider: "amazon",
      providerId: amazonUser.user_id,
      username: amazonUser.name,
      displayName: amazonUser.name,
      profileImage: "", // Amazon doesn't provide profile images
      name: amazonUser.name,
      followersCount: 0, // Amazon doesn't provide social metrics
      mediaCount: 0,
      canAccessInsights: false, // Amazon doesn't provide analytics
      canPublishContent: false, // Amazon is not a publishing platform
      canManageAds: true, // Amazon has advertising capabilities
      analyticsSummary: JSON.stringify({
        email: amazonUser.email || "",
        name: amazonUser.name || "",
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
        amazon: {
          account: {
            userId: amazonUser.user_id,
            username: amazonUser.name,
            email: amazonUser.email || '',
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

    logger.info("Amazon auth completed", { userId: session.user.username, providerId: amazonUser.user_id })

    const response = NextResponse.redirect(`${appUrl}/profile?success=amazon_connected&tab=connections`)
    const withSession = await ServerSessionService.setSession(request, updatedSession, response)
    return addSecurityHeaders(withSession)

  } catch (error) {
    logger.error("Amazon OAuth callback error", { error });
    return NextResponse.redirect(`${appUrl}/profile?tab=connections&error=callback_failed`);
  }
})
