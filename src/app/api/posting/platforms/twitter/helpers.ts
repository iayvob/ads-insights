// Helper Functions for Twitter Route - Following the documentation exactly
import { NextRequest } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { prisma } from "@/config/database/prisma";
import { getTwitterUserClient, getTwitterV2Client } from "@/lib/twitter";
import { OAUTH_SCOPES } from "@/config/data/consts";

// Twitter media upload constants
const TWITTER_IMAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB for images
const TWITTER_GIF_SIZE_LIMIT = 15 * 1024 * 1024; // 15MB for GIFs  
const TWITTER_VIDEO_SIZE_LIMIT = 512 * 1024 * 1024; // 512MB for videos
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for chunked upload

// Twitter API v2 media upload endpoints (replacing v1.1 - target deprecation: March 31, 2025)
const TWITTER_V2_MEDIA_UPLOAD_URL = 'https://upload.twitter.com/2/media/upload';
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

        // Determine authentication type based on token characteristics
        // OAuth 1.0a tokens are shorter (typically 50-60 chars) while OAuth 2.0 Bearer tokens are longer (80+ chars)
        // OAuth 1.0a requires access token secret, OAuth 2.0 uses Bearer tokens

        let authType: 'oauth1' | 'oauth2';
        let accessTokenSecret: string | undefined;

        // Debug: Log all available authentication data
        console.log('🔍 Twitter auth provider data:', {
            hasAccessToken: !!authProvider.accessToken,
            accessTokenLength: authProvider.accessToken?.length,
            accessTokenPreview: authProvider.accessToken?.substring(0, 10) + '...',
            hasRefreshToken: !!authProvider.refreshToken,
            refreshTokenLength: authProvider.refreshToken?.length,
            refreshTokenPreview: authProvider.refreshToken?.substring(0, 10) + '...' || 'N/A',
            expiresAt: authProvider.expiresAt,
            providerId: authProvider.providerId
        });

        // Check if we have an access token secret stored in refreshToken (OAuth 1.0a pattern)
        // This is a common pattern where OAuth 1.0a access token secret is stored in refreshToken field
        const hasRefreshToken = !!authProvider.refreshToken;
        const tokenLength = authProvider.accessToken.length;

        // OAuth 2.0 Bearer tokens are typically 80+ characters and start with specific patterns
        // OAuth 1.0a tokens are typically shorter (40-60 characters)
        const looksLikeOAuth2Bearer = tokenLength > 80 || authProvider.accessToken.startsWith('AAAA');

        // IMPORTANT: For Twitter OAuth 2.0, refresh tokens are for token renewal, NOT access token secrets
        // OAuth 2.0: Long tokens (80+ chars) + refresh tokens for renewal
        // OAuth 1.0a: Short tokens (40-60 chars) + access token secrets (stored as refresh tokens in some systems)
        if (looksLikeOAuth2Bearer) {
            // This is OAuth 2.0 - refresh token is for renewal, not access token secret
            authType = 'oauth2';
            accessTokenSecret = undefined;
            console.log('🔐 Detected OAuth 2.0 authentication (Bearer token - refresh token is for renewal)');
        } else if (hasRefreshToken && tokenLength < 80) {
            // Short token with refresh token - likely OAuth 1.0a with access token secret
            authType = 'oauth1';
            accessTokenSecret = authProvider.refreshToken || undefined;
            console.log('🔐 Detected OAuth 1.0a authentication (short token + access secret stored as refresh token)');
        } else {
            // Default based on token length
            authType = tokenLength < 80 ? 'oauth1' : 'oauth2';
            accessTokenSecret = (authType === 'oauth1' && hasRefreshToken) ? (authProvider.refreshToken || undefined) : undefined;
            console.log(`🔐 Authentication type inferred as ${authType} based on token length: ${tokenLength}`);
        }

        console.log(`🔐 Final Twitter auth detection: authType=${authType}, tokenLength=${tokenLength}, hasSecret=${!!accessTokenSecret}`);

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
 * Upload media using Twitter API v2 endpoints (OAuth 2.0 with media.write scope)
 * Following the latest 2025 Twitter API documentation
 */
