import type { NextRequest } from "next/server"
import { generalRateLimit } from "@/config/middleware/rate-limiter"
import {
  createSuccessResponse,
  createRateLimitResponse,
  createUnauthorizedResponse,
  addSecurityHeaders,
} from "@/controllers/api-response"
import { ServerSessionService } from "@/services/session-server"
import { createToken, revokeToken, validateToken } from "@/controllers/authentications"
import { TokenType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = generalRateLimit(req)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.resetTime)
    }

    // Get user ID from the request
    const { platform } = await req.json()

    // Get refresh token from cookies
    const { refreshToken } = await ServerSessionService.getTokenFromCookiesPerPlatform('user', req)

    if (!refreshToken) {
      return addSecurityHeaders(createUnauthorizedResponse())
    }

    // Validate refresh token in database
    const tokenValidation = await validateToken(refreshToken, TokenType.REFRESH_USER)
    if (!tokenValidation.success) {
      return addSecurityHeaders(createUnauthorizedResponse())
    }

    // Revoke old refresh token
    await revokeToken(refreshToken, TokenType.REFRESH_USER)


    // Generate new tokens
    const newAccessToken = await createToken(tokenValidation.user.id, TokenType.ACCESS_USER, tokenValidation.user.email)

    // Create new refresh token
    const newRefreshToken = await createToken(tokenValidation.user.id, TokenType.REFRESH_USER, tokenValidation.user.email)

    // Set new cookies
    await ServerSessionService.setAuthCookies(newAccessToken, newRefreshToken)

    const response = createSuccessResponse(
      {
        user: tokenValidation.user,
        accessToken: newAccessToken,
      },
      "Tokens refreshed successfully",
    )

    return addSecurityHeaders(response)
  } catch (error: any) {
    console.error("Token refresh error:", error)
    return addSecurityHeaders(createUnauthorizedResponse())
  }
}