// Helper Functions for Twitter Route
import { NextRequest } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { prisma } from "@/config/database/prisma";

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
        if (!session?.userId || !session.connectedPlatforms?.twitter) {
            return null;
        }

        const twitterData = session.connectedPlatforms.twitter;

        // Check if Twitter connection exists and is still valid
        if (!twitterData.account_tokens.access_token ||
            new Date(twitterData.account_tokens.expires_at) <= new Date()) {
            return null;
        }

        // Get userId from connected account
        const userId = twitterData.account.userId;

        return {
            accessToken: twitterData.account_tokens.access_token,
            accessTokenSecret: twitterData.account_tokens.refresh_token || '', // Twitter often uses refresh_token as secret
            userId: userId,
            username: twitterData.account.username,
            connected: true,
            expiresAt: new Date(twitterData.account_tokens.expires_at)
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

        return !!authProvider;
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
        // Format content for Twitter API v2
        const tweetContent = formatTweetContent(content);

        // Twitter API v2 endpoint for creating tweets
        const endpoint = "https://api.twitter.com/2/tweets";
        const bearerToken = accessToken; // OAuth 2.0 tokens typically used as Bearer

        // Prepare request data
        let requestData: any = {
            text: tweetContent
        };

        // Handle media if present
        if (media && media.length > 0) {
            // Upload media and get media IDs from Twitter
            const mediaIds = await uploadMediaToTwitter(media, {
                accessToken,
                accessTokenSecret
            });

            // Add media IDs to the request
            if (mediaIds && mediaIds.length > 0) {
                requestData.media = {
                    media_ids: mediaIds
                };
            }
        }

        // Make POST request to Twitter API v2
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (response.ok && result.data && result.data.id) {
            const tweetId = result.data.id;
            const username = await getUsernameFromToken(accessToken);

            return {
                platformPostId: tweetId,
                status: "published",
                publishedAt: new Date().toISOString(),
                url: `https://twitter.com/${username}/status/${tweetId}`,
                type: media && media.length > 0 ? "media_tweet" : "text_tweet",
                success: true
            };
        } else {
            // Handle Twitter API error
            const errorMessage = result.errors && result.errors.length > 0
                ? result.errors[0].message
                : "Unknown Twitter API error";

            return {
                status: "failed",
                error: errorMessage,
                success: false
            };
        }
    } catch (error) {
        console.error("Twitter API error:", error);
        return {
            status: "failed",
            error: `Twitter API error: ${error instanceof Error ? error.message : String(error)}`,
            success: false
        };
    }
}

/**
 * Format content for Twitter
 * Ensures content meets Twitter's requirements
 */
export function formatTweetContent(content: string): string {
    // Limit to 280 characters if needed
    if (content.length > 280) {
        return content.substring(0, 277) + '...';
    }

    return content;
}

/**
 * Retrieve username from Twitter API using the access token
 */
export async function getUsernameFromToken(accessToken: string): Promise<string> {
    try {
        // Twitter API v2 endpoint for getting user information
        const endpoint = 'https://api.twitter.com/2/users/me';

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const userData = await response.json();

        if (userData.data && userData.data.username) {
            return userData.data.username;
        }

        // Default fallback
        return 'user';
    } catch (error) {
        console.error('Error getting Twitter username:', error);
        return 'user';
    }
}

/**
 * Upload media to Twitter before tweeting
 */
export async function uploadMediaToTwitter(media: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    mimeType?: string;
    alt?: string;
}>, credentials: { accessToken: string, accessTokenSecret: string }) {
    // Twitter API v1.1 endpoint for media uploads
    const uploadEndpoint = "https://upload.twitter.com/1.1/media/upload.json";
    const { accessToken } = credentials;

    const mediaIds = [];

    try {
        for (const mediaItem of media) {
            // Step 1: Fetch the media content
            const mediaResponse = await fetch(mediaItem.url);
            const mediaBuffer = await mediaResponse.arrayBuffer();

            // Step 2: INIT the upload
            const initResponse = await fetch(`${uploadEndpoint}?command=INIT&total_bytes=${mediaBuffer.byteLength}&media_type=${mediaItem.mimeType}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const initData = await initResponse.json();

            if (!initResponse.ok || !initData.media_id_string) {
                throw new Error('Failed to initialize media upload');
            }

            const mediaId = initData.media_id_string;

            // Step 3: APPEND the media data
            // In a real implementation, large media would be split into chunks
            // For simplicity, we'll assume smaller media files
            const appendResponse = await fetch(`${uploadEndpoint}?command=APPEND&media_id=${mediaId}&segment_index=0`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'multipart/form-data'
                },
                body: mediaBuffer
            });

            if (!appendResponse.ok) {
                throw new Error('Failed to append media data');
            }

            // Step 4: FINALIZE the upload
            const finalizeResponse = await fetch(`${uploadEndpoint}?command=FINALIZE&media_id=${mediaId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const finalizeData = await finalizeResponse.json();

            if (!finalizeResponse.ok || !finalizeData.media_id_string) {
                throw new Error('Failed to finalize media upload');
            }

            // Step 5: Add alt text if provided (accessibility)
            if (mediaItem.alt) {
                await fetch(`https://api.twitter.com/1.1/media/metadata/create.json`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        media_id: mediaId,
                        alt_text: { text: mediaItem.alt }
                    })
                });
            }

            mediaIds.push(mediaId);
        }

        return mediaIds;
    } catch (error) {
        console.error('Error uploading media to Twitter:', error);
        return [];
    }
}

export async function logPostActivity(userId: string, tweetId: string): Promise<void> {
    try {
        // In a production app, you would log this activity to the database
        console.log(`[${new Date().toISOString()}] User ${userId} posted to Twitter: ${tweetId}`);

        // Example of what real logging might look like:
        /*
        await prisma.postActivity.create({
            data: {
                userId,
                postId: tweetId,
                platform: 'twitter',
                activityType: 'tweet_created',
                timestamp: new Date()
            }
        });
        */
    } catch (error) {
        console.error('Error logging Twitter post activity:', error);
    }
}
