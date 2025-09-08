import type { NextRequest } from "next/server"
import { generalRateLimit } from "@/config/middleware/rate-limiter"
import { createSuccessResponse, createRateLimitResponse, addSecurityHeaders } from "@/controllers/api-response"
import { ServerSessionService } from "@/services/session-server"
import { revokeToken } from "@/controllers/authentications"
import { TokenType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = generalRateLimit(req)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.resetTime)
    }

    // Get refresh token from cookies
    const { refreshToken } = await ServerSessionService.getTokenFromCookiesPerPlatform('user', req)

    if (refreshToken) {
      // Verify and revoke refresh token
      await revokeToken(refreshToken, TokenType.REFRESH_USER)

    }

    // Clear auth cookies
    await ServerSessionService.clearAuthCookies()

    const response = createSuccessResponse({}, "Signed out successfully")

    return addSecurityHeaders(response)
  } catch (error: any) {
    console.error("Sign out error:", error)

    // Clear cookies even if there's an error
    await ServerSessionService.clearAuthCookies()

    const response = createSuccessResponse({}, "Signed out successfully")

    return addSecurityHeaders(response)
  }
}