// Helper Functions for Twitter Route
import { NextRequest } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { prisma } from "@/config/database/prisma";
import {
    TwitterOAuth1Credentials,
    validateOAuth1Credentials,
    twitterV1MediaRequest
} from "@/utils/twitter-oauth";
import { env } from "@/validations/env";
import { canPostToTwitter } from "@/utils/twitter-config";

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
            accessTokenSecret: '', // OAuth 2.0 doesn't use access token secrets
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
        // Check if we can post to Twitter with the current configuration
        const hasMedia = media && media.length > 0;
        const postingCapability = canPostToTwitter(hasMedia);

        if (!postingCapability.canPost) {
            return {
                status: "failed",
                error: postingCapability.reason || "Twitter posting is not available with current configuration",
                success: false
            };
        }

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
            console.log(`Attempting to upload ${media.length} media files to Twitter`);

            // For OAuth 1.0a media upload, we need proper access token and secret
            // Since we don't have user-specific OAuth 1.0a tokens, we'll use app-level credentials
            if (!env.TWITTER_API_KEY || !env.TWITTER_API_SECRET) {
                return {
                    status: "failed",
                    error: "Twitter media upload requires OAuth 1.0a app credentials. Please configure TWITTER_API_KEY and TWITTER_API_SECRET environment variables.",
                    success: false
                };
            }

            // For now, we'll try to use the OAuth 2.0 access token with OAuth 1.0a credentials
            // This is a hybrid approach that might work for some endpoints
            const oauth1Credentials: TwitterOAuth1Credentials = {
                consumerKey: env.TWITTER_API_KEY,
                consumerSecret: env.TWITTER_API_SECRET,
                accessToken: accessToken, // User's OAuth 2.0 access token
                accessTokenSecret: accessTokenSecret || '' // Will be empty for OAuth 2.0 users
            };

            console.log('Using OAuth 1.0a credentials for media upload:', {
                hasConsumerKey: !!oauth1Credentials.consumerKey,
                hasConsumerSecret: !!oauth1Credentials.consumerSecret,
                hasAccessToken: !!oauth1Credentials.accessToken,
                hasAccessTokenSecret: !!oauth1Credentials.accessTokenSecret
            });

            try {
                // Upload media and get media IDs from Twitter
                const mediaIds = await uploadMediaToTwitter(media, oauth1Credentials);

                // Check if media upload was successful
                if (!mediaIds || mediaIds.length === 0) {
                    console.error('No media IDs returned from upload');
                    return {
                        status: "failed",
                        error: "Failed to upload media to Twitter. Please check your media files and try again.",
                        success: false
                    };
                }

                if (mediaIds.length !== media.length) {
                    console.warn(`Only ${mediaIds.length} out of ${media.length} media files were uploaded successfully`);
                }

                // Add media IDs to the request
                if (mediaIds.length > 0) {
                    requestData.media = {
                        media_ids: mediaIds
                    };
                    console.log(`Added ${mediaIds.length} media IDs to tweet request:`, mediaIds);
                }
            } catch (error) {
                console.error('Error uploading media to Twitter:', error);
                return {
                    status: "failed",
                    error: `Failed to upload media to Twitter: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    success: false
                };
            }
        }        // Make POST request to Twitter API v2
        console.log('Sending tweet to Twitter API v2:', {
            text: requestData.text,
            hasMedia: !!requestData.media,
            mediaCount: requestData.media?.media_ids?.length || 0
        });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        console.log('Twitter API response:', {
            ok: response.ok,
            status: response.status,
            hasData: !!result.data,
            errors: result.errors
        });

        if (response.ok && result.data && result.data.id) {
            const tweetId = result.data.id;
            const username = await getUsernameFromToken(accessToken);

            console.log(`Tweet posted successfully: ${tweetId}`);

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
            let errorMessage = "Unknown Twitter API error";

            if (result.errors && result.errors.length > 0) {
                errorMessage = result.errors.map((err: any) => err.message || err.detail).join(', ');
            } else if (result.error) {
                errorMessage = result.error;
            } else if (!response.ok) {
                errorMessage = `Twitter API returned status ${response.status}`;
            }

            console.error('Twitter API error:', {
                status: response.status,
                errors: result.errors,
                error: result.error
            });

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
 * Uses proper OAuth 1.0a authentication for v1.1 media upload endpoint
 */
export async function uploadMediaToTwitter(media: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    mimeType?: string;
    alt?: string;
}>, credentials: TwitterOAuth1Credentials) {
    const mediaIds = [];

    try {
        for (const mediaItem of media) {
            console.log(`Uploading media to Twitter: ${mediaItem.id} (${mediaItem.type})`);

            // Step 1: Fetch the media content
            const mediaResponse = await fetch(mediaItem.url);
            if (!mediaResponse.ok) {
                console.error(`Failed to fetch media from URL: ${mediaItem.url}`);
                continue;
            }

            const mediaBuffer = await mediaResponse.arrayBuffer();
            const mediaBytes = new Uint8Array(mediaBuffer);

            console.log(`Media fetched: ${mediaBytes.length} bytes, type: ${mediaItem.mimeType}`);

            // Use simple upload for images (works better than chunked for most cases)
            if (mediaItem.type === 'image') {
                const mediaId = await uploadImageToTwitterSimple(mediaBytes, mediaItem.mimeType!, credentials);
                if (mediaId) {
                    // Add alt text if provided
                    if (mediaItem.alt) {
                        await addAltTextToMedia(mediaId, mediaItem.alt, credentials);
                    }
                    mediaIds.push(mediaId);
                }
            } else if (mediaItem.type === 'video') {
                // Use chunked upload for videos
                const mediaId = await uploadVideoToTwitterChunked(mediaBytes, mediaItem.mimeType!, credentials);
                if (mediaId) {
                    // Add alt text if provided
                    if (mediaItem.alt) {
                        await addAltTextToMedia(mediaId, mediaItem.alt, credentials);
                    }
                    mediaIds.push(mediaId);
                }
            }
        }

        console.log(`Successfully uploaded ${mediaIds.length} media files to Twitter`);
        return mediaIds;
    } catch (error) {
        console.error('Error uploading media to Twitter:', error);
        return [];
    }
}

/**
 * Simple upload for images using Twitter API v1.1
 */
async function uploadImageToTwitterSimple(
    mediaBytes: Uint8Array,
    mimeType: string,
    credentials: TwitterOAuth1Credentials
): Promise<string | null> {
    try {
        const formData = new FormData();
        const blob = new Blob([Buffer.from(mediaBytes)], { type: mimeType });
        formData.append('media', blob);

        // Use OAuth 1.0a authenticated request for v1.1 media upload
        const response = await twitterV1MediaRequest(
            'https://upload.twitter.com/1.1/media/upload.json',
            credentials,
            formData
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Twitter image upload failed:', response.status, errorText);
            return null;
        }

        const result = await response.json();
        console.log('Twitter image upload success:', result.media_id_string);
        return result.media_id_string;
    } catch (error) {
        console.error('Error in simple image upload:', error);
        return null;
    }
}

/**
 * Chunked upload for videos using Twitter API v1.1
 */
async function uploadVideoToTwitterChunked(
    mediaBytes: Uint8Array,
    mimeType: string,
    credentials: TwitterOAuth1Credentials
): Promise<string | null> {
    const uploadEndpoint = "https://upload.twitter.com/1.1/media/upload.json";

    try {
        // Step 1: INIT the upload
        const initParams = new URLSearchParams({
            command: 'INIT',
            total_bytes: mediaBytes.length.toString(),
            media_type: mimeType,
            media_category: 'tweet_video'
        });

        const initResponse = await twitterV1MediaRequest(
            `${uploadEndpoint}?${initParams}`,
            credentials
        );

        if (!initResponse.ok) {
            const errorText = await initResponse.text();
            console.error('Twitter video INIT failed:', initResponse.status, errorText);
            return null;
        }

        const initData = await initResponse.json();
        const mediaId = initData.media_id_string;
        console.log('Twitter video INIT success:', mediaId);

        // Step 2: APPEND the media data in chunks
        const chunkSize = 5 * 1024 * 1024; // 5MB chunks
        let segmentIndex = 0;

        for (let i = 0; i < mediaBytes.length; i += chunkSize) {
            const chunk = mediaBytes.slice(i, Math.min(i + chunkSize, mediaBytes.length));

            const formData = new FormData();
            formData.append('command', 'APPEND');
            formData.append('media_id', mediaId);
            formData.append('segment_index', segmentIndex.toString());
            const chunkBlob = new Blob([Buffer.from(chunk)], { type: mimeType });
            formData.append('media', chunkBlob);

            const appendResponse = await twitterV1MediaRequest(uploadEndpoint, credentials, formData);

            if (!appendResponse.ok) {
                const errorText = await appendResponse.text();
                console.error(`Twitter video APPEND failed for segment ${segmentIndex}:`, appendResponse.status, errorText);
                return null;
            }

            segmentIndex++;
        }

        console.log(`Twitter video APPEND completed: ${segmentIndex} segments`);

        // Step 3: FINALIZE the upload
        const finalizeParams = new URLSearchParams({
            command: 'FINALIZE',
            media_id: mediaId
        });

        const finalizeResponse = await twitterV1MediaRequest(
            `${uploadEndpoint}?${finalizeParams}`,
            credentials
        );

        if (!finalizeResponse.ok) {
            const errorText = await finalizeResponse.text();
            console.error('Twitter video FINALIZE failed:', finalizeResponse.status, errorText);
            return null;
        }

        const finalizeData = await finalizeResponse.json();
        console.log('Twitter video FINALIZE success:', finalizeData.media_id_string);

        // Step 4: Check processing status for videos
        if (finalizeData.processing_info) {
            const processedMediaId = await waitForVideoProcessing(mediaId, credentials);
            return processedMediaId;
        }

        return finalizeData.media_id_string;
    } catch (error) {
        console.error('Error in chunked video upload:', error);
        return null;
    }
}

/**
 * Wait for video processing to complete
 */
async function waitForVideoProcessing(
    mediaId: string,
    credentials: TwitterOAuth1Credentials,
    maxAttempts: number = 10
): Promise<string | null> {
    const { accessToken } = credentials;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const statusParams = new URLSearchParams({
                command: 'STATUS',
                media_id: mediaId
            });

            const statusResponse = await twitterV1MediaRequest(
                `https://upload.twitter.com/1.1/media/upload.json?${statusParams}`,
                credentials
            );

            if (!statusResponse.ok) {
                console.error('Failed to check video processing status');
                return null;
            }

            const statusData = await statusResponse.json();

            if (statusData.processing_info) {
                const state = statusData.processing_info.state;

                if (state === 'succeeded') {
                    console.log('Video processing completed successfully');
                    return mediaId;
                } else if (state === 'failed') {
                    console.error('Video processing failed');
                    return null;
                } else if (state === 'in_progress') {
                    // Wait before checking again
                    const checkAfter = statusData.processing_info.check_after_secs || 5;
                    console.log(`Video processing in progress, checking again in ${checkAfter} seconds`);
                    await new Promise(resolve => setTimeout(resolve, checkAfter * 1000));
                    continue;
                }
            } else {
                // No processing info means it's ready
                return mediaId;
            }
        } catch (error) {
            console.error('Error checking video processing status:', error);
            return null;
        }
    }

    console.error('Video processing timed out');
    return null;
}

/**
 * Add alt text to uploaded media
 */
async function addAltTextToMedia(
    mediaId: string,
    altText: string,
    credentials: TwitterOAuth1Credentials
): Promise<void> {
    try {
        const response = await twitterV1MediaRequest(
            'https://api.twitter.com/1.1/media/metadata/create.json',
            credentials,
            new URLSearchParams({
                media_id: mediaId,
                alt_text: JSON.stringify({ text: altText })
            })
        );

        if (!response.ok) {
            console.error('Failed to add alt text to media');
        } else {
            console.log('Alt text added successfully');
        }
    } catch (error) {
        console.error('Error adding alt text:', error);
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
