import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/config/middleware/middleware";
import { logger } from "@/config/logger";
import { addSecurityHeaders } from "@/controllers/api-response";
import { ServerSessionService } from "@/services/session-server";
import { env } from "@/validations/env";
import { TwitterApi } from 'twitter-api-v2';
import { AuthSession } from "@/validations/types";
import { UserService } from "@/services/user";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

async function handler(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const oauth_token = searchParams.get("oauth_token");
        const oauth_verifier = searchParams.get("oauth_verifier");
        const denied = searchParams.get("denied");

        logger.info("Twitter OAuth 1.0a callback received", {
            hasToken: !!oauth_token,
            hasVerifier: !!oauth_verifier,
            denied: denied
        });

        // Handle user denial
        if (denied) {
            logger.info("User denied Twitter OAuth 1.0a access", { denied });
            return NextResponse.redirect(
                new URL("/profile?tab=connections&error=access_denied&provider=twitter_oauth1", env.APP_URL)
            );
        }

        // Validate required parameters
        if (!oauth_token || !oauth_verifier) {
            logger.error("Missing OAuth 1.0a parameters", { oauth_token: !!oauth_token, oauth_verifier: !!oauth_verifier });
            return NextResponse.redirect(
                new URL("/profile?tab=connections&error=missing_parameters&provider=twitter_oauth1", env.APP_URL)
            );
        }

        // Get session with OAuth 1.0a state
        const session = await ServerSessionService.getSession(request);
        const twitterOAuth1 = (session as any)?.twitterOAuth1;

        if (!session || !twitterOAuth1?.oauth_token || !twitterOAuth1?.oauth_token_secret) {
            logger.error("Invalid session state for OAuth 1.0a", {
                hasSession: !!session,
                hasOAuthToken: !!twitterOAuth1?.oauth_token,
                hasOAuthSecret: !!twitterOAuth1?.oauth_token_secret
            });
            return NextResponse.redirect(
                new URL("/profile?tab=connections&error=invalid_state&provider=twitter_oauth1", env.APP_URL)
            );
        }

        // Verify oauth_token matches session
        if (twitterOAuth1.oauth_token !== oauth_token) {
            logger.error("OAuth token mismatch", {
                sessionToken: twitterOAuth1.oauth_token?.substring(0, 8) + "...",
                callbackToken: oauth_token.substring(0, 8) + "..."
            });
            return NextResponse.redirect(
                new URL("/profile?tab=connections&error=token_mismatch&provider=twitter_oauth1", env.APP_URL)
            );
        }

        // Create Twitter client with request token
        const client = new TwitterApi({
            appKey: env.TWITTER_API_KEY!,
            appSecret: env.TWITTER_API_SECRET!,
            accessToken: oauth_token,
            accessSecret: twitterOAuth1.oauth_token_secret,
        });

        // Exchange for access token
        const { client: loggedClient, accessToken, accessSecret } = await client.login(oauth_verifier);

        // Get user info
        const twitterUser = await loggedClient.v2.me({
            'user.fields': ['id', 'username', 'name', 'profile_image_url', 'public_metrics']
        });

        if (!twitterUser.data) {
            logger.error("Failed to get Twitter user info via OAuth 1.0a");
            return NextResponse.redirect(
                new URL("/profile?tab=connections&error=user_info_failed&provider=twitter_oauth1", env.APP_URL)
            );
        }

        logger.info("Twitter OAuth 1.0a user authenticated", {
            twitterId: twitterUser.data.id,
            username: twitterUser.data.username,
            name: twitterUser.data.name
        });

        // Get user data from database
        const ObjectUserData = await UserService.getUserWithProviders(session.userId!);
        if (!ObjectUserData) {
            logger.error("User not found in database", { userId: session.userId });
            return NextResponse.redirect(
                new URL("/profile?tab=connections&error=user_not_found&provider=twitter_oauth1", env.APP_URL)
            );
        }

        // Update session with Twitter OAuth 1.0a connection 
        const updatedSession: AuthSession = {
            userId: ObjectUserData.id,
            plan: ObjectUserData.plan,
            user: {
                email: ObjectUserData.email,
                username: ObjectUserData.username,
                image: ObjectUserData.image || undefined,
            },
            user_tokens: {
                access_token: session?.user_tokens?.access_token || "",
                refresh_token: session?.user_tokens?.refresh_token,
                expires_at: session?.user_tokens?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            connectedPlatforms: {
                ...session?.connectedPlatforms,
                twitter: {
                    account: {
                        userId: twitterUser.data.id,
                        username: twitterUser.data.username,
                        email: '', // OAuth 1.0a doesn't provide email
                        businesses: [],
                        adAccounts: [],
                        advertisingAccountId: '',
                    },
                    account_tokens: {
                        access_token: accessToken,
                        refresh_token: accessSecret, // OAuth 1.0a uses secret instead of refresh
                        expires_at: null // OAuth 1.0a tokens don't expire
                    } as any
                }
            },
        };

        const returnTo = twitterOAuth1.returnTo || "/profile?tab=connections";
        const successUrl = new URL(returnTo, env.APP_URL);
        successUrl.searchParams.set("success", "twitter_oauth1_connected");
        successUrl.searchParams.set("provider", "twitter");
        successUrl.searchParams.set("username", twitterUser.data.username);

        logger.info("Twitter OAuth 1.0a connection successful", {
            userId: session.userId,
            twitterUsername: twitterUser.data.username,
            redirectTo: successUrl.pathname
        });

        const response = NextResponse.redirect(successUrl);
        const responseWithSession = await ServerSessionService.setSession(request, updatedSession, response);
        return addSecurityHeaders(responseWithSession);

    } catch (error) {
        logger.error("Twitter OAuth 1.0a callback failed", { error });
        return NextResponse.redirect(
            new URL("/profile?tab=connections&error=oauth_failed&provider=twitter_oauth1", env.APP_URL)
        );
    }
}

export const GET = withErrorHandling(handler);