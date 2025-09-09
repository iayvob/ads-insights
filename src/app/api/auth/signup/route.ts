import type { NextRequest } from "next/server"
import { authRateLimit } from "@/config/middleware/rate-limiter"
import { validateInput, signUpSchema, sanitizeHtml } from "@/validations/validation"
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createRateLimitResponse,
  addSecurityHeaders,
} from "@/controllers/api-response"
import { createToken, createUser } from "@/controllers/authentications"
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
    const validation = validateInput(signUpSchema, body)
    if (!validation.success) {
      console.log(validation.errors);
      return createValidationErrorResponse(validation.errors)
    }

    const { email, username, password } = validation.data

    // Sanitize input to prevent XSS
    const sanitizedData = {
      email: email.toLowerCase().trim(),
      username: sanitizeHtml(username.trim()),
      password: sanitizeHtml(password.trim()),
    }

    // Create user
    const authResult = await createUser(sanitizedData)

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

    const response = createSuccessResponse(
      {
        user: authResult.user,
        access_token: accessToken,
      },
      "User created successfully. Please check your email for verification instructions.",
      201,
    )

    const withSession = await ServerSessionService.setSession(
      req,
      sessionData,
      response
    )


    return addSecurityHeaders(withSession)
  } catch (error: any) {
    console.error("Sign up error:", error)

    if (error.message.includes("already exists") || error.message.includes("already taken")) {
      const resource = error.message.includes("email") ? "email address" : "username";
      return addSecurityHeaders(createErrorResponse(`This ${resource} is already registered. Please use a different one or sign in to your existing account.`, 409))
    }

    if (error.message.includes("validation")) {
      return addSecurityHeaders(createErrorResponse("Please check your information and ensure all fields are filled correctly.", 422))
    }

    if (error.message.includes("rate limit")) {
      return addSecurityHeaders(createErrorResponse("Too many signup attempts. Please wait a moment before trying again.", 429))
    }

    return addSecurityHeaders(createErrorResponse("We couldn't create your account at this time. Please try again later.", 500))
  }
}