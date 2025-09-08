import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { withAuth } from "@/config/middleware/middleware"
import { logger } from "@/config/logger"
import { ServerSessionService } from "@/services/session-server";
import { AuthSession } from "@/validations/types";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

async function handler(request: NextRequest): Promise<NextResponse> {
  const session = await ServerSessionService.getSession(request)

  if (!session?.userId) {
    return NextResponse.json({ success: true })
  }

  try {
    // Check if Facebook is connected by querying the database (same way as frontend)
    const providers = await UserService.getActiveProviders(session.userId);
    const facebookProvider = providers.find(p => p.provider === 'facebook');

    if (!facebookProvider) {
      logger.info("Facebook not connected for user", { userId: session.userId });
      return NextResponse.json({ 
        success: true, 
        message: "Facebook not connected" 
      });
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
    logger.error("Error during Facebook logout", { error, userId: session.userId })
    return NextResponse.json({ success: false, error: "Failed to log out from Facebook" }, { status: 500 })
  }
}

export const POST = withAuth(handler)
