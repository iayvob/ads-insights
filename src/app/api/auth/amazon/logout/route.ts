import { type NextRequest, NextResponse } from "next/server"
import { withAuth, withErrorHandling } from "@/config/middleware/middleware"
import { logger } from "@/config/logger"
import { ServerSessionService } from "@/services/session-server"
import { UserService } from "@/services/user"
import { addSecurityHeaders, createSuccessResponse, createErrorResponse } from "@/controllers/api-response"
import { AuthSession } from "@/validations/types";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

async function handler(request: NextRequest): Promise<NextResponse> {
  const session = await ServerSessionService.getSession(request)

  if (!session?.userId) {
    return addSecurityHeaders(createSuccessResponse({}, "No Amazon connection to logout"))
  }

  // Check if Amazon is connected by querying the database (same way as frontend)
  const providers = await UserService.getActiveProviders(session.userId);
  const amazonProvider = providers.find(p => p.provider === 'amazon');

  if (!amazonProvider) {
    logger.info("Amazon not connected for user", { userId: session.userId });
    return addSecurityHeaders(createSuccessResponse({}, "Amazon not connected"));
  }

  try {
    // Note: Amazon Login with Amazon (LwA) doesn't provide a direct token revocation endpoint
    // The access tokens automatically expire based on their lifetime
    // We just need to remove the connection from our session and database

    // Remove from database
    await UserService.removeAuthProvider("amazon", session.userId)

    // Remove Amazon from connected platforms in session
    const updatedConnectedPlatforms = { ...session.connectedPlatforms };
    delete updatedConnectedPlatforms.amazon;
    
    const updatedSession: AuthSession = {
      ...session,
      connectedPlatforms: updatedConnectedPlatforms
    };

    logger.info("Amazon logout completed", { 
      userId: session.userId
    })

    const response = createSuccessResponse({}, "Successfully logged out from Amazon")
    const withSession = await ServerSessionService.setSession(request, updatedSession, response)
    return addSecurityHeaders(withSession)

  } catch (error) {
    logger.error("Amazon logout error", { error, userId: session.userId })
    const errorResponse = createErrorResponse("Failed to logout from Amazon", 500)
    return addSecurityHeaders(errorResponse)
  }
}

export const POST = withAuth(withErrorHandling(handler))
