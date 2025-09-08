import { type NextRequest, NextResponse } from "next/server"
import { withErrorHandling } from "@/config/middleware/middleware"
import { ServerSessionService } from "@/services/session-server";
import { UserService } from "@/services/user";
import { logger } from "@/config/logger";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

/**
 * GET /api/auth/session
 * Returns the current session information for the authenticated user
 * with platform connection status and provider data (now using minimal session + database)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    // Add some rate limiting logging
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    
    // Get minimal session from cookies
    const minimalSession = await ServerSessionService.getSession(request)
    console.log("Initial minimal session:", minimalSession);
    
    // Log session check for debugging (remove in production)
    logger.info("Session API called", {
      hasSession: !!minimalSession?.userId,
      userAgent: userAgent.substring(0, 100), // truncate for logging
      referer: referer.substring(0, 100) // truncate for logging
    });

    if (!minimalSession?.userId) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        status: { facebook: false, instagram: false, twitter: false, tiktok: false, amazon: false },
        session: {},
      })
    }

    // Build full session from minimal session + database
    const fullSession = await UserService.buildFullSessionFromMinimal(minimalSession);
    const activeProviders = await UserService.getActiveProviders(minimalSession.userId)
    
    // Build connected status from active providers
    const connectedStatus = {
      facebook: false,
      instagram: false,
      twitter: false,
      tiktok: false,
      amazon: false,
    }

    for (const provider of activeProviders) {
      connectedStatus[provider.provider as keyof typeof connectedStatus] = true
    }

    // Return the enhanced session with refreshed data from database
    return NextResponse.json({
      authenticated: true,
      userId: fullSession.userId,
      user: fullSession.user,
      plan: fullSession.plan,
      connectedPlatforms: fullSession.connectedPlatforms,
      status: connectedStatus,
      user_tokens: fullSession.user_tokens,
    })
  } catch (error) {
    console.error("Session API error:", error);
    return NextResponse.json({
      authenticated: false,
      user: null,
      status: { facebook: false, instagram: false, twitter: false, tiktok: false, amazon: false },
      session: {},
      error: "Failed to validate session"
    }, { status: 500 });
  }
});