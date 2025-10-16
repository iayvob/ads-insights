// Helper Functions for Twitter Route - Following the documentation exactly
import { NextRequest } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { prisma } from "@/config/database/prisma";
import { getTwitterUserClient, getTwitterV2Client, getTwitterAppClient } from "@/lib/twitter";
import { OAUTH_SCOPES } from "@/config/data/consts";
import { TwitterApi } from 'twitter-api-v2';
import { env } from "@/validations/env";
import { logger } from "@/config/logger";

const TWITTER_API_KEY = env.TWITTER_API_KEY;
const TWITTER_API_SECRET = env.TWITTER_API_SECRET;

// Twitter media upload constants
const TWITTER_IMAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB for images
const TWITTER_GIF_SIZE_LIMIT = 15 * 1024 * 1024; // 15MB for GIFs  
const TWITTER_VIDEO_SIZE_LIMIT = 512 * 1024 * 1024; // 512MB for videos
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for chunked upload

// Twitter API v2 media upload endpoints (replacing v1.1 - target deprecation: March 31, 2025)
const TWITTER_V1_MEDIA_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
const REQUIRED_OAUTH2_SCOPES = ['media.write', 'tweet.write'];

/**
 * Validate if granted scopes meet the requirements for posting operations
 */
function validateTwitterScopes(grantedScopes: string, requireMedia: boolean = false): { valid: boolean; missing: string[] } {
    const granted = grantedScopes.split(' ').filter(scope => scope.trim());
    const required = requireMedia ? REQUIRED_OAUTH2_SCOPES : ['tweet.write'];
    const missing = required.filter(scope => !granted.includes(scope));

    console.log(`🔍 Scope validation - Granted: [${granted.join(', ')}], Required: [${required.join(', ')}]`);

    return {
        valid: missing.length === 0,
        missing
    };
}

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
    accessTokenSecret?: string; // May be needed for media uploads
    userId: string;
    username: string;
    connected: boolean;
    expiresAt?: Date;
    authType?: 'oauth1' | 'oauth2'; // OAuth type for proper client creation
    tokenType?: string; // Additional token type info
}

/**
 * Check if user has OAuth 1.0a connection for media uploads
 */
export function hasTwitterOAuth1Connection(connection: TwitterConnection): boolean {
    // Check if connection has OAuth 1.0a secret (accessTokenSecret)
    return !!connection.accessTokenSecret ||
        connection.tokenType === 'oauth1' ||
        connection.authType === 'oauth1';
}

/**
 * Get OAuth 1.0a client for user with media upload capabilities
 */
export function getTwitterOAuth1Client(connection: TwitterConnection): TwitterApi | null {
    if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !hasTwitterOAuth1Connection(connection)) {
        return null;
    }

    return new TwitterApi({
        appKey: TWITTER_API_KEY,
        appSecret: TWITTER_API_SECRET,
        accessToken: connection.accessToken,
        accessSecret: connection.accessTokenSecret,
    });
}

