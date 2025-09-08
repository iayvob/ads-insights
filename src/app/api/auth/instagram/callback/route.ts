import { type NextRequest, NextResponse } from "next/server"
import { OAuthService } from "@/services/oauth"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders } from "@/controllers/api-response"
import { ServerSessionService } from "@/services/session-server"
import { UserService } from "@/services/user"
import { logger } from "@/config/logger"
import { env } from "@/validations/env"
import { AuthSession } from "@/validations/types";

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
    logger.warn("Instagram auth denied", { error: params.error })
    return NextResponse.redirect(`${appUrl}/profile?error=instagram_auth_denied&tab=connections`)
  }

  // Verify required parameters
  if (!params.code) {
    logger.warn("Missing authorization code", { params })
    return NextResponse.redirect(`${appUrl}/profile?error=missing_code&tab=connections`)
  }

  // Get current session
  const session = await ServerSessionService.getSession(request)
  console.log("Initial session before Instagram callback:", session);
  if (!session?.user?.username) {
    logger.warn("User not authenticated for Instagram connection")
    return NextResponse.redirect(`${appUrl}/login?error=not_authenticated`)
  }

  // Validate state parameter for security
  if (params.state && session.state && params.state !== session.state) {
    logger.warn("Invalid state parameter", { 
      expectedState: session.state,
      receivedState: params.state 
    })
    return NextResponse.redirect(`${appUrl}/profile?error=invalid_state&tab=connections`)
  }

  try {
    // Exchange code for access token using Facebook OAuth - Instagram uses Facebook Business Login
    const redirectUri = `${appUrl}/api/auth/instagram/callback`
    
    logger.info("Instagram callback processing", { 
      redirectUri,
      codeLength: params.code.length,
      state: params.state
    });
    
    // Use Facebook token exchange since Instagram uses Facebook Business Login
    const tokenData = await OAuthService.exchangeFacebookCode(params.code, redirectUri)

    // Get Instagram business data from Facebook pages
    const businessData = await OAuthService.getInstagramBusinessData(tokenData.access_token)

    if (!businessData.businessAccounts || businessData.businessAccounts.length === 0) {
      logger.warn("No Instagram business accounts found");
      return NextResponse.redirect(`${appUrl}/profile?error=instagram_no_business_accounts&tab=connections`)
    }

    // Use the first business account as primary
    const primaryAccount = businessData.businessAccounts[0]
    const userData = {
      id: primaryAccount.id,
      username: primaryAccount.username,
      name: primaryAccount.name,
      followers_count: primaryAccount.followers_count || 0,
      media_count: primaryAccount.media_count || 0,
      profile_picture_url: primaryAccount.profile_picture_url,
      account_type: 'BUSINESS' // Instagram business accounts are always BUSINESS type
    }

    // Find or create user 
    let user
    
    // If user is already logged in, link Instagram to existing account
    if (session?.userId) {
      user = await UserService.getUserById(session.userId)
      if (!user) {
        throw new Error("Logged in user not found")
      }
      logger.info("Linking Instagram to existing user account", {
        userId: user.id,
        username: user.username
      })
    } else {
      // If no session, find by provider or create new account
      const existingUser = await UserService.findUserByProvider("instagram", userData.id)
      if (existingUser) {
        user = existingUser
      } else {
        // Create new user account with Instagram
        user = await UserService.findOrCreateUserByEmail(`instagram_${userData.id}@temp.local`, {
          username: userData.username,
        })
      }
    }

    // Calculate token expiration
    const expiresAt = tokenData.expires_in ? 
      new Date(Date.now() + tokenData.expires_in * 1000) : 
      new Date(Date.now() + 5184000 * 1000); // 60 days default

    // Save comprehensive auth provider data to database for analytics
    await UserService.upsertAuthProvider(user.id, {
      provider: "instagram",
      providerId: userData.id,
      username: userData.username,
      displayName: userData.name,
      email: `instagram_${userData.id}@temp.local`,
      profileImage: userData.profile_picture_url,
      name: userData.name,
      followersCount: userData.followers_count,
      mediaCount: userData.media_count,
      accountType: userData.account_type,
      canAccessInsights: (businessData.analytics_summary?.accounts_with_insights || 0) > 0,
      canPublishContent: businessData.analytics_summary?.has_content_access || false,
      canManageAds: businessData.analytics_summary?.has_advertising_access || false,
      accessToken: tokenData.access_token,
      expiresAt: expiresAt,
      advertisingAccountId: businessData.adAccounts?.[0]?.id,
      businessAccounts: {
        business_accounts: businessData.businessAccounts,
        facebook_pages: businessData.pages || [],
      },
      adAccounts: businessData.adAccounts,
      analyticsSummary: businessData.analytics_summary
    })

    // Enhanced session structure for analytics
    const updatedSession: AuthSession = {
      userId: user.id,
      plan: user.plan,
      user: {
        email: user.email,
        username: user.username,
        image: user.image || userData.profile_picture_url,
        id: user.id
      },
      user_tokens: {
        access_token: session?.user_tokens?.access_token || "", 
        refresh_token: session?.user_tokens?.refresh_token,
        expires_at: session?.user_tokens?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      connectedPlatforms: {
        ...session?.connectedPlatforms,
        instagram: {
          account: {
            userId: userData.id,
            username: userData.username,
            email: '', // Instagram API doesn't provide email
            businesses: businessData.businessAccounts || [],
            adAccounts: businessData.adAccounts || [],
            advertisingAccountId: businessData.primaryAdAccountId || '',
          },
          account_tokens: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
          }
        }
      },
      // Clear state after successful authentication
      state: undefined
    }

    logger.info("Instagram auth completed with business data", { 
      userId: user.id, 
      providerId: userData.id,
      businessAccountsCount: businessData.businessAccounts.length,
      adAccountsCount: businessData.adAccounts.length,
      facebookPagesCount: businessData.pages?.length || 0,
      hasInsightsAccess: (businessData.analytics_summary?.accounts_with_insights || 0) > 0,
      hasAdsAccess: businessData.analytics_summary?.has_advertising_access || false,
      totalFollowers: businessData.analytics_summary?.total_followers || 0
    })

    // Create response and set session with proper cookie configuration
    const response = NextResponse.redirect(`${appUrl}/profile?success=instagram_connected&tab=connections`)
    
    // Set session with updated data and ensure cookies are properly configured
    const responseWithSession = await ServerSessionService.setSession(request, updatedSession, response)
    
    // Add cache control headers to prevent caching issues
    responseWithSession.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    responseWithSession.headers.set('Pragma', 'no-cache')
    responseWithSession.headers.set('Expires', '0')
    
    return addSecurityHeaders(responseWithSession)

  } catch (error) {
    logger.error("Instagram OAuth callback error", { error });
    return NextResponse.redirect(`${appUrl}/profile?tab=connections&error=callback_failed`);
  }
})