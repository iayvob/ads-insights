import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse, addSecurityHeaders } from "@/controllers/api-response";
import { ServerSessionService } from "@/services/session-server";
import { OAuthManager } from "@/services/oauth-manager";
import { logger } from "@/config/logger";

export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await ServerSessionService.getSession(req);
    if (!session?.userId || !session?.plan) {
      return addSecurityHeaders(createErrorResponse("Authentication required", 401));
    }

    // Get platform status
    const availablePlatforms = OAuthManager.getAvailablePlatforms(session.plan, session);
    const connectedCount = OAuthManager.getConnectedPlatformCount(session);
    const isMultiPlatformAllowed = OAuthManager.isMultiPlatformAllowed(session.plan);
    const premiumLockedPlatforms = OAuthManager.getPremiumLockedPlatforms(session.plan);

    // Get platform requirements for each platform
    const platformRequirements = availablePlatforms.reduce((acc, platform) => {
      acc[platform.platform] = OAuthManager.getPlatformRequirements(platform.platform);
      return acc;
    }, {} as Record<string, any>);

    const response = createSuccessResponse({
      userPlan: session.plan,
      availablePlatforms,
      connectedCount,
      isMultiPlatformAllowed,
      premiumLockedPlatforms,
      platformRequirements,
      limits: {
        freemiumMaxConnections: 1,
        premiumMaxConnections: 'unlimited',
      },
    }, "Platform status retrieved successfully");

    return addSecurityHeaders(response);

  } catch (error) {
    logger.error("Platform status error", {
      error: error instanceof Error ? error.message : error,
    });

    return addSecurityHeaders(createErrorResponse(
      "Failed to get platform status",
      500
    ));
  }
}
