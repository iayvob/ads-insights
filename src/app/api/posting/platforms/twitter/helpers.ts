// Helper Functions for Twitter Route - Following the documentation exactly
import { NextRequest } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { prisma } from "@/config/database/prisma";
import { getTwitterUserClient, getTwitterV2Client } from "@/lib/twitter";

// Twitter media upload constants
const TWITTER_IMAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB for images
const TWITTER_GIF_SIZE_LIMIT = 15 * 1024 * 1024; // 15MB for GIFs  
const TWITTER_VIDEO_SIZE_LIMIT = 512 * 1024 * 1024; // 512MB for videos
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for chunked upload

interface TwitterMediaProcessingInfo {
    state: 'pending' | 'in_progress' | 'failed' | 'succeeded';
    check_after_secs?: number;
    progress_percent?: number;
    error?: {
        code: number;
        name: string;
        message: string;
    };
}

interface TwitterMediaUploadResponse {
    media_id: number;
    media_id_string: string;
    expires_after_secs?: number;
    processing_info?: TwitterMediaProcessingInfo;
}

export interface TwitterConnection {
    accessToken: string;
    accessTokenSecret?: string; // Optional for OAuth 2.0 Bearer tokens
    userId: string;
    username: string;
    connected: boolean;
    expiresAt?: Date;
    authType: 'oauth1' | 'oauth2'; // Track authentication type
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

        // Determine if this is OAuth 1.0a or OAuth 2.0 based on refreshToken presence
        const isOAuth1 = !!authProvider.refreshToken;
        const accessTokenSecret = isOAuth1 ? authProvider.refreshToken || undefined : undefined;

