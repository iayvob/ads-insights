import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse, addSecurityHeaders } from "@/controllers/api-response";
import { ServerSessionService } from "@/services/session-server";
import { OAuthManager } from "@/services/oauth-manager";
import { logger } from "@/config/logger";
import { getBaseUrl } from "@/lib/url";

export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await ServerSessionService.getSession(req);
    if (!session?.userId || !session?.plan) {
      return addSecurityHeaders(createErrorResponse("Authentication required", 401));
    }

    // Get platform from query parameters
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');

    if (!platform) {
      return addSecurityHeaders(createErrorResponse("Platform parameter is required", 400));
    }

    // Validate platform and user access
    try {
      OAuthManager.validateAdditionalConnection(platform, session.plan, session);
    } catch (error) {
      return addSecurityHeaders(createErrorResponse(
        error instanceof Error ? error.message : "Platform access denied",
        403
      ));
    }

    // Generate redirect URI
    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/api/auth/oauth/callback?platform=${platform}`;

    // Initiate OAuth flow
    const oauthResponse = await OAuthManager.initiateOAuth({
      platform,
      redirectUri,
      userPlan: session.plan,
      userId: session.userId,
    });

    // Store OAuth state in session for security
    const updatedSession = {
      ...session,
      state: oauthResponse.state,
      codeVerifier: oauthResponse.codeVerifier,
      codeChallenge: oauthResponse.codeChallenge,
    };

    // Update session with OAuth state
    const response = createSuccessResponse({
      authUrl: oauthResponse.authUrl,
      platform,
      requiresPremium: OAuthManager.getPlatformRequirements(platform).requiresPremium,
    }, "OAuth flow initiated successfully");

    // Set updated session with OAuth state
    await ServerSessionService.setSession(req, updatedSession, response);

    return addSecurityHeaders(response);

  } catch (error) {
    logger.error("OAuth initiation error", { 
      error: error instanceof Error ? error.message : error,
      url: req.url 
    });

    return addSecurityHeaders(createErrorResponse(
      "Failed to initiate OAuth flow",
      500
    ));
  }
}
