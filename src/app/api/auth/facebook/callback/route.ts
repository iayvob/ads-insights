import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { OAuthService } from "@/services/oauth"
import { AuthError } from "@/lib/errors"
import { env } from "@/validations/env"
import { logger } from "@/config/logger"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders } from "@/controllers/api-response"
import { ServerSessionService } from "@/services/session-server"
import { AuthSession } from "@/validations/types"

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
    logger.warn("Facebook auth denied", { error: params.error })
    return NextResponse.redirect(`${appUrl}/profile?error=facebook_auth_denied&tab=connections`)
  }

  // Verify required parameters
  if (!params.code) {
    logger.warn("Missing authorization code", { params })
    return NextResponse.redirect(`${appUrl}/profile?error=missing_code&tab=connections`)
  }

  // Get current session
  const session = await ServerSessionService.getSession(request)
  console.log("Initial session before Facebook callback:", session);
  if (!session?.user?.username) {
    logger.warn("User not authenticated for Facebook connection")
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
    // Exchange code for access token using OAuth service - MUST use identical redirect URI
    const redirectUri = `${appUrl}/api/auth/facebook/callback`

    logger.info("Facebook callback processing", {
      redirectUri,
      codeLength: params.code.length,
      state: params.state
    });

    // Exchange code for short-lived token
    const tokenData = await OAuthService.exchangeFacebookCode(params.code, redirectUri)
    
    // Exchange short-lived token for long-lived token (60 days validity)
    let finalTokenData = tokenData;
    const longLivedTokenData = await OAuthService.getLongLivedFacebookToken(tokenData.access_token);
    
    if (longLivedTokenData && longLivedTokenData.access_token) {
      logger.info("Using long-lived Facebook token", {
        expiresIn: longLivedTokenData.expires_in,
        expirationDate: new Date(Date.now() + longLivedTokenData.expires_in * 1000).toISOString()
      });
      finalTokenData = longLivedTokenData;
    } else {
      logger.warn("Could not obtain long-lived Facebook token, using short-lived token", {
        expiresIn: tokenData.expires_in,
        expirationDate: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      });
    }

    // Get comprehensive user data with analytics info
    const userData = await OAuthService.getFacebookUserData(finalTokenData.access_token)

    // Get business data with enhanced analytics
    const businessData = await OAuthService.getFacebookBusinessData(finalTokenData.access_token)

    // Find or create user 
    let user
    
    // If user is already logged in, link Facebook to existing account
    if (session?.userId) {
      user = await UserService.getUserById(session.userId)
      if (!user) {
        throw new Error("Logged in user not found")
      }
      logger.info("Linking Facebook to existing user account", {
        userId: user.id,
        username: user.username
      })
    } else {
      // If no session, find by provider or create new account
      const existingUser = await UserService.findUserByProvider("facebook", userData.id)
      if (existingUser) {
        user = existingUser
      } else {
        // Create new user account with Facebook
        user = await UserService.findOrCreateUserByEmail(userData.email || `facebook_${userData.id}@temp.local`, {
          username: userData.name,
        })
      }
    }

    // Calculate token expiration - use long expiration for long-lived tokens
    const expiresIn = finalTokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // Save comprehensive auth provider data for analytics
    await UserService.upsertAuthProvider(user.id, {
      provider: "facebook",
      providerId: userData.id,
      username: userData.name,
      displayName: userData.name,
      email: userData.email || `facebook_${userData.id}@temp.local`,
      profileImage: userData.picture,
      canManageAds: (businessData.adAccounts || []).length > 0,
      canPublishContent: (businessData.pages || []).length > 0,
      canAccessInsights: (businessData.adAccounts || []).length > 0,
      accessToken: finalTokenData.access_token,
      refreshToken: finalTokenData.refresh_token || null,
      expiresAt: expiresAt,
      advertisingAccountId: businessData.primaryAdAccountId,
      businessAccounts: {
        business_accounts: businessData.pages || [], // Facebook pages as business accounts
        facebook_pages: businessData.pages || [],
      },
      adAccounts: businessData.adAccounts || [],
      analyticsSummary: {
        accounts_with_insights: (businessData.pages || []).length,
        has_content_access: (businessData.pages || []).length > 0,
        has_advertising_access: (businessData.adAccounts || []).length > 0,
        total_pages: (businessData.pages || []).length,
        total_ad_accounts: (businessData.adAccounts || []).length,
        connected_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      }
    })

    // Enhanced session structure for analytics - using full connectedPlatforms structure
    const updatedSession: AuthSession = {
      userId: user.id,
      plan: user.plan,
      user: {
        email: user.email,
        username: user.username,
        image: user.image || userData.picture,
        id: user.id
      },
      user_tokens: {
        access_token: session?.user_tokens?.access_token || "", 
        refresh_token: session?.user_tokens?.refresh_token,
        expires_at: session?.user_tokens?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      connectedPlatforms: {
        ...session?.connectedPlatforms,
        facebook: {
          account: {
            userId: userData.id,
            username: userData.name,
            email: userData.email || '',
            name: userData.name,
            profile_picture_url: userData.picture,
            businessAccounts: businessData.pages || [],
            adAccounts: businessData.adAccounts || [],
            advertisingAccountId: businessData.primaryAdAccountId || '',
            can_access_insights: (businessData.adAccounts || []).length > 0,
            can_publish_content: (businessData.pages || []).length > 0,
            can_manage_ads: (businessData.adAccounts || []).length > 0,
          } as any,
          account_tokens: {
            access_token: finalTokenData.access_token,
            refresh_token: finalTokenData.refresh_token || null,
            expires_at: Date.now() + expiresIn * 1000,
            is_long_lived: !!longLivedTokenData?.access_token,
          },
          connected_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        } as any
      },
      // Clear state after successful authentication
      state: undefined
    }

    logger.info("Facebook auth completed with analytics data", { 
      userId: user.id, 
      providerId: userData.id,
      pagesCount: userData.facebookPages?.length || 0,
      instagramCount: userData.instagramAccounts?.length || 0,
      adAccountsCount: businessData.adAccounts?.length || 0,
      hasAdsAccess: businessData.analytics_summary?.has_advertising_access,
      hasContentAccess: businessData.analytics_summary?.has_content_access
    })

    // Create response and set session with proper cookie configuration
    const response = NextResponse.redirect(`${appUrl}/profile?success=facebook_connected&tab=connections`)
    
    // Set session with updated data and ensure cookies are properly configured
    const responseWithSession = await ServerSessionService.setSession(request, updatedSession, response)
    
    // Add cache control headers to prevent caching issues
    responseWithSession.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    responseWithSession.headers.set('Pragma', 'no-cache')
    responseWithSession.headers.set('Expires', '0')
    
    return addSecurityHeaders(responseWithSession)
  } catch (error) {
    logger.error("Facebook OAuth callback error", { error });
    return NextResponse.redirect(`${appUrl}/profile?tab=connections&error=callback_failed`);
  }
})
