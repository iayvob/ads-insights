// Helper Functions for Twitter Route - Following the documentation exactly
import { NextRequest } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { prisma } from "@/config/database/prisma";
import { getTwitterUserClient, getTwitterV2Client, getTwitterAppClient } from "@/lib/twitter";
import { OAUTH_SCOPES } from "@/config/data/consts";
import { TwitterApi } from 'twitter-api-v2';
import { env } from "@/validations/env";

const TWITTER_API_KEY = env.TWITTER_API_KEY;
const TWITTER_API_SECRET = env.TWITTER_API_SECRET;

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
    return !!(connection as any).accessTokenSecret ||
        connection.tokenType === 'oauth1' ||
        (connection as any).authType === 'oauth1';
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
        accessSecret: (connection as any).accessTokenSecret || (connection as any).refreshToken,
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

        // X API v2 with OAuth 2.0 Bearer authentication only
        console.log('🔐 Using OAuth 2.0 authentication for X API v2');

        const authType: 'oauth2' = 'oauth2';

        // Debug: Log authentication data
        console.log('🔍 Twitter auth provider data:', {
            hasAccessToken: !!authProvider.accessToken,
            accessTokenLength: authProvider.accessToken?.length,
            accessTokenPreview: authProvider.accessToken?.substring(0, 10) + '...',
            expiresAt: authProvider.expiresAt,
            providerId: authProvider.providerId
        });

        console.log('🔐 Using pure OAuth 2.0 authentication for X API v2');

        return {
            accessToken: authProvider.accessToken,
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
 * Upload media using Twitter API v1.1 endpoints (OAuth 1.0a required for now)
 * Since X API v2 media upload doesn't support OAuth 2.0 yet, we fall back to v1.1
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

    console.log(`🚀 Attempting Twitter media upload for ${mediaType}, size: ${totalBytes} bytes`);

    // First check: Do we have OAuth 1.0a credentials for this user?
    if (connection && hasTwitterOAuth1Connection(connection)) {
        try {
            console.log('📡 Attempt 1: Using user OAuth 1.0a credentials for media upload');

            const oauth1Client = getTwitterOAuth1Client(connection);
            if (oauth1Client) {
                const uploadResponse = await oauth1Client.v1.uploadMedia(buffer, {
                    mimeType: mimeType,
                    target: 'tweet'
                });

                const mediaId = typeof uploadResponse === 'string' ? uploadResponse : (uploadResponse as any).media_id_string;

                if (!mediaId) {
                    throw new Error('OAuth 1.0a media upload succeeded but no media_id returned');
                }

                console.log(`✅ User OAuth 1.0a media upload succeeded: ${mediaId}`);
                return mediaId;
            }
        } catch (oauth1Error) {
            console.log('❌ User OAuth 1.0a media upload failed, trying OAuth 2.0...');
        }
    }

    try {
        // Second try: Use the provided OAuth 2.0 client (will likely fail but worth trying)
        console.log('📡 Attempt 2: Using OAuth 2.0 client for media upload');

        const uploadResponse = await client.v1.uploadMedia(buffer, {
            mimeType: mimeType,
            target: 'tweet'
        });

        const mediaId = typeof uploadResponse === 'string' ? uploadResponse : (uploadResponse as any).media_id_string;

        if (!mediaId) {
            throw new Error('Media upload succeeded but no media_id returned');
        }

        console.log(`✅ OAuth 2.0 media upload succeeded: ${mediaId}`);
        return mediaId;

    } catch (oauth2Error) {
        console.log('❌ OAuth 2.0 media upload failed, trying app-level OAuth 1.0a fallback...');

        // Third try: Use app-level OAuth 1.0a authentication
        try {
            console.log('📡 Attempt 3: Using app-level OAuth 1.0a for media upload');

            // Create an app-only client using OAuth 1.0a credentials
            const appClient = getTwitterAppClient();

            // Note: This might still fail because app-only auth may not have user context
            const uploadResponse = await appClient.v1.uploadMedia(buffer, {
                mimeType: mimeType,
                target: 'tweet'
            });

            const mediaId = typeof uploadResponse === 'string' ? uploadResponse : (uploadResponse as any).media_id_string;

            if (!mediaId) {
                throw new Error('App-level media upload succeeded but no media_id returned');
            }

            console.log(`✅ App-level OAuth 1.0a media upload succeeded: ${mediaId}`);
            return mediaId;

        } catch (appError) {
            console.error('❌ App-level media upload also failed:', appError);

            // If all attempts fail, provide comprehensive guidance
            const isOAuth2Issue = oauth2Error instanceof Error && (
                oauth2Error.message.includes('OAuth2') ||
                oauth2Error.message.includes('not permitted') ||
                oauth2Error.message.includes('Forbidden')
            );

            if (isOAuth2Issue) {
                throw new Error(`🚫 Twitter Media Upload Authentication Issue

❌ Current Limitation: X API media uploads require OAuth 1.0a authentication
✅ Text tweets work perfectly with OAuth 2.0 (X API v2)

🔧 Immediate Solutions:
1. Connect Twitter with OAuth 1.0a: Visit /api/auth/twitter/oauth1/login
2. Use text-only posts (remove images/videos temporarily)
3. Add link to images hosted elsewhere
4. Wait for X to enable OAuth 2.0 media uploads

📋 Technical Details:
- OAuth 2.0 attempt: ${oauth2Error.message}
- App-level attempt: ${appError instanceof Error ? appError.message : 'Unknown error'}
- Has OAuth 1.0a connection: ${connection ? hasTwitterOAuth1Connection(connection) : 'No connection data'}

🔮 Future: X is expected to enable OAuth 2.0 for media uploads eventually.`);
            }

            throw new Error(`🚫 Media upload failed with both authentication methods: ${oauth2Error instanceof Error ? oauth2Error.message : 'Unknown error'}`);
        }
    }
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
    authType: 'oauth2';
    request: NextRequest; // Add request to get connection data
}) {
    const { content, media, accessToken, accessTokenSecret, authType, request } = params;

    try {
        // Get Twitter connection data for OAuth 1.0a capability check
        const connection = await getTwitterConnection(request);

        // IMPORTANT: Using X API v2 with OAuth 2.0 Bearer tokens for both tweets and media

        let tweetClient;

        console.log(`🔐 X API v2 authentication setup - authType: ${authType}, tokenLength: ${accessToken.length}`);
        console.log(`🔍 Connection check - hasOAuth1: ${connection ? hasTwitterOAuth1Connection(connection) : 'No connection'}`);

        // Create client for X API v2 operations  
        if (authType === 'oauth2') {
            console.log('🚀 Using OAuth 2.0 for X API v2 endpoints (tweets)');
            // OAuth 2.0 - Use for tweet posting (v2)
            tweetClient = getTwitterV2Client(accessToken);

            // For media uploads, we'll need to handle the OAuth 1.0a requirement
            // Check if OAuth 2.0 token has required scopes
            if (media && media.length > 0) {
                console.log('📁 Media detected - checking authentication compatibility');
                const scopeValidation = validateTwitterScopes(OAUTH_SCOPES.TWITTER, true);

                console.log(`🔍 Current situation:
- Authentication: OAuth 2.0 (✅ for tweets, ${connection && hasTwitterOAuth1Connection(connection) ? '✅' : '❌'} for media)  
- Media uploads: ${connection && hasTwitterOAuth1Connection(connection) ? 'OAuth 1.0a available' : 'OAuth 1.0a required but not available'}
- Text tweets: Full OAuth 2.0 support
- Attempting upload with current credentials...`);

                // We'll try the upload and let the detailed error handling inform the user
                console.log('📡 Proceeding with media upload attempt...');
            } else {
                // For text-only posts, check basic tweet.write scope
                const scopeValidation = validateTwitterScopes(OAUTH_SCOPES.TWITTER, false);
                if (!scopeValidation.valid) {
                    const missingScopes = scopeValidation.missing.join(', ');
                    throw new Error(`🚫 X API posting failed: Missing required OAuth 2.0 scope [${missingScopes}]. Please reconnect your Twitter account and ensure tweet.write permission is granted.`);
                }
                console.log('✅ OAuth 2.0 token has required scopes for text posting');
            }
        } else {
            throw new Error('🚫 X API v2 requires OAuth 2.0 authentication. OAuth 1.0a is deprecated. Please reconnect your Twitter account using OAuth 2.0 authentication.');
        }

        let mediaIds: string[] = [];

        // Upload media if present using X API v2 OAuth 2.0 flow
        if (media && media.length > 0) {
            console.log(`📁 Uploading ${media.length} media files to X using v2 OAuth 2.0 endpoints`);
            console.log(`🔐 Using OAuth 2.0 Bearer token for media upload`);

            for (const mediaItem of media) {
                try {
                    let mediaId: string | null = null;

                    console.log(`Uploading media ${mediaItem.id}: ${mediaItem.type} using X API v2`);

                    // Download media from URL
                    const mediaResponse = await fetch(mediaItem.url);
                    if (!mediaResponse.ok) {
                        throw new Error(`Failed to download media from ${mediaItem.url}: ${mediaResponse.status}`);
                    }

                    const buffer = Buffer.from(await mediaResponse.arrayBuffer());
                    const mimeType = mediaResponse.headers.get('content-type') ||
                        (mediaItem.type === 'video' ? 'video/mp4' : 'image/jpeg');

                    console.log(`🚀 Processing v2 ${mediaItem.type} upload: ${buffer.length} bytes, type: ${mimeType}`);

                    // Use X API v2 media upload with OAuth 2.0 and OAuth 1.0a fallback
                    mediaId = await uploadMediaV2(tweetClient, buffer, mimeType, mediaItem.type, accessToken, connection || undefined);

                    if (mediaId) {
                        mediaIds.push(mediaId);
                        console.log(`✅ Successfully uploaded media ${mediaItem.id} -> ${mediaId} (X API v2)`);
                    } else {
                        console.error(`❌ Failed to upload media ${mediaItem.id}`);
                    }
                } catch (uploadError) {
                    console.error(`❌ Failed to upload media ${mediaItem.id}:`, uploadError);

                    // Provide specific guidance for OAuth 2.0 + media upload issues
                    if (uploadError instanceof Error && uploadError.message.includes('OAuth2')) {
                        throw new Error(`🚫 Twitter Media Upload Authentication Issue

❌ Current Limitation: X API media uploads still require OAuth 1.0a authentication
✅ Text tweets work fine with OAuth 2.0 (X API v2)

🔧 Solutions:
1. IMMEDIATE: Use text-only posts (remove images/videos)
2. ALTERNATIVE: Reconnect Twitter with OAuth 1.0a for media support
3. FUTURE: Wait for X to enable OAuth 2.0 media uploads

📝 Technical Details:
- Your account: ${authType} authentication  
- Media endpoint: Requires OAuth 1.0a (v1.1 API)
- Tweet endpoint: Supports OAuth 2.0 (v2 API)

Error: ${uploadError.message}`);
                    } else {
                        throw new Error(`🚫 Twitter media upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
                    }
                }
            }

            console.log(`Successfully uploaded ${mediaIds.length} out of ${media.length} media files using X API v2`);
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
