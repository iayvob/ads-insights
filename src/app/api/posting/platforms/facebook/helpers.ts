// Helper Functions for Facebook Route
import { NextRequest } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { prisma } from "@/config/database/prisma";

export interface FacebookConnection {
    accessToken: string;
    userId: string; // Facebook User ID
    pageId: string; // Facebook Page ID
    pageAccessToken?: string; // Page-specific access token
    connected: boolean;
    expiresAt?: Date;
    scopes?: string[];
    pageName?: string;
}

/**
 * Get Facebook connection details for the current user
 */
export async function getFacebookConnection(request: NextRequest): Promise<FacebookConnection | null> {
    try {
        const session = await ServerSessionService.getSession(request);
        if (!session?.userId || !session.connectedPlatforms?.facebook) {
            return null;
        }

        const facebookData = session.connectedPlatforms.facebook;

        // Check if Facebook connection exists and is still valid
        if (!facebookData.account_tokens.access_token ||
            new Date(facebookData.account_tokens.expires_at) <= new Date()) {
            return null;
        }

        // Get Facebook User ID from the connection
        const fbUserId = facebookData.account.userId;

        // Get Facebook Page ID from connected account
        const pageId = facebookData.account.advertisingAccountId;

        // Get page-specific access token (needed for posting to a page)
        const pageAccessToken = await getPageAccessToken(
            facebookData.account_tokens.access_token,
            pageId || ''
        );

        return {
            accessToken: facebookData.account_tokens.access_token,
            userId: fbUserId || '',
            pageId: pageId || '',
            pageAccessToken: pageAccessToken,
            connected: true,
            expiresAt: new Date(facebookData.account_tokens.expires_at),
            pageName: facebookData.account.username
        };
    } catch (error) {
        console.error("Error getting Facebook connection:", error);
        return null;
    }
}

/**
 * Validate if user has access to post to the specified Facebook page
 */
export async function validateFacebookPageAccess(accessToken: string, pageId: string, userId: string): Promise<boolean> {
    try {
        if (!accessToken || !pageId) {
            return false;
        }

        // Call the Graph API to check page permissions
        // Real implementation would verify manage_pages and publish_pages permissions
        try {
            const response = await fetch(
                `https://graph.facebook.com/v19.0/${pageId}?fields=access_token,name&access_token=${accessToken}`,
                { method: 'GET' }
            );

            const pageData = await response.json();

            // If we can get the page data, user likely has access
            if (pageData.id && pageData.name) {
                return true;
            }

            return false;
        } catch (apiError) {
            console.error('Facebook Graph API error:', apiError);

            // Fallback to database check
            const authProvider = await prisma.authProvider.findFirst({
                where: {
                    userId,
                    provider: 'facebook',
                    advertisingAccountId: pageId
                }
            });

            return !!authProvider && !!accessToken;
        }
    } catch (error) {
        console.error('Error validating Facebook page access:', error);
        return false;
    }
}

/**
 * Get page-specific access token required for posting to a Facebook page
 */
