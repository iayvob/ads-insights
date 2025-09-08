import { emailRateLimit } from "@/config/middleware/rate-limiter"
import { addSecurityHeaders, createRateLimitResponse, createSuccessResponse, createValidationErrorResponse } from "@/controllers/api-response"
import { createPasswordResetToken } from "@/controllers/authentications"
import { forgotPasswordSchema, validateInput } from "@/validations/validation"
import type { NextRequest } from "next/server"


export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting (stricter for email sending)
    const rateLimitResult = emailRateLimit(req)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.resetTime)
    }

    // Parse request body
    const body = await req.json()

    // Validate input
    const validation = validateInput(forgotPasswordSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors)
    }

    const { email } = validation.data

    // Create password reset token and send email
    await createPasswordResetToken(email.toLowerCase().trim())

    // Always return success to prevent email enumeration
    const response = createSuccessResponse(
      {},
      "If an account with that email exists, we've sent password reset instructions.",
    )

    return addSecurityHeaders(response)
  } catch (error: any) {
    console.error("Forgot password error:", error)

    // Always return success to prevent information disclosure
    const response = createSuccessResponse(
      {},
      "If an account with that email exists, we've sent password reset instructions.",
    )

    return addSecurityHeaders(response)
  }
}
