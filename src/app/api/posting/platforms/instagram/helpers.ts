// Helper Functions for Instagram Route
import { NextRequest } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { prisma } from "@/config/database/prisma";

export interface InstagramConnection {
    accessToken: string;
    userId: string;
    username: string;
    connected: boolean;
    expiresAt?: Date;
}

export async function getInstagramConnection(request: NextRequest): Promise<InstagramConnection | null> {
    try {
        const session = await ServerSessionService.getSession(request);
        if (!session?.userId || !session.connectedPlatforms?.instagram) {
            return null;
        }

        const instagramData = session.connectedPlatforms.instagram;

        // Check if Instagram connection exists and is still valid
        if (!instagramData.account_tokens.access_token ||
            new Date(instagramData.account_tokens.expires_at) <= new Date()) {
            return null;
        }

        // Get userId from connected account
        const userId = instagramData.account.userId;

        return {
            accessToken: instagramData.account_tokens.access_token,
            userId: userId,
            username: instagramData.account.username,
            connected: true,
            expiresAt: new Date(instagramData.account_tokens.expires_at)
        };
    } catch (error) {
        console.error("Error fetching Instagram connection:", error);
        return null;
    }
}

export async function validateInstagramPermissions(accessToken: string, userId: string): Promise<boolean> {
    try {
        // In a production environment, you would verify permissions with the Instagram Graph API
        // For now, we'll assume access is valid if we have a token

        // Check if user has Instagram provider saved in the database
        const authProvider = await prisma.authProvider.findFirst({
            where: {
                userId,
                provider: 'instagram'
            }
        });

        return !!authProvider && !!accessToken;
    } catch (error) {
        console.error('Error validating Instagram permissions:', error);
        return false;
    }
}

export async function postToInstagram(params: {
    content: string;
    media?: any[];
    accessToken: string;
    userId: string;
}) {
    const { content, media, accessToken, userId } = params;

    try {
        // Instagram Graph API publishing flow based on latest Meta docs
        // https://developers.facebook.com/docs/instagram-api/guides/content-publishing

        // First, get the Instagram Business Account ID
        // In a real implementation, we would get this from the user's connected accounts or from Graph API
        // For now, we'll use a mock ID or derive from userId
        const instagramBusinessId = await getInstagramBusinessAccountId(userId, accessToken);

        if (!instagramBusinessId) {
            return {
                status: "failed",
                error: "Could not retrieve Instagram Business Account ID. Make sure you have a connected Instagram Business account.",
                success: false
            };
        }

        if (media && media.length > 0) {
            // Step 1: Container Creation
            // For images, videos, and carousels, we need to create a media container first
            const containerResponse = await createMediaContainer(instagramBusinessId, accessToken, content, media);

            if (!containerResponse.success) {
                return {
                    status: "failed",
                    error: containerResponse.error || "Failed to create Instagram media container",
                    success: false
                };
            }

            // Step 2: Media Publishing
            // Publish the created container to Instagram
            if (!containerResponse.containerId) {
                return {
                    status: "failed",
                    error: "Missing container ID",
                    success: false
                };
            }

            const publishResponse = await publishMedia(instagramBusinessId, accessToken, containerResponse.containerId);

            if (!publishResponse.success) {
                return {
                    status: "failed",
                    error: publishResponse.error || "Failed to publish Instagram media",
                    success: false
                };
            }

            // Return success response with post details
            const mediaId = publishResponse.mediaId || `ig_${Date.now()}`;
            const mediaIdParts = mediaId.split('_');
            const shortMediaId = mediaIdParts.length > 1 ? mediaIdParts[1] : mediaId;

            return {
                platformPostId: mediaId,
                status: "published",
                publishedAt: new Date().toISOString(),
                url: `https://instagram.com/p/${shortMediaId}`,
                type: media[0].type === 'video' ? "video_post" : media.length > 1 ? "carousel_post" : "image_post",
                success: true
            };
        } else {
            // Instagram requires media for feed posts
            // For text-only content, we can only create a Story with a text overlay
            // This is usually done with a generated image containing the text

            // Generate a simple image with text overlay
            const textImageUrl = await generateTextImage(content);

            // Create a Story with the generated image
            const storyResponse = await createStory(instagramBusinessId, accessToken, textImageUrl);

            if (!storyResponse.success) {
                return {
                    status: "failed",
                    error: storyResponse.error || "Failed to create Instagram Story",
                    success: false
                };
            }

            return {
                platformPostId: storyResponse.storyId,
                status: "published",
                publishedAt: new Date().toISOString(),
                url: `https://instagram.com/stories/${userId}/${storyResponse.storyId}`,
                type: "story",
                success: true
            };
        }
    } catch (error) {
        console.error("Instagram API error:", error);
        return {
            status: "failed",
            error: `Instagram API error: ${error instanceof Error ? error.message : String(error)}`,
            success: false
        };
    }
}

/**
 * Get Instagram Business Account ID from Facebook Graph API
 */
async function getInstagramBusinessAccountId(userId: string, accessToken: string): Promise<string | null> {
    try {
        // In a real implementation, this would make a call to Graph API to get the Instagram Business Account ID
        // GET /me/accounts?fields=instagram_business_account

        // For demonstration, we'll check if there's a record in the database
        const authProvider = await prisma.authProvider.findFirst({
            where: {
                userId,
                provider: 'instagram'
            }
        });

        if (!authProvider || !authProvider.providerId) {
            console.error("No Instagram Business Account found for user");
            return null;
        }

        // In a real implementation, this would be the Instagram Business Account ID from Facebook Graph API
        return authProvider.providerId;
    } catch (error) {
        console.error("Error retrieving Instagram Business Account ID:", error);
        return null;
    }
}

