import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse, addSecurityHeaders } from "@/controllers/api-response";
import { ServerSessionService } from "@/services/session-server";
import { OAuthService } from "@/services/oauth";
import { logger } from "@/config/logger";
import { AuthError } from "@/lib/errors";
import { env } from "@/validations/env";
import { AuthSession } from "@/validations/types";

export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await ServerSessionService.getSession(req);
    if (!session?.userId || !session?.plan) {
      return addSecurityHeaders(createErrorResponse("Authentication required", 401));
    }

    // Get parameters from URL
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      logger.error("OAuth error received", { platform, error });
      return addSecurityHeaders(createErrorResponse(
        `OAuth authentication failed: ${error}`,
        400
      ));
    }

    // Validate required parameters
    if (!platform || !code || !state) {
      return addSecurityHeaders(createErrorResponse(
        "Missing required OAuth parameters",
        400
      ));
    }

    // Validate state to prevent CSRF attacks
    if (!session.state || session.state !== state) {
      logger.error("OAuth state validation failed", { 
        platform, 
        sessionState: session.state, 
        callbackState: state 
      });
      return addSecurityHeaders(createErrorResponse(
        "Invalid OAuth state. Possible CSRF attack.",
        400
      ));
    }

    // Generate redirect URI (must match what was used in initiation)
    const baseUrl = req.headers.get('x-forwarded-proto') && req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('x-forwarded-host')}`
      : req.headers.get('host')
      ? `https://${req.headers.get('host')}`
      : env.APP_URL || 'http://localhost:3000';
    
    const redirectUri = `${baseUrl}/api/auth/oauth/callback?platform=${platform}`;

    let userData;
    let tokens;

    try {
      // Exchange authorization code for access token
      switch (platform.toLowerCase()) {
        case 'facebook':
          tokens = await OAuthService.exchangeFacebookCode(code, redirectUri);
          userData = await OAuthService.getFacebookUserData(tokens.access_token);
          break;

        case 'instagram':
          tokens = await OAuthService.exchangeInstagramCode(code, redirectUri);
          userData = await OAuthService.getInstagramUserData(tokens.access_token);
          break;

        case 'twitter':
        case 'x':
          if (!session.codeVerifier) {
            throw new AuthError("Missing code verifier for Twitter OAuth");
          }
          tokens = await OAuthService.exchangeTwitterCode(code, redirectUri, session.codeVerifier);
          userData = await OAuthService.getTwitterUserData(tokens.access_token);
          break;

        case 'amazon':
          // Validate premium access for Amazon
          if (session.plan === 'FREEMIUM') {
            throw new AuthError("Amazon connectivity requires a premium subscription");
          }
          tokens = await OAuthService.exchangeAmazonCode(code, redirectUri);
          userData = await OAuthService.getAmazonUserData(tokens.access_token);
          break;

        default:
          throw new AuthError(`Unsupported platform: ${platform}`);
      }

      // Prepare platform connection data
      const platformData = {
        account: {
          userId: userData.id,
          username: 'username' in userData ? userData.username : ('name' in userData ? userData.name : 'Unknown'),
          email: 'email' in userData ? userData.email || '' : '',
        },
        account_tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || '',
          expires_at: tokens.expires_in 
            ? Date.now() + (tokens.expires_in * 1000)
            : Date.now() + (24 * 60 * 60 * 1000), // Default to 24 hours
        },
        account_codes: {
          codeVerifier: session.codeVerifier || '',
          codeChallenge: session.codeChallenge || '',
          state: session.state || '',
        },
      };

      // Update session with platform connection using connectedPlatforms structure
      const updatedSession: AuthSession = {
        ...session,
        connectedPlatforms: {
          ...session.connectedPlatforms,
          [platform]: platformData,
        },
        // Clear OAuth state after successful connection
        state: undefined,
        codeVerifier: undefined,
        codeChallenge: undefined,
      };

      // Create success response
      const response = createSuccessResponse({
        platform,
        connected: true,
        userData: {
          id: userData.id,
          username: 'username' in userData ? userData.username : ('name' in userData ? userData.name : 'Unknown'),
          email: 'email' in userData ? userData.email || '' : '',
        },
        message: `Successfully connected to ${platform}`,
      }, `${platform} authentication successful`);

      // Update session
      await ServerSessionService.setSession(req, updatedSession, response);

      logger.info("OAuth connection successful", {
        userId: session.userId,
        platform,
        accountId: userData.id,
      });

      return addSecurityHeaders(response);

    } catch (error) {
      logger.error("OAuth token exchange failed", {
        platform,
        error: error instanceof Error ? error.message : error,
      });

      // Clear OAuth state from session on error
      const clearedSession = {
        ...session,
        state: undefined,
        codeVerifier: undefined,
        codeChallenge: undefined,
      };

      const errorResponse = createErrorResponse(
        error instanceof Error ? error.message : "OAuth authentication failed",
        400
      );

      await ServerSessionService.setSession(req, clearedSession, errorResponse);

      return addSecurityHeaders(errorResponse);
    }

  } catch (error) {
    logger.error("OAuth callback error", {
      error: error instanceof Error ? error.message : error,
      url: req.url,
    });

    return addSecurityHeaders(createErrorResponse(
      "OAuth callback processing failed",
      500
    ));
  }
}