export async function getPageAccessToken(userAccessToken: string, pageId: string): Promise<string | undefined> {
    try {
        if (!userAccessToken || !pageId) {
            return undefined;
        }

        // Call Graph API to get the page access token
        const response = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${userAccessToken}`,
            { method: 'GET' }
        );

        const pageData = await response.json();

        if (pageData.error) {
            console.error('Error getting page access token:', pageData.error);
            return undefined;
        }

        return pageData.access_token;
    } catch (error) {
        console.error('Error getting page access token:', error);
        return undefined;
    }
}

/**
 * Post content to Facebook page
 */
export async function postToFacebook(params: {
    content: string;
    media?: Array<{
        id: string;
        url: string;
        type: 'image' | 'video';
        mimeType?: string;
    }>;
    pageId: string;
    accessToken: string;
    pageAccessToken?: string;
    scheduling?: {
        publishAt: string;
        timezone: string;
    };
}) {
    const { content, media, pageId, accessToken, pageAccessToken, scheduling } = params;

    try {
        // Use page-specific access token if available, fall back to user access token
        const token = pageAccessToken || accessToken;

        // Prepare post data
        const postData: Record<string, any> = {
            message: content
        };

        // Add scheduling if provided
        if (scheduling) {
            const publishTime = Math.floor(new Date(scheduling.publishAt).getTime() / 1000);
            postData.published = false;
            postData.scheduled_publish_time = publishTime;
        }

        // Handle different post types
        if (!media || media.length === 0) {
            // Text-only post
            return await createTextPost(pageId, token, postData);
        } else if (media.length === 1) {
            // Single media post
            return await createSingleMediaPost(pageId, token, postData, media[0]);
        } else {
            // Multi-media post (carousel)
            return await createMultiMediaPost(pageId, token, postData, media);
        }
    } catch (error) {
        console.error("Facebook posting error:", error);
        return {
            success: false,
            error: `Facebook API error: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Create a text-only post on Facebook
 */
async function createTextPost(pageId: string, accessToken: string, postData: Record<string, any>) {
    try {
        const response = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}/feed`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...postData,
                    access_token: accessToken
                })
            }
        );

        const result = await response.json();

        if (result.error) {
            return {
                success: false,
                error: result.error.message
            };
        }

        return {
            success: true,
            platformPostId: result.id,
            status: postData.published === false ? "scheduled" : "published",
            publishedAt: new Date().toISOString(),
            url: `https://facebook.com/${result.id}`,
            type: "text_post"
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to create Facebook text post: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Create a single media post on Facebook
 */
async function createSingleMediaPost(
    pageId: string,
    accessToken: string,
    postData: Record<string, any>,
    mediaItem: {
        id: string;
        url: string;
        type: 'image' | 'video';
        mimeType?: string;
    }
) {
    try {
        // For a real implementation, we would first upload the media to Facebook
        // and then create a post with the media ID

        // Step 1: Upload media
        const mediaResponse = await uploadMediaToFacebook(pageId, accessToken, mediaItem);

        if (!mediaResponse.success) {
            return mediaResponse;
        }

        // Step 2: Create post with attached media
        const response = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}/feed`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...postData,
                    attached_media: [{ media_fbid: mediaResponse.mediaId }],
                    access_token: accessToken
                })
            }
        );

        const result = await response.json();

        if (result.error) {
            return {
                success: false,
                error: result.error.message
            };
        }

        return {
            success: true,
            platformPostId: result.id,
            status: postData.published === false ? "scheduled" : "published",
            publishedAt: new Date().toISOString(),
            url: `https://facebook.com/${result.id}`,
            type: mediaItem.type === 'video' ? "video_post" : "photo_post"
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to create Facebook media post: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Create a multi-media post (carousel) on Facebook
 */
async function createMultiMediaPost(
    pageId: string,
    accessToken: string,
    postData: Record<string, any>,
    mediaItems: Array<{
        id: string;
        url: string;
        type: 'image' | 'video';
        mimeType?: string;
    }>
) {
    try {
        // Step 1: Upload all media items
        const mediaIds = [];

        for (const mediaItem of mediaItems) {
            const mediaResponse = await uploadMediaToFacebook(pageId, accessToken, mediaItem);

            if (!mediaResponse.success) {
                return mediaResponse;
            }

            mediaIds.push({ media_fbid: mediaResponse.mediaId });
        }

        // Step 2: Create post with all attached media
        const response = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}/feed`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...postData,
                    attached_media: mediaIds,
                    access_token: accessToken
                })
            }
        );

        const result = await response.json();

        if (result.error) {
            return {
                success: false,
                error: result.error.message
            };
        }

        return {
            success: true,
            platformPostId: result.id,
            status: postData.published === false ? "scheduled" : "published",
            publishedAt: new Date().toISOString(),
            url: `https://facebook.com/${result.id}`,
            type: "carousel_post"
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to create Facebook carousel post: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Upload media to Facebook before posting
 */
async function uploadMediaToFacebook(
    pageId: string,
    accessToken: string,
    mediaItem: {
        id: string;
        url: string;
        type: 'image' | 'video';
        mimeType?: string;
    }
) {
    try {
        // In a real implementation, this would upload the media to Facebook
        // Different endpoints for photos vs videos
        const endpoint = mediaItem.type === 'video' ? 'videos' : 'photos';
        const urlParam = mediaItem.type === 'video' ? 'file_url' : 'url';

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}/${endpoint}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    [urlParam]: mediaItem.url,
                    published: false, // Don't publish immediately
                    access_token: accessToken
                })
            }
        );

        const result = await response.json();

        if (result.error) {
            return {
                success: false,
                error: `Failed to upload media to Facebook: ${result.error.message}`
            };
        }

        return {
            success: true,
            mediaId: result.id
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to upload media to Facebook: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Log post activity for analytics
 */
export async function logPostActivity(userId: string, platform: string, pageId: string, postId: string): Promise<void> {
    try {
        // In a production app, you would log this activity to the database
        console.log(`[${new Date().toISOString()}] User ${userId} posted to ${platform} page ${pageId}: ${postId}`);

        // Example of what real logging might look like:
        /*
        await prisma.postActivity.create({
            data: {
                userId,
                postId,
                platform,
                pageId,
                activityType: 'post_created',
                timestamp: new Date()
            }
        });
        */
    } catch (error) {
        console.error('Error logging post activity:', error);
    }
}