/**
 * Create a media container for Instagram using Graph API
 * @see https://developers.facebook.com/docs/instagram-api/reference/ig-user/media
 */
async function createMediaContainer(
    instagramBusinessId: string,
    accessToken: string,
    caption: string,
    media: Array<{
        id: string;
        url: string;
        type: 'image' | 'video';
        mimeType?: string;
    }>
): Promise<{ success: boolean; containerId?: string; error?: string }> {
    try {
        // In a real implementation, this would make a call to Graph API to create a media container
        // POST /{ig-user-id}/media with image_url/video_url and caption

        // Step 1: Prepare request parameters based on media type
        if (media.length === 0) {
            return {
                success: false,
                error: "No media provided"
            };
        }

        if (media.length === 1) {
            // Single media (image or video)
            const mediaItem = media[0];
            const isVideo = mediaItem.type === 'video';

            // In a real implementation, this would be an actual API call:
            /*
            const response = await fetch(
                `https://graph.facebook.com/v18.0/${instagramBusinessId}/media`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        [isVideo ? 'video_url' : 'image_url']: mediaItem.url,
                        caption: caption,
                        access_token: accessToken
                    })
                }
            );
            
            const data = await response.json();
            
            if (data.error) {
                return {
                    success: false,
                    error: data.error.message
                };
            }
            
            return {
                success: true,
                containerId: data.id
            };
            */

            // For demonstration, generate a mock container ID
            return {
                success: true,
                containerId: `${isVideo ? 'video' : 'image'}_container_${Date.now()}`
            };
        } else {
            // Carousel post (multiple media)
            // First, create individual containers for each media
            const childrenContainers = [];

            for (const mediaItem of media) {
                const isVideo = mediaItem.type === 'video';

                // In a real implementation, this would be an actual API call to create child containers
                // We'd use different endpoints based on whether it's image or video

                // Mock response
                childrenContainers.push(`child_${isVideo ? 'video' : 'image'}_${Date.now()}_${Math.random().toString(36).substring(7)}`);
            }

            // Then, create a carousel container with children
            // In a real implementation, this would be an actual API call:
            /*
            const response = await fetch(
                `https://graph.facebook.com/v18.0/${instagramBusinessId}/media`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        media_type: 'CAROUSEL',
                        children: childrenContainers,
                        caption: caption,
                        access_token: accessToken
                    })
                }
            );
            
            const data = await response.json();
            
            if (data.error) {
                return {
                    success: false,
                    error: data.error.message
                };
            }
            
            return {
                success: true,
                containerId: data.id
            };
            */

            // For demonstration, generate a mock carousel container ID
            return {
                success: true,
                containerId: `carousel_container_${Date.now()}`
            };
        }
    } catch (error) {
        console.error("Error creating Instagram media container:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Publish a media container to Instagram using Graph API
 * @see https://developers.facebook.com/docs/instagram-api/reference/ig-user/media_publish
 */
async function publishMedia(
    instagramBusinessId: string,
    accessToken: string,
    containerId: string
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
    try {
        // In a real implementation, this would make a call to Graph API to publish the media
        // POST /{ig-user-id}/media_publish with creation_id

        // In a real implementation, this would be an actual API call:
        /*
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${instagramBusinessId}/media_publish`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    creation_id: containerId,
                    access_token: accessToken
                })
            }
        );
        
        const data = await response.json();
        
        if (data.error) {
            return {
                success: false,
                error: data.error.message
            };
        }
        
        return {
            success: true,
            mediaId: data.id
        };
        */

        // For demonstration, generate a mock media ID
        return {
            success: true,
            mediaId: `${instagramBusinessId}_${Date.now()}`
        };
    } catch (error) {
        console.error("Error publishing Instagram media:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Generate a simple image with text overlay for Instagram Stories
 */
async function generateTextImage(text: string): Promise<string> {
    // In a real implementation, this would generate an image with text overlay
    // Could use libraries like Canvas, Sharp, or call an external service

    // For demonstration, return a mock image URL
    return `https://via.placeholder.com/1080x1920/FFFFFF/000000?text=${encodeURIComponent(text.substring(0, 100))}`;
}

/**
 * Create an Instagram Story using Graph API
 * @see https://developers.facebook.com/docs/instagram-api/reference/ig-user/stories
 */
async function createStory(
    instagramBusinessId: string,
    accessToken: string,
    imageUrl: string
): Promise<{ success: boolean; storyId?: string; error?: string }> {
    try {
        // In a real implementation, this would make a call to Graph API to create a Story
        // POST /{ig-user-id}/stories with image_url

        // In a real implementation, this would be an actual API call:
        /*
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${instagramBusinessId}/stories`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_url: imageUrl,
                    access_token: accessToken
                })
            }
        );
        
        const data = await response.json();
        
        if (data.error) {
            return {
                success: false,
                error: data.error.message
            };
        }
        
        return {
            success: true,
            storyId: data.id
        };
        */

        // For demonstration, generate a mock story ID
        return {
            success: true,
            storyId: `story_${Date.now()}`
        };
    } catch (error) {
        console.error("Error creating Instagram Story:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

export async function logPostActivity(userId: string, postId: string): Promise<void> {
    try {
        // In a production app, you would log this activity to the database
        console.log(`[${new Date().toISOString()}] User ${userId} posted to Instagram: ${postId}`);

        // Example of what real logging might look like:
        /*
        await prisma.postActivity.create({
            data: {
                userId,
                postId,
                platform: 'instagram',
                activityType: 'post_created',
                timestamp: new Date()
            }
        });
        */
    } catch (error) {
        console.error('Error logging post activity:', error);
    }
}
