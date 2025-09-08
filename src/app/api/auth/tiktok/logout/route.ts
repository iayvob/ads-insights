import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/config/logger"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders } from "@/controllers/api-response"
import { ServerSessionService } from "@/services/session-server"
import { UserService } from "@/services/user"
import { env } from "@/validations/env"
import { AuthSession } from "@/validations/types";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

const appUrl = env.APP_URL


export const GET = withErrorHandling(async (request: NextRequest) => {
  // Get current session
  const session = await ServerSessionService.getSession(request)
  if (!session?.userId) {
    logger.warn("No session found for TikTok logout")
    return NextResponse.redirect(`${appUrl}/`)
  }

  // Check if TikTok is connected by querying the database (same way as frontend)
  const providers = await UserService.getActiveProviders(session.userId);
  const tiktokProvider = providers.find(p => p.provider === 'tiktok');

  if (!tiktokProvider) {
    logger.info("TikTok not connected for user", { userId: session.userId });
    return NextResponse.redirect(`${appUrl}/profile?tab=connections&info=tiktok_not_connected`)
  }

  // Remove TikTok from database
  try {
    await UserService.removeAuthProvider("tiktok", session.userId)
  } catch (error) {
    logger.warn("Failed to remove TikTok provider from database", { error, userId: session.userId })
  }

  // Remove TikTok from connected platforms in session
  const updatedConnectedPlatforms = { ...session.connectedPlatforms };
  delete updatedConnectedPlatforms.tiktok;
  
  const updatedSession: AuthSession = {
    ...session,
    connectedPlatforms: updatedConnectedPlatforms
  };

  logger.info("TikTok disconnected", { userId: session.userId })

  const response = NextResponse.redirect(`${appUrl}/profile?tab=connections&success=tiktok_disconnected`)
  const withSession = await ServerSessionService.setSession(request, updatedSession as any, response)
  return addSecurityHeaders(withSession)
})
