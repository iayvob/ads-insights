import { type NextRequest, NextResponse } from "next/server"
import { OAuthService } from "@/services/oauth"
import { generateState } from "@/services/authentications"
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
  const redirectUri = `${appUrl}/api/auth/amazon/callback`

  // Get existing session or create new one
  const existingSession = (await ServerSessionService.getSession(request)) || { userId: "", createdAt: Date.now() }
  const session = { ...existingSession, state }

  const authUrl = OAuthService.buildAmazonAuthUrl(state, redirectUri)

  logger.info("Amazon auth initiated", { state })

  const response = createSuccessResponse({ authUrl }, "Amazon auth URL generated")
  const withSession = await ServerSessionService.setSession(request, session as any, response)
  return addSecurityHeaders(withSession)
}

export const GET = withRateLimit(withErrorHandling(handler))