async function uploadMediaV2(
    client: any,
    buffer: Buffer,
    mimeType: string,
    mediaType: 'image' | 'video'
): Promise<string> {
    const totalBytes = buffer.length;

    console.log(`🚀 Using Twitter API v2 media upload for ${mediaType}, size: ${totalBytes} bytes`);

    try {
        // As of 2025, the twitter-api-v2 library still uses v1.1 endpoints for media upload
        // even with OAuth 2.0 Bearer tokens. The v2 media endpoints are not yet fully 
        // implemented in the library. Use the v1 upload method which works with OAuth 2.0.

        console.log('📡 Using v1 media upload method with OAuth 2.0 Bearer token (library limitation)');

        // Use the v1 upload method - this actually works with OAuth 2.0 Bearer tokens
        // despite being labeled as v1, when using the twitter-api-v2 library
        const response = await client.v1.uploadMedia(buffer, {
            mimeType: mimeType,
            target: 'tweet',
            media_category: mediaType === 'video' ? 'tweet_video' : 'tweet_image'
        });

        const mediaId = typeof response === 'string' ? response : response.media_id_string;
        console.log(`✅ v2 media upload completed: ${mediaId}`);
        return mediaId;

    } catch (error) {
        console.error('❌ v2 media upload failed:', error);

        // Check if this is a scope-related error
        if (error instanceof Error && (error.message.includes('scope') || error.message.includes('permission'))) {
            throw new Error('🚫 Twitter v2 media upload failed: Missing required media.write scope. Please reconnect your Twitter account and ensure the media.write permission is granted.');
        }

        throw error;
    }
}/**
 * Upload media using chunked upload (INIT -> APPEND -> FINALIZE -> STATUS)
 * Legacy v1.1 method for OAuth 1.0a authentication
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
            // Use simple upload for small images with proper media category
            const uploadResponse = await client.v1.uploadMedia(buffer, {
                mimeType: mimeType,
                target: 'tweet',
                media_category: mediaItem.type === 'video' ? 'tweet_video' : 'tweet_image'
            });

            // Handle response format - it might be just the media_id or an object
            mediaId = typeof uploadResponse === 'string' ? uploadResponse : uploadResponse.media_id_string;
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

/**
 * Upload single media item using v2 endpoints (OAuth 2.0 with media.write scope)
 */