        return {
            accessToken: authProvider.accessToken,
            accessTokenSecret: accessTokenSecret,
            userId: authProvider.providerId || '',
            username: authProvider.username || '',
            connected: true,
            expiresAt: authProvider.expiresAt || undefined,
            authType: isOAuth1 ? 'oauth1' : 'oauth2'
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

/**
 * Check if media should use chunked upload based on type and size
 */
function shouldUseChunkedUpload(mediaType: string, fileSize: number): boolean {
    // Always use chunked upload for videos
    if (mediaType.startsWith('video/')) {
        return true;
    }
    
    // Use chunked upload for large images/GIFs
    if (mediaType.includes('gif') && fileSize > TWITTER_GIF_SIZE_LIMIT / 2) {
        return true;
    }
    
    if (fileSize > TWITTER_IMAGE_SIZE_LIMIT / 2) {
        return true;
    }
    
    return false;
}

/**
 * Upload media using chunked upload (INIT -> APPEND -> FINALIZE -> STATUS)
 */
async function uploadMediaChunked(
    client: any, 
    buffer: Buffer, 
    mimeType: string,
    mediaType: 'image' | 'video'
): Promise<string> {
    const totalBytes = buffer.length;
    
    // Step 1: Initialize upload
    console.log(`Initializing chunked upload for ${mediaType}, size: ${totalBytes} bytes`);
    
    const initResponse = await client.v1.uploadMedia(undefined, {
        command: 'INIT',
        total_bytes: totalBytes,
        media_type: mimeType,
        media_category: mediaType === 'video' ? 'tweet_video' : 'tweet_image'
    });
    
    const mediaId = initResponse.media_id_string;
    console.log(`Initialized upload with media_id: ${mediaId}`);
    
    // Step 2: Upload chunks
    const chunkCount = Math.ceil(totalBytes / CHUNK_SIZE);
    
    for (let i = 0; i < chunkCount; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalBytes);
        const chunk = buffer.slice(start, end);
        
        console.log(`Uploading chunk ${i + 1}/${chunkCount}, bytes ${start}-${end}`);
        
        await client.v1.uploadMedia(chunk, {
            command: 'APPEND',
            media_id: mediaId,
            segment_index: i
        });
    }
    
    // Step 3: Finalize upload
    console.log(`Finalizing upload for media_id: ${mediaId}`);
    
    const finalizeResponse = await client.v1.uploadMedia(undefined, {
        command: 'FINALIZE',
        media_id: mediaId
    });
    
    // Step 4: Check processing status if needed
    if (finalizeResponse.processing_info) {
        console.log(`Media requires processing, checking status...`);
        await waitForMediaProcessing(client, mediaId);
    }
    
    return mediaId;
}

/**
 * Check media processing status and wait for completion
 */
async function checkMediaStatus(client: any, mediaId: string): Promise<TwitterMediaProcessingInfo> {
    try {
        const response = await client.v1.get('media/upload.json', {
            command: 'STATUS',
            media_id: mediaId
        });
        
        return response.processing_info || { state: 'succeeded' };
    } catch (error) {
        console.error(`Error checking media status for ${mediaId}:`, error);
        throw error;
    }
}

/**
 * Wait for media processing to complete (similar to Instagram container status checking)
 */
async function waitForMediaProcessing(client: any, mediaId: string, maxAttempts: number = 20): Promise<void> {
    console.log(`Waiting for media processing to complete for media_id: ${mediaId}`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const status = await checkMediaStatus(client, mediaId);
            
            console.log(`Media processing status (attempt ${attempt + 1}): ${status.state}, progress: ${status.progress_percent || 0}%`);
            
            switch (status.state) {
                case 'succeeded':
                    console.log(`Media processing completed successfully for media_id: ${mediaId}`);
                    return;
                    
                case 'failed':
                    const errorMsg = status.error 
                        ? `${status.error.name}: ${status.error.message}` 
                        : 'Unknown processing error';
                    throw new Error(`Media processing failed for media_id ${mediaId}: ${errorMsg}`);
                    
                case 'pending':
                case 'in_progress':
                    // Wait before next check
                    const waitTime = status.check_after_secs || 5;
                    console.log(`Media still processing, waiting ${waitTime} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                    break;
                    
                default:
                    console.warn(`Unknown media processing state: ${status.state}`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } catch (error) {
            console.error(`Error checking media status (attempt ${attempt + 1}):`, error);
            
            if (attempt === maxAttempts - 1) {
                throw new Error(`Media processing status check failed after ${maxAttempts} attempts`);
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    throw new Error(`Media processing did not complete within ${maxAttempts} attempts`);
}

/**
 * Upload single media item with proper method selection
 */
async function uploadSingleMedia(
    client: any,
    mediaItem: { url: string; type: 'image' | 'video'; mimeType?: string; alt?: string; id: string }
): Promise<string | null> {
    try {
        // Fetch media content from URL
        const mediaResponse = await fetch(mediaItem.url);
        if (!mediaResponse.ok) {
            console.error(`Failed to fetch media from URL: ${mediaItem.url}`);
            return null;
        }

        // Convert to buffer for upload
        const mediaBuffer = await mediaResponse.arrayBuffer();
        const buffer = Buffer.from(mediaBuffer);
        const fileSize = buffer.length;
        const mimeType = mediaItem.mimeType || 'image/jpeg';

        console.log(`Processing ${mediaItem.type} upload: ${fileSize} bytes, type: ${mimeType}`);

        // Validate file size limits
        if (mediaItem.type === 'video' && fileSize > TWITTER_VIDEO_SIZE_LIMIT) {
            throw new Error(`Video file too large: ${fileSize} bytes (max: ${TWITTER_VIDEO_SIZE_LIMIT})`);
        }
        if (mediaItem.type === 'image' && fileSize > TWITTER_IMAGE_SIZE_LIMIT) {
            throw new Error(`Image file too large: ${fileSize} bytes (max: ${TWITTER_IMAGE_SIZE_LIMIT})`);
        }

        let mediaId: string;

        // Choose upload method based on type and size
        if (shouldUseChunkedUpload(mimeType, fileSize)) {
            console.log(`Using chunked upload for ${mediaItem.type}`);
            mediaId = await uploadMediaChunked(client, buffer, mimeType, mediaItem.type);
        } else {
            console.log(`Using simple upload for ${mediaItem.type}`);
            // Use simple upload for small images
            mediaId = await client.v1.uploadMedia(buffer, { 
                mimeType: mimeType,
                target: 'tweet'
            });
        }

        // Add alt text if provided
        if (mediaItem.alt && mediaId) {
            try {
                await client.v1.createMediaMetadata(mediaId, { 
                    alt_text: { text: mediaItem.alt } 
                });
                console.log(`Added alt text for media_id: ${mediaId}`);
            } catch (altError) {
                console.warn('Failed to add alt text:', altError);
            }
        }

        console.log(`Successfully uploaded media: ${mediaId}`);
        return mediaId;
        
    } catch (error) {
        console.error(`Failed to upload media ${mediaItem.id}:`, error);
        throw error;
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
    accessTokenSecret?: string;
    userId: string;
    authType: 'oauth1' | 'oauth2';
}) {
    const { content, media, accessToken, accessTokenSecret, authType } = params;

    try {
        let client;
        
        // Create appropriate client based on auth type
        if (authType === 'oauth2') {
            // Use OAuth 2.0 Bearer token for v2 API
            client = getTwitterV2Client(accessToken);
        } else {
            // Use OAuth 1.0a for legacy support
            client = getTwitterUserClient(accessToken, accessTokenSecret);
        }

        let mediaIds: string[] = [];

        // Upload media if present using enhanced upload flow
        if (media && media.length > 0) {
            console.log(`Uploading ${media.length} media files to Twitter using enhanced upload flow`);

            for (const mediaItem of media) {
                try {
                    const mediaId = await uploadSingleMedia(client, mediaItem);
                    if (mediaId) {
                        mediaIds.push(mediaId);
                    }
                } catch (uploadError) {
                    console.error(`Failed to upload media ${mediaItem.id}:`, uploadError);
                    // Continue with other media files
                }
            }

            console.log(`Successfully uploaded ${mediaIds.length} out of ${media.length} media files`);
        }

        // Post tweet using v2 API with proper format
        const tweetData: any = {
            text: content,
        };

        // Add media IDs if any were uploaded
        if (mediaIds.length > 0) {
            tweetData.media = { media_ids: mediaIds };
        }

        console.log('Posting tweet with options:', {
            hasText: !!tweetData.text,
            textLength: tweetData.text?.length || 0,
            mediaCount: mediaIds.length
        });

        // Use v2 API for posting
        const tweet = await client.v2.tweet(tweetData);

        if (tweet.data) {
            const tweetId = tweet.data.id;
            console.log(`Tweet posted successfully: ${tweetId}`);

            // Get username for URL construction
            const username = await getUsernameFromClient(client);

            return {
                platformPostId: tweetId,
                status: "published",
                publishedAt: new Date().toISOString(),
                url: `https://x.com/${username}/status/${tweetId}`,
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
                case 403:
                    errorMessage = "Twitter API access forbidden - check your app permissions and authentication";
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
}/**
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
