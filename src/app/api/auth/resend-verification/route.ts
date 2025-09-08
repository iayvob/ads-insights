import type { NextRequest, NextResponse } from "next/server"
import { emailRateLimit } from "@/config/middleware/rate-limiter"
import { validateInput, forgotPasswordSchema } from"@/validations/validation"
import { generateVerificationCode } from"@/validations/validation"
import { sendVerificationEmail } from "@/services/email"
import { prisma } from "@/config/database/prisma"
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createRateLimitResponse,
  addSecurityHeaders,
} from "@/controllers/api-response"

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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      // Don't reveal if email exists
      const response = createSuccessResponse(
        {},
        "If an account with that email exists, we've sent verification instructions.",
      )
      return addSecurityHeaders(response)
    }

    // Check if user already has a valid verification token
    const existingToken = await prisma.token.findFirst({
      where: {
        userId: user.id,
        tokenType: 'VERIFICATION_EMAIL',
        expiresAt: { gt: new Date() }
      }
    });

    if (existingToken) {
      return addSecurityHeaders(createErrorResponse("Verification email already sent. Please check your email.", 400))
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode()
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create verification token
    await prisma.token.create({
      data: {
        userId: user.id,
        tokenType: 'VERIFICATION_EMAIL',
        expiresAt: verificationExpires,
      },
    })

    // Send verification email  
    await sendVerificationEmail(email, verificationCode)

    const response = createSuccessResponse({}, "Verification email sent successfully")

    return addSecurityHeaders(response)
  } catch (error: any) {
    console.error("Resend verification error:", error)

    // Always return success to prevent information disclosure
    const response = createSuccessResponse(
      {},
      "If an account with that email exists, we've sent verification instructions.",
    )

    return addSecurityHeaders(response as NextResponse)
  }
}

export async function OPTIONS() {
  const response = new Response(null, { status: 200 })
  return addSecurityHeaders(response as NextResponse)
}
