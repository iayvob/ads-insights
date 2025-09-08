import { requireAuth } from "@/config/middleware/auth"
import { authRateLimit } from "@/config/middleware/rate-limiter"
import { addSecurityHeaders, createErrorResponse, createRateLimitResponse, createSuccessResponse, createValidationErrorResponse } from "@/controllers/api-response"
import { changePassword } from "@/controllers/authentications"
import { changePasswordSchema, validateInput } from "@/validations/validation"

export const POST = requireAuth(async (req) => {
  try {
    // Apply rate limiting
    const rateLimitResult = authRateLimit(req)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.resetTime)
    }

    // Parse request body
    const body = await req.json()

    // Validate input
    const validation = validateInput(changePasswordSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors)
    }

    const { currentPassword, newPassword } = validation.data

    // Change password
    await changePassword(req.user!.userId, currentPassword, newPassword)

    const response = createSuccessResponse({}, "Password changed successfully")

    return addSecurityHeaders(response)
  } catch (error: any) {
    console.error("Change password error:", error)

    if (error.message.includes("Current password is incorrect")) {
      return addSecurityHeaders(createErrorResponse(error.message, 400))
    }

    return addSecurityHeaders(createErrorResponse("Password change failed", 500))
  }
})