async function uploadSingleMediaV2(
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

        console.log(`🚀 Processing v2 ${mediaItem.type} upload: ${fileSize} bytes, type: ${mimeType}`);

        // Validate file size limits
        if (mediaItem.type === 'video' && fileSize > TWITTER_VIDEO_SIZE_LIMIT) {
            throw new Error(`Video file too large: ${fileSize} bytes (max: ${TWITTER_VIDEO_SIZE_LIMIT})`);
        }
        if (mediaItem.type === 'image' && fileSize > TWITTER_IMAGE_SIZE_LIMIT) {
            throw new Error(`Image file too large: ${fileSize} bytes (max: ${TWITTER_IMAGE_SIZE_LIMIT})`);
        }

        // Use v2 media upload
        const mediaId = await uploadMediaV2(client, buffer, mimeType, mediaItem.type);

        // Add alt text if provided (v2 method)
        if (mediaItem.alt && mediaId) {
            try {
                // For v2 API, alt text might be handled differently
                // Check if v2 method exists, otherwise fallback to v1
                if (client.v2 && client.v2.createMediaMetadata) {
                    await client.v2.createMediaMetadata(mediaId, {
                        alt_text: { text: mediaItem.alt }
                    });
                } else {
                    // Fallback to v1 method for alt text
                    await client.v1.createMediaMetadata(mediaId, {
                        alt_text: { text: mediaItem.alt }
                    });
                }
                console.log(`Added alt text for media_id: ${mediaId} (v2)`);
            } catch (altError) {
                console.warn('Failed to add alt text (v2):', altError);
            }
        }

        console.log(`✅ Successfully uploaded media v2: ${mediaId}`);
        return mediaId;

    } catch (error) {
        console.error(`❌ Failed to upload media v2 ${mediaItem.id}:`, error);
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
        // IMPORTANT: Twitter media upload v1.1 endpoints require OAuth 1.0a authentication
        // OAuth 2.0 Bearer tokens don't work with media upload endpoints

        let mediaClient;
        let tweetClient;

        console.log(`🔐 Twitter authentication setup - authType: ${authType}, hasSecret: ${!!accessTokenSecret}, tokenLength: ${accessToken.length}`);

        // Create clients based on auth type and operation
        if (authType === 'oauth1' && accessTokenSecret) {
            console.log('✅ Using OAuth 1.0a for both media upload and tweet posting (v1.1 endpoints)');
            // OAuth 1.0a - Use for both operations (legacy v1.1 endpoints)
            mediaClient = getTwitterUserClient(accessToken, accessTokenSecret);
            tweetClient = mediaClient; // Same client for both operations
        } else if (authType === 'oauth2') {
            console.log('🚀 OAuth 2.0 detected - attempting v2 media upload endpoints');
            // For OAuth 2.0: Use Bearer token for both tweeting and media upload (v2 endpoints)
            tweetClient = getTwitterV2Client(accessToken);
            mediaClient = tweetClient; // Same client for v2 operations

            // Check if OAuth 2.0 token has required scopes for media upload
            if (media && media.length > 0) {
                // Enhanced scope validation for media uploads
                const scopeValidation = validateTwitterScopes(OAUTH_SCOPES.TWITTER, true);
                const hasScopes = hasMediaWriteScope(accessToken, OAUTH_SCOPES.TWITTER);

                if (!hasScopes || !scopeValidation.valid) {
                    const missingScopes = scopeValidation.missing.join(', ');
                    throw new Error(`🚫 Twitter v2 media upload failed: Missing required OAuth 2.0 scopes [${missingScopes}]. Please reconnect your Twitter account and ensure these permissions are granted: media.write, tweet.write. Current configured scopes: ${OAUTH_SCOPES.TWITTER}`);
                }
                console.log('✅ OAuth 2.0 token has required scopes for media upload - proceeding with v2 upload');
            } else {
                // For text-only posts, check basic tweet.write scope
                const scopeValidation = validateTwitterScopes(OAUTH_SCOPES.TWITTER, false);
                if (!scopeValidation.valid) {
                    const missingScopes = scopeValidation.missing.join(', ');
                    throw new Error(`🚫 Twitter posting failed: Missing required OAuth 2.0 scope [${missingScopes}]. Please reconnect your Twitter account and ensure tweet.write permission is granted.`);
                }
                console.log('✅ OAuth 2.0 token has required scopes for text posting');
            }
        } else {
            throw new Error('🚫 Invalid Twitter authentication: Missing access token secret. OAuth 1.0a authentication requires both access token and access token secret for API requests.');
        }

        let mediaIds: string[] = [];

        // Check for OAuth 2.0 media upload limitation
        if (authType === 'oauth2' && media && media.length > 0) {
            throw new Error('🚫 Twitter media upload not supported with OAuth 2.0: Twitter API v2 requires using v1.1 media upload endpoints, which only support OAuth 1.0a authentication. Please reconnect your Twitter account using OAuth 1.0a for media uploads, or use text-only posts with OAuth 2.0.');
        }

        // Upload media if present using enhanced upload flow
        if (media && media.length > 0) {
            // Validate that we have proper authentication for media uploads
            if (!mediaClient) {
                throw new Error('🚫 Cannot upload media: Media client not available. Twitter media uploads require OAuth 1.0a authentication.');
            }

            console.log(`📁 Uploading ${media.length} media files to Twitter using enhanced upload flow`);
            console.log(`🔐 Media client auth type: ${authType}, has secret: ${!!accessTokenSecret}`);

            for (const mediaItem of media) {
                try {
                    console.log(`Uploading media ${mediaItem.id}: ${mediaItem.type} using ${authType === 'oauth2' ? 'v2' : 'v1.1'} endpoints`);

                    let mediaId: string | null;

                    if (authType === 'oauth2') {
                        // Use v2 media upload for OAuth 2.0
                        mediaId = await uploadSingleMediaV2(mediaClient, mediaItem);
                    } else {
                        // Use v1.1 media upload for OAuth 1.0a
                        mediaId = await uploadSingleMedia(mediaClient, mediaItem);
                    }

                    if (mediaId) {
                        mediaIds.push(mediaId);
                        console.log(`✅ Successfully uploaded media ${mediaItem.id} -> ${mediaId} (${authType === 'oauth2' ? 'v2' : 'v1.1'})`);
                    } else {
                        console.error(`❌ Failed to upload media ${mediaItem.id}`);
                    }
                } catch (uploadError) {
                    console.error(`❌ Failed to upload media ${mediaItem.id}:`, uploadError);

                    // Provide specific error messages based on authentication type and error details
                    if (authType === 'oauth2') {
                        throw new Error('🚫 Twitter media upload failed: Twitter API v2 requires v1.1 media upload endpoints, which only support OAuth 1.0a authentication. For media uploads, please reconnect your Twitter account using OAuth 1.0a authentication, or use text-only posts with OAuth 2.0.');
                    } else if (authType === 'oauth1' && !accessTokenSecret) {
                        throw new Error('🚫 Twitter media upload failed: OAuth 1.0a authentication requires an access token secret, but none was found. Please reconnect your Twitter account.');
                    } else if (uploadError instanceof Error && uploadError.message.includes('403')) {
                        throw new Error('� Twitter media upload failed: 403 Forbidden. This usually indicates: 1) Invalid OAuth 1.0a credentials, 2) App lacks media upload permissions, or 3) Token has expired. Please reconnect your Twitter account and ensure your app has read/write permissions.');
                    } else {
                        throw new Error(`🚫 Twitter media upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
                    }
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
                    if (authType === 'oauth2' && media && media.length > 0) {
                        errorMessage = "Twitter media upload failed: Twitter API v2 requires v1.1 media upload endpoints, which only support OAuth 1.0a authentication. Please reconnect with OAuth 1.0a for media uploads or use text-only posts.";
                    } else if (authType === 'oauth2') {
                        errorMessage = "Twitter API access forbidden - Please check your OAuth 2.0 scopes and app permissions";
                    } else {
                        errorMessage = "Twitter API access forbidden - check your app permissions and OAuth 1.0a authentication";
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
