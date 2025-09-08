import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/validations/env"
import { UserService } from "@/services/user"
import { addSecurityHeaders, createSuccessResponse } from "@/controllers/api-response"
import { ServerSessionService } from "@/services/session-server";
import { AuthSession } from "@/validations/types";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)

    if (!session?.userId) {
      return addSecurityHeaders(createSuccessResponse({ success: true }, "No Twitter connection"))
    }

    // Check if Twitter is connected by querying the database (same way as frontend)
    const providers = await UserService.getActiveProviders(session.userId);
    const twitterProvider = providers.find(p => p.provider === 'twitter');

    if (!twitterProvider) {
      console.log("Twitter not connected for user", { userId: session.userId });
      return addSecurityHeaders(createSuccessResponse(
        { success: true }, 
        "Twitter not connected"
      ));
    }

    // Try to revoke Twitter token if available
    if (twitterProvider.accessToken) {
      try {
        // Revoke Twitter token
        await fetch("https://api.twitter.com/2/oauth2/revoke", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            token: twitterProvider.accessToken,
            token_type_hint: "access_token",
          }),
        })
      } catch (error) {
        console.warn("Failed to revoke Twitter token", { error, userId: session.userId })
      }
    }

    // Remove from database
    await UserService.removeAuthProvider("twitter", session.userId)

    // Remove Twitter from connected platforms in session
    const updatedConnectedPlatforms = { ...session.connectedPlatforms };
    delete updatedConnectedPlatforms.twitter;
    
    const updatedSession: AuthSession = {
      ...session,
      connectedPlatforms: updatedConnectedPlatforms
    };

    const response = createSuccessResponse({ success: true }, "Twitter disconnected")
    const withSession = await ServerSessionService.setSession(request, updatedSession, response)
    return addSecurityHeaders(withSession)

  } catch (error) {
    console.error("Twitter logout error:", error)
    return addSecurityHeaders(NextResponse.json({ error: "Failed to logout from Twitter" }, { status: 500 }))
  }
}
