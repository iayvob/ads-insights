import { env } from "@/validations/env"
import { NextResponse } from "next/server"

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errors?: string[]
  message?: string
  timestamp: string
  requestId?: string
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

export function createSuccessResponse<T>(data: T, message?: string, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status },
  )
}

export function createErrorResponse(
  error: string | string[] | ApiError,
  status = 400,
  details?: any,
): NextResponse<ApiResponse> {
  let response: ApiResponse

  if (typeof error === "string") {
    response = {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    }
  } else if (Array.isArray(error)) {
    response = {
      success: false,
      errors: error,
      timestamp: new Date().toISOString(),
    }
  } else {
    response = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }

  if (details) {
    response.data = details
  }

  return NextResponse.json(response, { status })
}

export function createValidationErrorResponse(errors: string[]): NextResponse<ApiResponse> {
  return createErrorResponse(errors, 422)
}

export function createRateLimitResponse(resetTime: number): NextResponse<ApiResponse> {
  const response = NextResponse.json(
    {
      success: false,
      error: "Too many requests. Please try again later.",
      timestamp: new Date().toISOString(),
    },
    { status: 429 },
  )

  response.headers.set("Retry-After", Math.ceil((resetTime - Date.now()) / 1000).toString())
  response.headers.set("X-RateLimit-Reset", resetTime.toString())

  return response
}

export function createUnauthorizedResponse(): NextResponse<ApiResponse> {
  return createErrorResponse("Unauthorized access", 401)
}

export function createForbiddenResponse(): NextResponse<ApiResponse> {
  return createErrorResponse("Forbidden access", 403)
}

export function createNotFoundResponse(resource = "Resource"): NextResponse<ApiResponse> {
  return createErrorResponse(`${resource} not found`, 404)
}

export function createInternalServerErrorResponse(): NextResponse<ApiResponse> {
  return createErrorResponse("Internal server error", 500)
}

// CORS headers for API responses
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", env.APP_URL || "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  response.headers.set("Access-Control-Allow-Credentials", "true")
  return response
}

// Security headers
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Content-Security-Policy", "default-src 'self'")
  return response
}
