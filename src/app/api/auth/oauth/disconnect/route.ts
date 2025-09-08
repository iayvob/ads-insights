import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse, addSecurityHeaders } from "@/controllers/api-response";
import { ServerSessionService } from "@/services/session-server";
import { logger } from "@/config/logger";
import { AuthSession } from "@/validations/types";

export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await ServerSessionService.getSession(req);
    if (!session?.userId) {
      return addSecurityHeaders(createErrorResponse("Authentication required", 401));
    }

    // Get platform from query parameters
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');

    if (!platform) {
      return addSecurityHeaders(createErrorResponse("Platform parameter is required", 400));
    }

    // Validate platform
    const validPlatforms = ['facebook', 'instagram', 'twitter', 'amazon'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return addSecurityHeaders(createErrorResponse("Invalid platform", 400));
    }

    // Check if platform is connected
    if (!session.connectedPlatforms || !session.connectedPlatforms[platform as keyof typeof session.connectedPlatforms]) {
      return addSecurityHeaders(createErrorResponse(`${platform} is not connected`, 400));
    }

    // Remove platform from session
    const updatedSession: AuthSession = {
      ...session,
      connectedPlatforms: {
        ...session.connectedPlatforms,
      },
    };

    // Delete the platform connection if it exists
    if (updatedSession.connectedPlatforms) {
      delete updatedSession.connectedPlatforms[platform as keyof typeof updatedSession.connectedPlatforms];
    }

    // Create success response
    const response = createSuccessResponse({
      platform,
      disconnected: true,
      message: `Successfully disconnected from ${platform}`,
    }, `${platform} disconnection successful`);

    // Update session
    await ServerSessionService.setSession(req, updatedSession, response);

    logger.info("Platform disconnection successful", {
      userId: session.userId,
      platform,
    });

    return addSecurityHeaders(response);

  } catch (error) {
    logger.error("Platform disconnection error", {
      error: error instanceof Error ? error.message : error,
      url: req.url,
    });

    return addSecurityHeaders(createErrorResponse(
      "Failed to disconnect platform",
      500
    ));
  }
}
