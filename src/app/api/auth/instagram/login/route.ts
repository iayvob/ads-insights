import { type NextRequest, NextResponse } from "next/server"
import { generateState } from "@/services/authentications"
import { OAuthService } from "@/services/oauth"
import { withRateLimit, withErrorHandling } from "@/config/middleware/middleware"
import { logger } from "@/config/logger"
import { addSecurityHeaders, createSuccessResponse } from "@/controllers/api-response"
import { ServerSessionService } from "@/services/session-server"
import { env } from "@/validations/env"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

const appUrl = env.APP_URL


async function handler(request: NextRequest): Promise<NextResponse> {
  const state = generateState()
  const redirectUri = `${appUrl}/api/auth/instagram/callback`

  // Get existing session or create new one
  const existingSession = (await ServerSessionService.getSession(request)) || { 
    userId: "", 
    createdAt: Date.now() 
  }
  
  // Ensure we have a session with proper user data
  if (!existingSession.userId) {
    logger.error("No authenticated session found for Instagram login");
    return NextResponse.json({
      success: false,
      error: "User not authenticated"
    }, { status: 401 });
  }

  // Update session with state for OAuth flow
  const session = { 
    ...existingSession, 
    state,
  }

  const authUrl = OAuthService.buildInstagramAuthUrl(state, redirectUri)

  logger.info("Instagram auth initiated", { 
    state, 
    userId: existingSession.userId,
    redirectUri 
  })

  const response = createSuccessResponse({ authUrl }, "Instagram auth URL generated")
  const withSession = await ServerSessionService.setSession(request, session as any, response)
  return addSecurityHeaders(withSession)
}

export const POST = withRateLimit(withErrorHandling(handler))