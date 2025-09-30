import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, withErrorHandling } from "@/config/middleware/middleware";
import { logger } from "@/config/logger";
import { addSecurityHeaders, createSuccessResponse } from "@/controllers/api-response";
import { ServerSessionService } from "@/services/session-server";
import { env } from "@/validations/env";
import crypto from "crypto";
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

const appUrl = env.APP_URL;

async function handler(request: NextRequest): Promise<NextResponse> {
    try {
        // Validate environment variables
        if (!env.TWITTER_API_KEY || !env.TWITTER_API_SECRET) {
            logger.error("Twitter OAuth 1.0a credentials not configured");
            return NextResponse.json({ error: "Twitter OAuth 1.0a not configured" }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const returnTo = searchParams.get("returnTo") || "/profile?tab=connections";

        // Get existing session to ensure user is authenticated
        const existingSession = await ServerSessionService.getSession(request);
        if (!existingSession?.user?.username) {
            logger.warn("User not authenticated for Twitter OAuth 1.0a connection");
            return NextResponse.json({
                error: "Authentication required",
                loginUrl: `/login?returnTo=${encodeURIComponent(returnTo)}`
            }, { status: 401 });
        }

        // Generate OAuth 1.0a request
        const state = crypto.randomBytes(32).toString('hex');
        const callbackUrl = `${appUrl}/api/auth/twitter/oauth1/callback`;

        // Create Twitter API client for OAuth 1.0a
        const client = new TwitterApi({
            appKey: env.TWITTER_API_KEY,
            appSecret: env.TWITTER_API_SECRET,
        });

        // Get OAuth 1.0a request token
        const authLink = await client.generateAuthLink(callbackUrl, { linkMode: 'authorize' });

        logger.info("Twitter OAuth 1.0a flow initiated", {
            userId: existingSession.userId,
            callbackUrl,
            state: state.substring(0, 8) + "...",
            linkMode: 'authorize'
        });

        // Store OAuth 1.0a state in session
        const sessionUpdate = {
            ...existingSession,
            twitterOAuth1: {
                state,
                oauth_token: authLink.oauth_token,
                oauth_token_secret: authLink.oauth_token_secret,
                returnTo,
                initiated: new Date().toISOString(),
            }
        };

        const response = createSuccessResponse({
            message: "Twitter OAuth 1.0a flow initiated",
            redirectUrl: authLink.url,
            authType: "oauth1",
            purpose: "media_uploads"
        });

        const responseWithSession = await ServerSessionService.setSession(request, sessionUpdate, response);
        return addSecurityHeaders(responseWithSession);

    } catch (error) {
        logger.error("Twitter OAuth 1.0a initiation failed", { error });
        return NextResponse.json({
            error: "Failed to initiate Twitter OAuth 1.0a authentication",
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export const POST = withErrorHandling(handler);