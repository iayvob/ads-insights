import type { NextRequest } from "next/server"
import { authRateLimit } from "@/config/middleware/rate-limiter"
import { validateInput, verifyEmailSchema } from "@/validations/validation"
import { logger } from "@/config/logger"
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createRateLimitResponse,
  addSecurityHeaders,
} from "@/controllers/api-response"
import { verifyEmailCode } from "@/controllers/authentications"

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
    const validation = validateInput(verifyEmailSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors)
    }

    const { email, code } = validation.data
    const normalizedEmail = email.toLowerCase().trim()

    // Validate verification code
    const verificationEmailCode = await verifyEmailCode(normalizedEmail, code)

    if (!verificationEmailCode) {
      return addSecurityHeaders(createErrorResponse("Invalid or expired verification code", 400))
    }

    logger.info("Email verification successful", { 
      email: normalizedEmail, 
    })

    const response = createSuccessResponse(
      { 
        message: "Email verified successfully",
      },
      "Email verification successful"
    )

    return addSecurityHeaders(response)

  } catch (error: any) {
    logger.error("Email verification error:", error)
    return addSecurityHeaders(createErrorResponse("Email verification failed", 500))
  }
}