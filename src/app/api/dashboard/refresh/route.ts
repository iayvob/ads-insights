import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { withAuth } from "@/config/middleware/middleware"
import { logger } from "@/config/logger"
import { env } from "@/validations/env"
import { ServerSessionService } from "@/services/session-server"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

async function handler(request: NextRequest): Promise<NextResponse> {
  const session = await ServerSessionService.getSession(request)

  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    // Get user's active auth providers
    const activeProviders = await UserService.getActiveProviders(session.userId)

    // Check for tokens that need refreshing
    const refreshPromises = activeProviders
      .filter((provider) => UserService.needsTokenRefresh(provider))
      .map(async (provider) => {
        try {
          // Implement token refresh logic for each provider
          switch (provider.provider) {
            case "facebook":
              // Facebook tokens are long-lived, typically don't need refresh
              break
            case "instagram":
              // Instagram uses Facebook's token system
              break
            case "twitter":
              if (provider.refreshToken) {
                // Refresh Twitter token
                const response = await fetch("https://api.twitter.com/2/oauth2/token", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${Buffer.from(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`).toString("base64")}`,
                  },
                  body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: provider.refreshToken,
                  }),
                })

                if (response.ok) {
                  const tokenData = await response.json()

                  // Update the provider with new tokens
                  await UserService.upsertAuthProvider(session.userId, {
                    provider: "twitter",
                    providerId: provider.providerId,
                    username: provider.username ?? undefined,
                    email: provider.email ?? undefined,
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token,
                    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
                    profileImage: provider.profileImage ?? undefined,
                  })

                  logger.info("Twitter token refreshed", {
                    userId: session.userId,
                    providerId: provider.providerId,
                  })
                }
              }
              break
          }
        } catch (error) {
          logger.warn(`Failed to refresh token for ${provider.provider}`, {
            error,
            userId: session.userId,
            provider: provider.provider,
          })
        }
      })

    await Promise.all(refreshPromises)

    logger.info("Dashboard refresh completed", {
      userId: session.userId,
      providersRefreshed: refreshPromises.length,
    })

    return NextResponse.json({ success: true, message: "Dashboard refreshed successfully" })
  } catch (error) {
    logger.error("Failed to refresh dashboard", {
      error,
      userId: session.userId,
    })

    return NextResponse.json({ error: "Failed to refresh dashboard" }, { status: 500 })
  }
}

export const POST = withAuth(handler)
