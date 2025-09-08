import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { OAuthService } from "@/services/oauth"
import { withErrorHandling } from "@/config/middleware/middleware"
import { UserWithProviders, AuthSession } from "@/validations/types"
import { addSecurityHeaders } from "@/controllers/api-response"
import { ServerSessionService } from "@/services/session-server"
import { env } from "@/validations/env"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

const appUrl = env.APP_URL


export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(`${appUrl}/profile?tab=connections&error=twitter_auth_denied`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/profile?tab=connections&error=invalid_callback`)
    }

    // Verify state
  const session = await ServerSessionService.getSession(request)
    if (session?.state !== state) {
      return NextResponse.redirect(`${appUrl}/profile?tab=connections&error=invalid_state`)
    }

    // Exchange code for access token
    const callbackUrl = `${appUrl}/api/auth/twitter/callback`
    const tokenData = await OAuthService.exchangeTwitterCode(
      code,
      callbackUrl,
      session.codeVerifier
    )

    // Get user info
    const userData = await OAuthService.getTwitterUserData(tokenData.access_token)

    // Find or create user in database
    let ObjectUserData: UserWithProviders
    if (session?.userId) {
      // User already exists from previous auth
      ObjectUserData = await UserService.getUserWithProviders(session.userId)
    } else {
      // Check if user exists by provider
      const existingUser = await UserService.findUserByProvider("twitter", userData.id)
      if (existingUser) {
        ObjectUserData = existingUser
      } else {
        ObjectUserData = await UserService.findOrCreateUserByEmail(`twitter_${userData.id}@temp.local`, {
          username: userData.username,
        })
      }
    }

    // Create or update auth provider with enhanced data
    await UserService.upsertAuthProvider(ObjectUserData?.id, {
      provider: "twitter",
      providerId: userData.id,
      username: userData.username,
      displayName: userData.name || userData.username,
      profileImage: userData.profile_image_url || "",
      name: userData.name || userData.username,
      followersCount: userData.public_metrics?.followers_count || 0,
      mediaCount: userData.public_metrics?.tweet_count || 0,
      canAccessInsights: true, // Twitter API provides analytics
      canPublishContent: true,
      canManageAds: false, // Would require ads API access
      analyticsSummary: JSON.stringify({
        followers: userData.public_metrics?.followers_count || 0,
        following: userData.public_metrics?.following_count || 0,
        tweets: userData.public_metrics?.tweet_count || 0,
        verified: userData.verified || false,
      }),
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
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
        twitter: {
          account: {
            userId: userData.id,
            username: userData.username,
            email: '', // Twitter doesn't always provide email
            businesses: [],
            adAccounts: [],
            advertisingAccountId: '',
          },
          account_tokens: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: Date.now() + tokenData.expires_in * 1000,
          }
        }
      },
    }

  const response = NextResponse.redirect(`${appUrl}/profile?tab=connections&success=twitter`)
  const withSession = await ServerSessionService.setSession(request, updatedSession, response)
  return addSecurityHeaders(withSession)
  } catch (error) {
    console.error("Twitter callback error:", error)
    return NextResponse.redirect(`${appUrl}/profile?tab=connections&error=twitter_callback_failed`)
  }
})
