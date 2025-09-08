import type { NextRequest } from "next/server"
import { createUnauthorizedResponse } from "@/controllers/api-response"
import { validateToken } from "@/controllers/authentications"
import { TokenType } from "@prisma/client"
import { ServerSessionService } from "@/services/session-server"

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string
    email: string
    username: string
    role?: string
  }
}

export async function authenticateRequest(req: NextRequest): Promise<{
  success: boolean
  user?: any
  error?: string
}> {
  try {
    const { accessToken, refreshToken } = await ServerSessionService.getUserTokens(req)

    // Try to verify access token first
    if (accessToken) {
      const payload = await validateToken(accessToken, TokenType.ACCESS_USER)
      if (payload) {
        return {
          success: true,
          user: {
            userId: payload.user.id,
            email: payload.user.email,
            username: payload.user.username,
          },
        }
      }
    }

    // If access token is invalid, try refresh token
    if (refreshToken) {
      const refreshPayload = await validateToken(refreshToken, TokenType.REFRESH_USER)
      if (refreshPayload) {
        return {
          success: true,
          user: {
            userId: refreshPayload.user.id,
            email: refreshPayload.user.email,
            username: refreshPayload.user.username,
          },
        }
      }
    }
    return {
      success: false,
      error: "Invalid or expired authentication token",
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return {
      success: false,
      error: "Authentication failed",
    }
  }
}

export function requireAuth(handler: (req: AuthenticatedRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    const auth = await authenticateRequest(req)

    if (!auth.success) {
      return createUnauthorizedResponse()
    }

    // Add user to request
    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.user = auth.user

    return handler(authenticatedReq)
  }
}