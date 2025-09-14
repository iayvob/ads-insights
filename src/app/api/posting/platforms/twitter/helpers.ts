// Helper Functions for Twitter Route - Following the documentation exactly
import { NextRequest } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { prisma } from "@/config/database/prisma";
import { getTwitterUserClient } from "@/lib/twitter";

export interface TwitterConnection {
    accessToken: string;
    accessTokenSecret: string;
    userId: string;
    username: string;
    connected: boolean;
    expiresAt?: Date;
}

export async function getTwitterConnection(request: NextRequest): Promise<TwitterConnection | null> {
    try {
        const session = await ServerSessionService.getSession(request);
        if (!session?.userId) {
            return null;
        }

        // Get Twitter auth provider from database
        const authProvider = await prisma.authProvider.findFirst({
            where: {
                userId: session.userId,
                provider: 'twitter'
            }
        });

        if (!authProvider || !authProvider.accessToken) {
            return null;
        }

        // Check if token is expired (if expiresAt is set)
        if (authProvider.expiresAt && new Date(authProvider.expiresAt) <= new Date()) {
            return null;
        }

        // For Twitter posting, we'll need to use OAuth 1.0a app credentials
        // The user's OAuth 2.0 token is stored, but posting requires OAuth 1.0a
        // We'll get the access token secret from the user's session or generate it
        const accessTokenSecret = authProvider.refreshToken || ''; // Use refreshToken field for OAuth 1.0a secret

        return {
            accessToken: authProvider.accessToken,
            accessTokenSecret: accessTokenSecret,
            userId: authProvider.providerId || '',
            username: authProvider.username || '',
            connected: true,
            expiresAt: authProvider.expiresAt || undefined
        };
    } catch (error) {
        console.error("Error fetching Twitter connection:", error);
        return null;
    }
}

export async function validateTwitterAccess(userId: string): Promise<boolean> {
    try {
        // Check if user has Twitter provider saved in the database
        const authProvider = await prisma.authProvider.findFirst({
            where: {
                userId,
                provider: 'twitter'
            }
        });

        return !!authProvider && !!authProvider.accessToken;
    } catch (error) {
        console.error('Error validating Twitter access:', error);
        return false;
    }
}

export async function postToTwitter(params: {
    content: string;
    media?: Array<{
        id: string;
        url: string;
        type: 'image' | 'video';
        mimeType?: string;
        alt?: string;
    }>;
    accessToken: string;
    accessTokenSecret: string;
    userId: string;
}) {
    const { content, media, accessToken, accessTokenSecret } = params;

    try {
        // Create Twitter client with user tokens
        const client = getTwitterUserClient(accessToken, accessTokenSecret);

        let mediaIds: string[] = [];

        // Upload media if present
        if (media && media.length > 0) {
            console.log(`Uploading ${media.length} media files to Twitter`);

            for (const mediaItem of media) {
                try {
                    // Fetch media content from URL
                    const mediaResponse = await fetch(mediaItem.url);
                    if (!mediaResponse.ok) {
                        console.error(`Failed to fetch media from URL: ${mediaItem.url}`);
                        continue;
                    }

                    // Convert to base64 as required by the documentation
                    const mediaBuffer = await mediaResponse.arrayBuffer();
                    const base64Data = Buffer.from(mediaBuffer).toString('base64');

                    // Determine media type for Twitter API
                    let mediaType: 'png' | 'jpg' | 'gif' | 'mp4' = 'png';
                    if (mediaItem.mimeType) {
                        if (mediaItem.mimeType.includes('jpeg') || mediaItem.mimeType.includes('jpg')) {
                            mediaType = 'jpg';
                        } else if (mediaItem.mimeType.includes('gif')) {
                            mediaType = 'gif';
                        } else if (mediaItem.mimeType.includes('mp4') || mediaItem.mimeType.includes('video')) {
                            mediaType = 'mp4';
                        }
                    }

                    console.log(`Uploading ${mediaItem.type} with type ${mediaType}`);

                    // Upload media using twitter-api-v2
                    const mediaId = await client.v1.uploadMedia(base64Data, {
                        type: mediaType,
                        target: 'tweet'
                    });

                    // Add alt text if provided
                    if (mediaItem.alt && mediaId) {
                        try {
                            await client.v1.createMediaMetadata(mediaId, { alt_text: { text: mediaItem.alt } });
                        } catch (altError) {
                            console.warn('Failed to add alt text:', altError);
                        }
                    }

                    if (mediaId) {
                        mediaIds.push(mediaId);
                        console.log(`Successfully uploaded media: ${mediaId}`);
                    }
                } catch (uploadError) {
                    console.error(`Failed to upload media ${mediaItem.id}:`, uploadError);
                }
            }

            console.log(`Successfully uploaded ${mediaIds.length} out of ${media.length} media files`);
        }

        // Post tweet using twitter-api-v2
        const tweetOptions: any = {
            text: content,
        };

        // Add media IDs if any were uploaded
        if (mediaIds.length > 0) {
            tweetOptions.media = { media_ids: mediaIds };
        }

        console.log('Posting tweet with options:', {
            hasText: !!tweetOptions.text,
            textLength: tweetOptions.text?.length || 0,
            mediaCount: mediaIds.length
        });

        const tweet = await client.v2.tweet(tweetOptions);

        if (tweet.data) {
            const tweetId = tweet.data.id;
            console.log(`Tweet posted successfully: ${tweetId}`);

            // Get username for URL construction
            const username = await getUsernameFromClient(client);

            return {
                platformPostId: tweetId,
                status: "published",
                publishedAt: new Date().toISOString(),
                url: `https://twitter.com/${username}/status/${tweetId}`,
                type: mediaIds.length > 0 ? "media_tweet" : "text_tweet",
                success: true
            };
        } else {
            console.error('Tweet creation failed - no data returned');
            return {
                status: "failed",
                error: "Tweet creation failed - no data returned from Twitter API",
                success: false
            };
        }

    } catch (error: any) {
        console.error("Twitter API error:", error);

        let errorMessage = "Failed to post to Twitter";

        // Handle specific Twitter API errors
        if (error.code) {
            switch (error.code) {
                case 187:
                    errorMessage = "Duplicate tweet - this tweet has already been posted";
                    break;
                case 186:
                    errorMessage = "Tweet is too long (over 280 characters)";
                    break;
                case 32:
                    errorMessage = "Twitter authentication failed - please reconnect your account";
                    break;
                case 89:
                    errorMessage = "Invalid or expired Twitter token - please reconnect your account";
                    break;
                default:
                    errorMessage = `Twitter API error (${error.code}): ${error.message}`;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            status: "failed",
            error: errorMessage,
            success: false
        };
    }
}

/**
 * Get username from Twitter client
 */
async function getUsernameFromClient(client: any): Promise<string> {
    try {
        const user = await client.v2.me();
        return user.data?.username || 'user';
    } catch (error) {
        console.error('Error getting Twitter username:', error);
        return 'user';
    }
}

export async function logPostActivity(userId: string, tweetId: string): Promise<void> {
    try {
        console.log(`[${new Date().toISOString()}] User ${userId} posted to Twitter: ${tweetId}`);

        // You can add database logging here if needed
        // await prisma.postActivity.create({
        //     data: {
        //         userId,
        //         postId: tweetId,
        //         platform: 'twitter',
        //         activityType: 'tweet_created',
        //         timestamp: new Date()
        //     }
        // });
    } catch (error) {
        console.error('Error logging Twitter post activity:', error);
    }
}
