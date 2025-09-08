import { NextRequest, NextResponse } from "next/server";
import { generateState, generateCodeVerifier, generateCodeChallenge } from "@/services/authentications";
import { OAuthService } from "@/services/oauth";
import { withRateLimit, withErrorHandling } from "@/config/middleware/middleware";
import { logger } from "@/config/logger";
import { addSecurityHeaders, createSuccessResponse } from "@/controllers/api-response";
import { ServerSessionService } from "@/services/session-server";
import { env } from "@/validations/env";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

const appUrl = env.APP_URL

// Enhanced PKCE implementation
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  
  return { codeVerifier, codeChallenge }
}

async function handler(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate environment variables
    if (!env.TWITTER_CLIENT_ID) {
      logger.error("Twitter OAuth credentials not configured");
      return NextResponse.json({ error: "Twitter OAuth not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get("returnTo") || "/profile?tab=connections";

    // Get existing session to ensure user is authenticated
    const existingSession = await ServerSessionService.getSession(request);
    if (!existingSession?.user?.username) {
      logger.warn("User not authenticated for Twitter connection");
      return NextResponse.json({ 
        error: "Authentication required",
        loginUrl: `/login?returnTo=${encodeURIComponent(returnTo)}`
      }, { status: 401 });
    }

    // Generate PKCE parameters for OAuth 2.0 security
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = crypto.randomBytes(32).toString('hex');
    const redirectUri = `${appUrl}/api/auth/twitter/callback`;

    // Twitter/X OAuth 2.0 scopes for analytics and posting
    const scopes = [
      'tweet.read',
      'tweet.write', 
      'users.read',
      'offline.access', // For refresh tokens
      // Note: ads.read and ads.write require elevated access
    ].join(' ');

    // Store PKCE data and state in session for callback verification
    const updatedSession = {
      ...existingSession,
      state,
      codeVerifier,
      codeChallenge,
      returnTo,
      twitter_oauth_initiated: new Date().toISOString(),
    };

    // Build Twitter authorization URL with PKCE
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', env.TWITTER_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    logger.info("Twitter OAuth flow initiated", {
      userId: existingSession.userId,
      redirectUri,
      scopes: scopes.split(' '),
      state: state.substring(0, 8) + '...'
    });

    // Set session and return auth URL
    const response = createSuccessResponse({ 
      authUrl: authUrl.toString(),
      state: state.substring(0, 8) + '...',
      scopes: scopes.split(' ')
    }, "Twitter auth URL generated");
    
    const withSession = await ServerSessionService.setSession(request, updatedSession as any, response);
    return addSecurityHeaders(withSession);

  } catch (error) {
    logger.error("Twitter OAuth initiation error", { 
      error: error instanceof Error ? error.message : error
    });
    return NextResponse.json({ 
      error: "Failed to initiate Twitter authentication" 
    }, { status: 500 });
  }
}

export const POST = withRateLimit(withErrorHandling(handler));