export async function getTwitterConnection(request: NextRequest): Promise<TwitterConnection | null> {
    try {
        const session = await ServerSessionService.getSession(request);
        if (!session?.userId) {
            return null;
        }

        // Get Twitter auth provider from database
        // Note: userId needs to be treated as ObjectId for MongoDB
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

        // Determine authentication type based on available tokens
        let authType: 'oauth1' | 'oauth2';
        let accessTokenSecret: string | undefined;

        if (authProvider.accessTokenSecret) {
            // OAuth 1.0a available
            authType = 'oauth1';
            accessTokenSecret = authProvider.accessTokenSecret;
            console.log('🔐 Using OAuth 1.0a authentication for X API (media uploads supported)');
        } else {
            // Fallback to OAuth 2.0
            authType = 'oauth2';
            console.log('🔐 Using OAuth 2.0 authentication for X API v2');
        }

        // Debug: Log authentication data
        console.log('🔍 Twitter auth provider data:', {
            hasAccessToken: !!authProvider.accessToken,
            hasAccessTokenSecret: !!authProvider.accessTokenSecret,
            accessTokenLength: authProvider.accessToken?.length,
            accessTokenPreview: authProvider.accessToken?.substring(0, 10) + '...',
            expiresAt: authProvider.expiresAt,
            providerId: authProvider.providerId,
            authType: authType
        });

        return {
            accessToken: authProvider.accessToken,
            accessTokenSecret: accessTokenSecret,
            userId: authProvider.providerId || '',
            username: authProvider.username || '',
            connected: true,
            expiresAt: authProvider.expiresAt || undefined,
            authType: authType
        };
    } catch (error) {
        console.error("Error fetching Twitter connection:", error);

        // Check if it's a Prisma ObjectId error
        if (error instanceof Error && error.message.includes('ObjectID')) {
            console.error('🚫 Database ObjectId error - this usually indicates a data consistency issue');
            console.error('💡 Try reconnecting your Twitter account to resolve the issue');
        }

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
 * Check if OAuth 2.0 token has required scopes for media upload
 * Enhanced to check against the configured OAuth scopes
 */
function hasMediaWriteScope(accessToken: string, grantedScopes?: string): boolean {
    console.log('🔍 Checking OAuth 2.0 scopes for media.write permission...');

    // Check if we have granted scopes information
    if (grantedScopes) {
        const hasMediaWrite = grantedScopes.includes('media.write');
        const hasTweetWrite = grantedScopes.includes('tweet.write');
        console.log(`📋 Granted scopes: ${grantedScopes}`);
        console.log(`📋 Has media.write: ${hasMediaWrite}, Has tweet.write: ${hasTweetWrite}`);
        return hasMediaWrite && hasTweetWrite;
    }

    // Fallback: For OAuth 2.0 Bearer tokens, assume scope based on token characteristics
    // This is a simplified check - in production, you should:
    // 1. Store the granted scopes during OAuth flow in the database
    // 2. Or call Twitter's verify_credentials endpoint to check current scopes
    // 3. Or decode the JWT token if it contains scope information

    const mayHaveMediaScope = accessToken.length > 80;
    console.log(`📋 OAuth 2.0 scope check result (fallback): ${mayHaveMediaScope ? 'may have media.write' : 'unlikely to have media.write'}`);

    return mayHaveMediaScope;
}/**
 * Upload media using Twitter API v1.1 endpoints with OAuth 1.0a
 * This is the reliable method for media uploads as of X API current state
 */
async function uploadMediaV1(
    client: TwitterApi,
    buffer: Buffer,
    mimeType: string,
    mediaType: 'image' | 'video'
): Promise<string> {
    const totalBytes = buffer.length;

    console.log(`🚀 Starting Twitter API v1.1 chunked media upload for ${mediaType}, size: ${totalBytes} bytes`);

    try {
        // Twitter v1.1 media upload endpoint
        const MEDIA_ENDPOINT_URL = 'https://upload.twitter.com/1.1/media/upload.json';

        // For small files, use simple upload
        if (totalBytes <= 5 * 1024 * 1024) { // 5MB limit for simple upload
            console.log('📤 Using simple upload for small file');

            // Use the twitter-api-v2 library's built-in uploadMedia method with Buffer directly
            const result = await client.v1.uploadMedia(buffer, { mimeType });
            console.log('✅ Simple upload success:', result);

            return result;
        }

        // For larger files, use chunked upload
        console.log('📤 Using chunked upload for large file');

        // STEP 1: INIT
        console.log('📡 INIT: Initializing chunked upload');
        const initResult = await client.v1.post('media/upload.json', {
            command: 'INIT',
            media_type: mimeType,
            total_bytes: totalBytes,
            media_category: mediaType === 'video' ? 'tweet_video' : 'tweet_image'
        });

        console.log('✅ INIT success:', initResult);
        const mediaId = initResult.media_id_string;

        // STEP 2: APPEND chunks
        console.log('📡 APPEND: Uploading chunks');
        const chunkSize = 4 * 1024 * 1024; // 4MB chunks
        let segmentIndex = 0;
        let bytesUploaded = 0;

        while (bytesUploaded < buffer.length) {
            const chunk = buffer.slice(bytesUploaded, Math.min(bytesUploaded + chunkSize, buffer.length));

            console.log(`📤 Uploading segment ${segmentIndex}: ${chunk.length} bytes`);

            const appendFormData = new FormData();
            appendFormData.append('command', 'APPEND');
            appendFormData.append('media_id', mediaId);
            appendFormData.append('segment_index', segmentIndex.toString());
            appendFormData.append('media', new Blob([chunk], { type: 'application/octet-stream' }));

            await client.v1.post('media/upload.json', appendFormData);

            bytesUploaded += chunk.length;
            segmentIndex++;
            console.log(`📤 Uploaded ${bytesUploaded} of ${buffer.length} bytes`);
        }

        // STEP 3: FINALIZE
        console.log('📡 FINALIZE: Completing upload');
        const finalizeResult = await client.v1.post('media/upload.json', {
            command: 'FINALIZE',
            media_id: mediaId
        });

        console.log('✅ FINALIZE success:', finalizeResult);

        // STEP 4: Check processing status for videos
        if (mediaType === 'video' && finalizeResult.processing_info) {
            console.log('📹 Video detected - checking processing status');
            await waitForMediaProcessing(client, mediaId);
        }

        console.log(`✅ Twitter API v1.1 media upload completed successfully: ${mediaId}`);
        return mediaId;

    } catch (error) {
        console.error('🚨 Twitter API v1.1 media upload failed:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            mediaType,
            bufferSize: totalBytes,
            mimeType
        });

        logger.error("Twitter media upload failed", {
            error: error instanceof Error ? error.message : String(error),
            mediaType,
            size: totalBytes
        });
        throw error;
    }
}
/**
 * Upload media using X API v2 media upload - Direct upload (not chunked)
 * Following the official X API v2 documentation
 */
async function uploadMediaV2(
    client: any,
    buffer: Buffer,
    mimeType: string,
    mediaType: 'image' | 'video',
    accessToken: string,
    connection?: TwitterConnection
): Promise<string> {
    const totalBytes = buffer.length;

    console.log(`🚀 Starting X API v2 direct media upload for ${mediaType}, size: ${totalBytes} bytes`);

    try {
        // X API v2 direct upload endpoint
        const MEDIA_ENDPOINT_URL = 'https://upload.twitter.com/2/media/upload.json';

        // Convert Buffer to Blob for upload
        const uint8Array = new Uint8Array(buffer);
        const blob = new Blob([uint8Array], { type: mimeType });

        // Create FormData with media file
        const formData = new FormData();
        formData.append('media', blob);

        // Upload media using X API v2 direct upload
        const uploadResponse = await fetch(MEDIA_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'MediaUploadSampleCode'
            },
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('❌ X API v2 media upload failed:', {
                status: uploadResponse.status,
                statusText: uploadResponse.statusText,
                error: errorText,
                url: MEDIA_ENDPOINT_URL,
                authHeader: `Bearer ${accessToken.substring(0, 10)}...`
            });
            throw new Error(`X API v2 media upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log('✅ X API v2 media upload success:', uploadResult);

        const mediaId = uploadResult.media_id_string;
        if (!mediaId) {
            console.error('❌ No media ID in response:', uploadResult);
            throw new Error('No media ID returned from X API v2 upload');
        }

        // For videos, check processing status if processing_info is present
        if (mediaType === 'video' && uploadResult.processing_info) {
            console.log('📹 Video detected - checking processing status');
            await waitForMediaProcessingV2(accessToken, mediaId);
        }

        console.log(`✅ X API v2 media upload completed successfully: ${mediaId}`);
        return mediaId;

    } catch (error) {
        console.error('🚨 X API v2 media upload failed:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            mediaType,
            bufferSize: totalBytes,
            mimeType
        });

        logger.error("X media upload failed", {
            error: error instanceof Error ? error.message : String(error),
            mediaType,
            size: totalBytes
        });
        throw error;
    }
}

/**
 * Wait for media processing to complete using X API v2
 */
async function waitForMediaProcessingV2(accessToken: string, mediaId: string, maxAttempts: number = 20): Promise<void> {
    console.log(`⏳ Waiting for media processing to complete for media_id: ${mediaId}`);

    const MEDIA_ENDPOINT_URL = 'https://upload.twitter.com/2/media/upload.json';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            console.log(`📋 STATUS check ${attempt + 1}/${maxAttempts}`);

            // X API v2 uses GET with media_id query parameter
            const statusUrl = `${MEDIA_ENDPOINT_URL}?media_id=${mediaId}`;

            const statusResponse = await fetch(statusUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'User-Agent': 'MediaUploadSampleCode'
                }
            });

            if (!statusResponse.ok) {
                console.error(`❌ STATUS check failed: ${statusResponse.status} ${statusResponse.statusText}`);
                throw new Error(`STATUS check failed: ${statusResponse.status} ${statusResponse.statusText}`);
            }

            const statusResult = await statusResponse.json();
            const processingInfo = statusResult.processing_info;

            if (!processingInfo) {
                console.log('✅ No processing info - media ready');
                return;
            }

            const state = processingInfo.state;
            console.log(`📊 Media processing status: ${state}`);

            switch (state) {
                case 'succeeded':
                    console.log('✅ Media processing completed successfully');
                    return;

                case 'failed':
                    console.error('❌ Media processing failed');
                    throw new Error('Media processing failed');

                case 'in_progress':
                case 'pending':
                    const checkAfterSecs = processingInfo.check_after_secs || 5;
                    console.log(`⏳ Processing in progress, checking again in ${checkAfterSecs} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, checkAfterSecs * 1000));
                    break;

                default:
                    console.log(`🔄 Unknown processing state: ${state}, waiting 5 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    break;
            }

        } catch (error) {
            console.error(`❌ Error during status check ${attempt + 1}:`, error);
            if (attempt === maxAttempts - 1) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    throw new Error(`Media processing did not complete within ${maxAttempts} attempts`);
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
    mediaItem: { url: string; type: 'image' | 'video'; mimeType?: string; alt?: string; id: string },
    accessToken: string
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

        // Use X API v2 media upload for all media types
        console.log(`Using X API v2 upload for ${mediaItem.type}`);

        // Convert Buffer to Blob for v2 upload
        const uint8Array = new Uint8Array(buffer);
        const blob = new Blob([uint8Array], { type: mimeType });

        // Create FormData
        const formData = new FormData();
        formData.append('media', blob);

        // Upload media using X API v2
        const uploadResponse = await fetch('https://upload.twitter.com/2/media/upload.json', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`X API v2 media upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        mediaId = uploadResult.media_id_string;

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
    request?: NextRequest; // Optional - only needed when called from route handler
}) {
    const { content, media, accessToken, accessTokenSecret, authType, request } = params;

    try {
        // Get Twitter connection data for OAuth 1.0a capability check (only if request is provided)
        let connection: TwitterConnection | null = null;
        if (request) {
            connection = await getTwitterConnection(request);
        }

        // IMPORTANT: Using X API v2 with OAuth 2.0 Bearer tokens for both tweets and media

        let tweetClient;

        // Determine the effective auth type:
        // 1. If we have a connection from request, check for OAuth 1.0a capability
        // 2. Otherwise, use the authType parameter directly (already determined from database)
        const effectiveAuthType = connection
            ? (hasTwitterOAuth1Connection(connection) ? 'oauth1' : authType)
            : authType;

        console.log(`🔐 X API authentication setup - requested authType: ${authType}, effective authType: ${effectiveAuthType}`);
        console.log(`🔍 Connection check - hasOAuth1: ${connection ? hasTwitterOAuth1Connection(connection) : 'Using authType parameter'}`);
        console.log(`🔑 Token availability - accessToken: ${!!accessToken}, accessTokenSecret: ${!!accessTokenSecret}`);

        // Create client based on effective auth type
        if (effectiveAuthType === 'oauth1' && accessTokenSecret) {
            console.log('🔐 Using OAuth 1.0a for X API operations');

            // Validate OAuth 1.0a tokens before proceeding
            const tokensValid = await validateOAuth1Tokens(accessToken, accessTokenSecret);
            if (!tokensValid) {
                console.error('❌ OAuth 1.0a tokens are invalid - cannot proceed with posting');
                return {
                    status: "failed",
                    error: "OAuth 1.0a authentication failed - tokens may be expired or invalid. Please reconnect your Twitter account.",
                    success: false
                };
            }

            tweetClient = new TwitterApi({
                appKey: TWITTER_API_KEY!,
                appSecret: TWITTER_API_SECRET!,
                accessToken: accessToken,
                accessSecret: accessTokenSecret,
            });
        } else {
            console.log('🔐 Using OAuth 2.0 for X API operations');
            tweetClient = new TwitterApi(accessToken);
        }

        let mediaIds: string[] = [];

        // Upload media if present using appropriate authentication
        if (media && media.length > 0) {
            console.log(`📁 Uploading ${media.length} media files to X`);

            // Use OAuth 1.0a client for media uploads if available
            if (effectiveAuthType === 'oauth1' && accessTokenSecret) {
                console.log(`🔐 Using OAuth 1.0a for media uploads (required by X API)`);
                // Use OAuth 1.0a for media uploads
                for (const mediaItem of media) {
                    try {
                        console.log(`Uploading media ${mediaItem.id}: ${mediaItem.type} using OAuth 1.0a`);

                        // Download media from URL
                        const mediaResponse = await fetch(mediaItem.url);
                        if (!mediaResponse.ok) {
                            throw new Error(`Failed to download media from ${mediaItem.url}: ${mediaResponse.status}`);
                        }

                        const buffer = Buffer.from(await mediaResponse.arrayBuffer());
                        const mimeType = mediaResponse.headers.get('content-type') ||
                            (mediaItem.type === 'video' ? 'video/mp4' : 'image/jpeg');

                        console.log(`� Processing ${mediaItem.type} upload: ${buffer.length} bytes, type: ${mimeType}`);

                        // Use v1.1 media upload with OAuth 1.0a
                        const mediaId = await uploadMediaV1(tweetClient as TwitterApi, buffer, mimeType, mediaItem.type as 'image' | 'video');

                        if (mediaId) {
                            mediaIds.push(mediaId);
                            console.log(`✅ Successfully uploaded media ${mediaItem.id} -> ${mediaId} (OAuth 1.0a)`);
                        } else {
                            console.error(`❌ Failed to upload media ${mediaItem.id}`);
                        }
                    } catch (uploadError) {
                        console.error(`❌ Failed to upload media ${mediaItem.id}:`, uploadError);
                        throw new Error(`🚫 Twitter media upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
                    }
                }
            } else {
                // OAuth 1.0a is NOT available - skip media uploads and post text-only
                console.log(`⚠️ OAuth 1.0a not available - skipping media uploads, posting text-only`);
                console.log(`� Posting text-only tweet (media uploads require OAuth 1.0a)`);

                // Add warning to the tweet content about skipped media
                const mediaWarning = `\n\n⚠️ Note: Media uploads were skipped because OAuth 1.0a authentication is required. To include images/videos, please reconnect your Twitter account with OAuth 1.0a.`;
                const updatedContent = content + mediaWarning;

                // Post text-only tweet
                const tweetData: any = {
                    text: updatedContent,
                };

                console.log('Posting text-only tweet with options:', {
                    hasText: !!tweetData.text,
                    textLength: tweetData.text?.length || 0,
                    mediaCount: 0,
                    clientType: effectiveAuthType,
                    mediaSkipped: media?.length || 0
                });

                // Use v2 API for posting
                const tweet = await tweetClient.v2.tweet(tweetData);

                if (tweet.data) {
                    const tweetId = tweet.data.id;
                    console.log(`Tweet posted successfully (text-only): ${tweetId}`);

                    // Get username for URL construction
                    const username = await getUsernameFromClient(tweetClient);

                    return {
                        platformPostId: tweetId,
                        status: "published",
                        publishedAt: new Date().toISOString(),
                        url: `https://x.com/${username}/status/${tweetId}`,
                        type: "text_tweet",
                        success: true,
                        mediaUploadCount: 0,
                        totalMediaRequested: media?.length || 0,
                        authTypeUsed: authType,
                        mediaSkipped: true,
                        mediaSkipReason: "OAuth 1.0a required for media uploads"
                    };
                } else {
                    console.error('Tweet creation failed - no data returned');
                    return {
                        status: "failed",
                        error: "Tweet creation failed - no data returned from Twitter API",
                        success: false
                    };
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
            mediaCount: mediaIds.length,
            clientType: authType
        });

        // Use v2 API for posting
        const tweet = await tweetClient.v2.tweet(tweetData);

        if (tweet.data) {
            const tweetId = tweet.data.id;
            console.log(`Tweet posted successfully: ${tweetId}`);

            // Get username for URL construction
            const username = await getUsernameFromClient(tweetClient);

            return {
                platformPostId: tweetId,
                status: "published",
                publishedAt: new Date().toISOString(),
                url: `https://x.com/${username}/status/${tweetId}`,
                type: mediaIds.length > 0 ? "media_tweet" : "text_tweet",
                success: true,
                mediaUploadCount: mediaIds.length,
                totalMediaRequested: media?.length || 0,
                authTypeUsed: authType
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
                    if (media && media.length > 0) {
                        errorMessage = "X API v2 media upload failed: Please ensure your Twitter connection has the media.write scope enabled and your app has proper permissions for X API v2 media uploads.";
                    } else {
                        errorMessage = "X API access forbidden - Please check your OAuth 2.0 scopes and app permissions";
                    }
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

/**
 * Validate OAuth 1.0a tokens by making a test API call
 */
export async function validateOAuth1Tokens(accessToken: string, accessTokenSecret: string): Promise<boolean> {
    try {
        const client = new TwitterApi({
            appKey: TWITTER_API_KEY!,
            appSecret: TWITTER_API_SECRET!,
            accessToken: accessToken,
            accessSecret: accessTokenSecret,
        });

        // Make a simple API call to verify tokens
        await client.v2.me({
            'user.fields': ['id', 'username']
        });

        console.log('✅ OAuth 1.0a tokens validated successfully');
        return true;
    } catch (error) {
        console.error('❌ OAuth 1.0a token validation failed:', error instanceof Error ? error.message : String(error));
        return false;
    }
}
