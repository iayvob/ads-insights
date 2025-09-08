import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { addSecurityHeaders, createSuccessResponse } from "@/controllers/api-response"
import { ServerSessionService } from "@/services/session-server";
import { AuthSession } from "@/validations/types";
import { logger } from "@/config/logger";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)

    if (!session?.userId) {
      return addSecurityHeaders(createSuccessResponse({ success: true }, "No Instagram connection"))
    }

    // Check if Instagram is connected by querying the database (same way as frontend)
    const providers = await UserService.getActiveProviders(session.userId);
    const instagramProvider = providers.find(p => p.provider === 'instagram');

    if (!instagramProvider) {
      logger.info("Instagram not connected for user", { userId: session.userId });
      return addSecurityHeaders(createSuccessResponse(
        { success: true },
        "Instagram not connected"
      ));
    }

    // Try to revoke Instagram token if available
    if (instagramProvider.accessToken && instagramProvider.providerId) {
      try {
        // Revoke Instagram token (Instagram uses Facebook's Graph API)
        await fetch(
          `https://graph.facebook.com/${instagramProvider.providerId}/permissions?access_token=${instagramProvider.accessToken}`,
          { method: "DELETE" },
        )
      } catch (error) {
        logger.warn("Failed to revoke Instagram token", { error, userId: session.userId })
      }
    }

    // Remove from database 
    await UserService.removeAuthProvider("instagram", session.userId)

    // Remove Instagram from connected platforms in session
    const updatedConnectedPlatforms = { ...session.connectedPlatforms };
    delete updatedConnectedPlatforms.instagram;

    const updatedSession: AuthSession = {
      ...session,
      connectedPlatforms: updatedConnectedPlatforms
    };

    const response = createSuccessResponse({ success: true }, "Instagram disconnected")
    const withSession = await ServerSessionService.setSession(request, updatedSession, response)
    return addSecurityHeaders(withSession)

  } catch (error) {
    logger.error("Instagram logout error:", error)
    return addSecurityHeaders(NextResponse.json({ error: "Failed to logout from Instagram" }, { status: 500 }))
  }
}
