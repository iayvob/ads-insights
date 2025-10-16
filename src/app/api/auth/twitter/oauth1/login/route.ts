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
            logger.error("Twitter OAuth 1.0a credentials not configured", {
                hasApiKey: !!env.TWITTER_API_KEY,
                hasApiSecret: !!env.TWITTER_API_SECRET,
                apiKeyLength: env.TWITTER_API_KEY?.length,
                apiSecretLength: env.TWITTER_API_SECRET?.length
            });
            return NextResponse.json({ error: "Twitter OAuth 1.0a not configured" }, { status: 500 });
        }

        logger.info("Twitter OAuth 1.0a credentials loaded", {
            apiKeyPrefix: env.TWITTER_API_KEY?.substring(0, 8),
            apiSecretPrefix: env.TWITTER_API_SECRET?.substring(0, 8)
        });

        const { searchParams } = new URL(request.url);
        const returnTo = searchParams.get("returnTo") || "/profile?tab=connections";

        // Check if this is part of unified flow
        const userId = searchParams.get("userId");
        const providerId = searchParams.get("providerId");
        const username = searchParams.get("username");
        const fromUnified = searchParams.get("from_unified") === 'true';

        // Get existing session to ensure user is authenticated
        const existingSession = await ServerSessionService.getSession(request);
        if (!existingSession?.user?.username && !fromUnified) {
            logger.warn("User not authenticated for Twitter OAuth 1.0a connection");
            return NextResponse.json({
                error: "Authentication required",
                loginUrl: `/login?returnTo=${encodeURIComponent(returnTo)}`
            }, { status: 401 });
        }

        // Generate OAuth 1.0a request
        const state = crypto.randomBytes(32).toString('hex');

        // Build callback URL - keep it clean for Twitter OAuth 1.0a requirements
        // Unified flow parameters will be stored in session instead
        const callbackUrl = `${appUrl}/api/auth/twitter/oauth1/callback`;

        // Create Twitter API client for OAuth 1.0a
        const client = new TwitterApi({
            appKey: env.TWITTER_API_KEY,
            appSecret: env.TWITTER_API_SECRET,
        });

        logger.info("Created Twitter API client for OAuth 1.0a", {
            callbackUrl,
            linkMode: 'authorize'
        });

        // Get OAuth 1.0a request token
        const authLink = await client.generateAuthLink(callbackUrl, { linkMode: 'authorize' });

        logger.info("Twitter OAuth 1.0a auth link generated", {
            hasUrl: !!authLink.url,
            hasToken: !!authLink.oauth_token,
            hasSecret: !!authLink.oauth_token_secret,
            urlLength: authLink.url?.length
        });

        logger.info("Twitter OAuth 1.0a flow initiated", {
            userId: existingSession?.userId || (userId ?? undefined),
            callbackUrl,
            state: state.substring(0, 8) + "...",
            linkMode: 'authorize',
            isUnifiedFlow: fromUnified
        });

        // Store OAuth 1.0a state in session
        const sessionUpdate = {
            ...existingSession,
            userId: existingSession?.userId || '',
            twitterOAuth1: {
                state,
                oauth_token: authLink.oauth_token,
                oauth_token_secret: authLink.oauth_token_secret,
                returnTo,
                initiated: new Date().toISOString(),
                fromUnified, // Track if this is part of unified flow
                userId: (userId ?? existingSession?.userId ?? '') as string,
                providerId: providerId || undefined,
                username: username || undefined,
            }
        };

        // Save session and redirect to Twitter
        const sessionResponse = NextResponse.redirect(authLink.url);
        const responseWithSession = await ServerSessionService.setSession(request, sessionUpdate, sessionResponse);
        return addSecurityHeaders(responseWithSession);

    } catch (error) {
        logger.error("Twitter OAuth 1.0a initiation failed", {
            error: error instanceof Error ? {
                message: error.message,
                name: error.name,
                stack: error.stack
            } : String(error),
            hasApiKey: !!env.TWITTER_API_KEY,
            hasApiSecret: !!env.TWITTER_API_SECRET,
            appUrl: env.APP_URL,
            nodeEnv: process.env.NODE_ENV
        });
        return NextResponse.json({
            error: "Failed to initiate Twitter OAuth 1.0a authentication",
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Export both POST and GET to support both standalone and unified flows
export const POST = withErrorHandling(handler);
export const GET = withErrorHandling(handler);