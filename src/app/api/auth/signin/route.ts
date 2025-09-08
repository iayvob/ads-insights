import type { NextRequest } from "next/server"
import { authRateLimit } from "@/config/middleware/rate-limiter"
import { validateInput, signInSchema } from "@/validations/validation"
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createRateLimitResponse,
  addSecurityHeaders,
} from "@/controllers/api-response"
import { authenticateUser, createToken } from "@/controllers/authentications"
import { TokenType } from "@prisma/client"
import { ServerSessionService } from "@/services/session-server"

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = authRateLimit(req)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.resetTime)
    }

    // Parse request body
    const body = await req.json()

    // Validate input
    const validation = validateInput(signInSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors)
    }

    const { email, password } = validation.data

    // Authenticate user
    const authResult = await authenticateUser(email.toLowerCase().trim(), password)

    // Create refresh token in database
    const refreshToken = await createToken(authResult.user.id, TokenType.REFRESH_USER)

    // Generate JWT tokens
    const accessToken = await createToken(authResult.user.id, TokenType.ACCESS_USER)

  // Set HTTP-only cookies
    const sessionData = {
      userId: authResult.user.id,
      plan: authResult.user.plan,
      user: {
        email: authResult.user.email,
        username: authResult.user.username,
        image: authResult.user.image || undefined,
      },
      user_tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }
  // Create response and attach the session cookie to it
  const response = createSuccessResponse(
      {
        user: authResult.user,
        accessToken,
      },
      "Sign in successful",
    )

  const withSession = await ServerSessionService.setSession(req, sessionData, response)
  return addSecurityHeaders(withSession)
  } catch (error: any) {
    console.error("Sign in error:", error)

    if (error.message.includes("Invalid email or password")) {
      return addSecurityHeaders(createErrorResponse("Invalid email or password", 401))
    }

    if (error.message.includes("verify your email")) {
      return addSecurityHeaders(createErrorResponse("Please verify your email before signing in", 403))
    }

    return addSecurityHeaders(createErrorResponse("Sign in failed", 500))
  }
}