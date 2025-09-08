import type { NextRequest } from "next/server"
import { authRateLimit } from "@/config/middleware/rate-limiter"
import { sendVerificationSchema, validateInput } from "@/validations/validation"
import { logger } from "@/config/logger"
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createRateLimitResponse,
  addSecurityHeaders,
} from "@/controllers/api-response"
import { generateVerificationCode, sendVerificationEmail } from "@/services/email"

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
    const validation = validateInput(sendVerificationSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors)
    }

    const { email } = validation.data
    const normalizedEmail = email.toLowerCase().trim()

    // Generate verification code
    const verificationCode = generateVerificationCode()

    // Send verification email
    const emailResult = await sendVerificationEmail(normalizedEmail, verificationCode)

    if (!emailResult) {
      logger.error("Failed to send verification email", { email: normalizedEmail })
      return addSecurityHeaders(createErrorResponse("Failed to send verification email", 500))
    }

    logger.info("Verification email sent", { 
      email: normalizedEmail, 
    })

    const response = createSuccessResponse(
      { 
        message: "Verification code sent to your email",
        expiresIn: "10 minutes"
      },
      "Verification email sent successfully"
    )

    return addSecurityHeaders(response)

  } catch (error: any) {
    logger.error("Send verification email error:", error)
    return addSecurityHeaders(createErrorResponse("Failed to send verification email", 500))
  }
}
