import { authRateLimit } from "@/config/middleware/rate-limiter"
import { addSecurityHeaders, createErrorResponse, createRateLimitResponse, createSuccessResponse, createValidationErrorResponse } from "@/controllers/api-response"
import { resetPassword } from "@/controllers/authentications"
import { resetPasswordSchema, validateInput } from "@/validations/validation"
import type { NextRequest } from "next/server"

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
    const validation = validateInput(resetPasswordSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors)
    }

    const { token, password } = validation.data

    // Reset password
    await resetPassword(token, password)

    const response = createSuccessResponse({}, "Password reset successfully")

    return addSecurityHeaders(response)
  } catch (error: any) {
    console.error("Reset password error:", error)

    if (error.message.includes("Invalid or expired")) {
      return addSecurityHeaders(createErrorResponse(error.message, 400))
    }

    return addSecurityHeaders(createErrorResponse("Password reset failed", 500))
  }
}