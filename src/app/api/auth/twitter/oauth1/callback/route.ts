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

        // Determine which userId to use
        const effectiveUserId = twitterOAuth1.fromUnified && twitterOAuth1.userId ? twitterOAuth1.userId : session.userId!;

        // Get user data from database
        const ObjectUserData = await UserService.getUserWithProviders(effectiveUserId);
        if (!ObjectUserData) {
            logger.error("User not found in database", { userId: effectiveUserId });
            return NextResponse.redirect(
                new URL("/profile?tab=connections&error=user_not_found&provider=twitter_oauth1", env.APP_URL)
            );
        }

        // For unified flow, we only want to add the accessTokenSecret to existing OAuth 2.0 tokens
        if (twitterOAuth1.fromUnified && twitterOAuth1.providerId) {
            logger.info("Unified flow: Adding OAuth 1.0a tokens to existing OAuth 2.0 connection", {
                userId: effectiveUserId,
                providerId: twitterOAuth1.providerId
            });

            // Find existing Twitter auth provider
            const existingProvider = await UserService.findAuthProvider(effectiveUserId, "twitter", twitterOAuth1.providerId);

            if (existingProvider) {
                // Update only the accessTokenSecret field, preserving OAuth 2.0 tokens
                await UserService.updateAuthProviderSecret(existingProvider.id, {
                    accessTokenSecret: accessSecret,
                });

                logger.info("Twitter OAuth 1.0a tokens added to existing connection", {
                    userId: effectiveUserId,
                    providerId: twitterOAuth1.providerId,
                    hasAccessToken: !!existingProvider.accessToken,
                    hasAccessSecret: !!accessSecret,
                    hasRefreshToken: !!existingProvider.refreshToken
                });

                // Redirect with unified success message
                const successUrl = new URL(twitterOAuth1.returnTo, env.APP_URL);
                successUrl.searchParams.set("success", "twitter_full_access");
                successUrl.searchParams.set("provider", "twitter");
                successUrl.searchParams.set("username", twitterUser.data.username);

                const response = NextResponse.redirect(successUrl);
                return addSecurityHeaders(response);
            } else {
                logger.warn("Existing Twitter provider not found for unified flow", {
                    userId: effectiveUserId,
                    providerId: twitterOAuth1.providerId
                });
                // Fall through to create new provider
            }
        }

        // Store OAuth 1.0a tokens in database (standalone or fallback)
        await UserService.upsertAuthProvider(ObjectUserData.id, {
            provider: "twitter",
            providerId: twitterUser.data.id,
            username: twitterUser.data.username,
            displayName: twitterUser.data.name || twitterUser.data.username,
            profileImage: twitterUser.data.profile_image_url || "",
            name: twitterUser.data.name || twitterUser.data.username,
            followersCount: twitterUser.data.public_metrics?.followers_count || 0,
            mediaCount: twitterUser.data.public_metrics?.tweet_count || 0,
            canAccessInsights: true,
            canPublishContent: true,
            canManageAds: false,
            analyticsSummary: JSON.stringify({
                followers: twitterUser.data.public_metrics?.followers_count || 0,
                following: twitterUser.data.public_metrics?.following_count || 0,
                tweets: twitterUser.data.public_metrics?.tweet_count || 0,
                verified: twitterUser.data.verified || false,
            }),
            accessToken: accessToken,
            accessTokenSecret: accessSecret, // OAuth 1.0a access token secret
            refreshToken: undefined, // OAuth 1.0a doesn't use refresh tokens
            expiresAt: undefined, // OAuth 1.0a tokens don't expire
            scopes: undefined, // OAuth 1.0a doesn't use scopes in the same way
        });

        logger.info("Twitter OAuth 1.0a tokens stored in database", {
            userId: effectiveUserId,
            twitterUsername: twitterUser.data.username,
            hasAccessToken: !!accessToken,
            hasAccessSecret: !!accessSecret,
            isUnifiedFlow: twitterOAuth1.fromUnified
        });

        const finalReturnTo = twitterOAuth1?.returnTo || "/profile?tab=connections";
        const successUrl = new URL(finalReturnTo, env.APP_URL);
        successUrl.searchParams.set("success", twitterOAuth1.fromUnified ? "twitter_full_access" : "twitter_oauth1_connected");
        successUrl.searchParams.set("provider", "twitter");
        successUrl.searchParams.set("username", twitterUser.data.username);

        logger.info("Twitter OAuth 1.0a connection successful", {
            userId: effectiveUserId,
            twitterUsername: twitterUser.data.username,
            redirectTo: successUrl.pathname,
            isUnifiedFlow: twitterOAuth1.fromUnified
        });

        const response = NextResponse.redirect(successUrl);
        return addSecurityHeaders(response);

    } catch (error) {
        logger.error("Twitter OAuth 1.0a callback failed", { error });
        return NextResponse.redirect(
            new URL("/profile?tab=connections&error=oauth_failed&provider=twitter_oauth1", env.APP_URL)
        );
    }
}

export const GET = withErrorHandling(handler);