import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { logger } from "@/config/logger"
import { ServerSessionService } from "@/services/session-server";
import { AuthSession } from "@/validations/types";
import { addSecurityHeaders, createSuccessResponse } from "@/controllers/api-response";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export async function POST(request: NextRequest) {

  try {
    // Check if Facebook is connected by querying the database (same way as frontend)
    const session = await ServerSessionService.getSession(request)

    if (!session?.userId) {
      return NextResponse.json({ success: true })
    }
    const providers = await UserService.getActiveProviders(session.userId);
    const facebookProvider = providers.find(p => p.provider === 'facebook');

    if (!facebookProvider) {
      logger.info("Facebook not connected for user", { userId: session.userId });
      return addSecurityHeaders(createSuccessResponse(
        { success: true },
        "Facebook not connected"
      ));
    }

    // Try to revoke Facebook token if available
    if (facebookProvider.accessToken && facebookProvider.providerId) {
      try {
        // Revoke Facebook token
        await fetch(
          `https://graph.facebook.com/${facebookProvider.providerId}/permissions?access_token=${facebookProvider.accessToken}`,
          { method: "DELETE" },
        )
      } catch (error) {
        logger.warn("Failed to revoke Facebook token", { error, userId: session.userId })
      }
    }

    // Remove from database
    await UserService.removeAuthProvider("facebook", session.userId)

    // Remove Facebook from connected platforms in session
    const updatedConnectedPlatforms = { ...session.connectedPlatforms };
    delete updatedConnectedPlatforms.facebook;

    const updatedSession: AuthSession = {
      ...session,
      connectedPlatforms: updatedConnectedPlatforms
    };

    logger.info("Facebook logout completed", { userId: session.userId })

    const response = NextResponse.json({ success: true })
    await ServerSessionService.setSession(request, updatedSession, response)
    return response
  } catch (error) {
    logger.error("Facebook logout error:", error)
    return addSecurityHeaders(NextResponse.json({ error: "Failed to logout from Facebook" }, { status: 500 }))
  }
}