import { type NextRequest, NextResponse } from "next/server"
import { OAuthService } from "@/services/oauth"
import { withRateLimit, withErrorHandling } from "@/config/middleware/middleware"
import { logger } from "@/config/logger"
import { generateState } from "@/services/authentications"
import { addSecurityHeaders, createSuccessResponse } from "@/controllers/api-response"
import { ServerSessionService } from "@/services/session-server"
import { env } from "@/validations/env"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

const appUrl = env.APP_URL


async function handler(request: NextRequest): Promise<NextResponse> {
  const state = generateState()
  const redirectUri = `${appUrl}/api/auth/facebook/callback`

  // Debug logging
  console.log('Facebook Auth Debug:', {
    state,
    redirectUri,
    timestamp: new Date().toISOString()
  });

  // Get existing session or create new one
  const existingSession = (await ServerSessionService.getSession(request)) || { userId: "", createdAt: Date.now() }
  const session = { ...existingSession, state }

  const authUrl = OAuthService.buildFacebookAuthUrl(state, redirectUri)
  
  // Debug the generated URL
  console.log('Facebook Auth URL:', authUrl);

  logger.info("Facebook auth initiated", { state })

  const response = createSuccessResponse({ authUrl }, "Facebook auth URL generated")
  const withSession = await ServerSessionService.setSession(request, session as any, response)
  return addSecurityHeaders(withSession)
}

export const POST = withRateLimit(withErrorHandling(handler))