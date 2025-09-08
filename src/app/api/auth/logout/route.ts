import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { withErrorHandling } from "@/config/middleware/middleware"
import { logger } from "@/config/logger"
import { addSecurityHeaders, createSuccessResponse } from "@/controllers/api-response"
import { env } from "@/validations/env"
import { ServerSessionService } from "@/services/session-server"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

async function handler(request: NextRequest): Promise<NextResponse> {
  try {
    // Try to get session, but don't fail if it's invalid/expired
    const session = await ServerSessionService.getSession(request)
    
    if (session?.userId) {
      try {
        // Get all user's auth providers
        const activeProviders = await UserService.getActiveProviders(session.userId)

        // Revoke tokens for each provider
        const revokePromises = activeProviders.map(async (provider) => {
          try {
            switch (provider.provider) {
              case "facebook":
                await fetch(
                  `https://graph.facebook.com/${provider.providerId}/permissions?access_token=${provider.accessToken}`,
                  { method: "DELETE" },
                )
                break

              case "instagram":
                // Instagram uses Facebook's token system
                await fetch(
                  `https://graph.facebook.com/${provider.providerId}/permissions?access_token=${provider.accessToken}`,
                  { method: "DELETE" },
                )
                break

              case "twitter":
                if (provider.accessToken) {
                  await fetch("https://api.twitter.com/2/oauth2/revoke", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/x-www-form-urlencoded",
                      Authorization: `Basic ${Buffer.from(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`).toString("base64")}`,
                    },
                    body: new URLSearchParams({
                      token: provider.accessToken,
                      token_type_hint: "access_token",
                    }),
                  })
                }
                break
            }

            // Remove provider from database
            await UserService.removeAuthProvider(provider.provider, session.userId)
          } catch (error) {
            logger.warn(`Failed to revoke ${provider.provider} token`, {
              error,
              userId: session.userId,
              provider: provider.provider,
            })
          }
        })

        await Promise.all(revokePromises)

        logger.info("User logged out from all providers", {
          userId: session.userId,
          providersCount: activeProviders.length,
        })
      } catch (error) {
        logger.warn("Failed to revoke some providers during logout", {
          error,
          userId: session.userId,
        })
        // Continue with logout even if provider revocation fails
      }
    } else {
      logger.info("Logout attempt with no valid session - proceeding to clear cookies")
    }

    // Always clear session cookies, regardless of whether we found a valid session
    const response = createSuccessResponse({ success: true }, "Logged out successfully")
    await ServerSessionService.clearSession(response)
    return addSecurityHeaders(response)
    
  } catch (error) {
    logger.error("Failed to logout user", {
      error,
      url: request.url,
    })

    // Even if there's an error, clear the session cookies
    const response = createSuccessResponse({ success: true }, "Logged out successfully")
    await ServerSessionService.clearSession(response)
    return addSecurityHeaders(response)
  }
}

export const POST = withErrorHandling(handler)
