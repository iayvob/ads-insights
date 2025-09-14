// Helper Functions for Instagram Route - Following the documentation exactly
import { NextRequest } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { prisma } from "@/config/database/prisma";
import { postImage, postVideo } from "@/lib/instagram";

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
        if (!session?.userId) {
            return null;
        }

        // Get Instagram auth provider from database
        const authProvider = await prisma.authProvider.findFirst({
            where: {
                userId: session.userId,
                provider: 'instagram'
            }
        });

        if (!authProvider || !authProvider.accessToken) {
            return null;
        }

        // Check if token is expired (if expiresAt is set)
        if (authProvider.expiresAt && new Date(authProvider.expiresAt) <= new Date()) {
            return null;
        }

        return {
            accessToken: authProvider.accessToken,
            userId: authProvider.providerId || '',
            username: authProvider.username || '',
            connected: true,
            expiresAt: authProvider.expiresAt || undefined
        };
    } catch (error) {
        console.error("Error fetching Instagram connection:", error);
        return null;
    }
}

export async function validateInstagramAccess(userId: string): Promise<boolean> {
    try {
        // Check if user has Instagram provider saved in the database
        const authProvider = await prisma.authProvider.findFirst({
            where: {
                userId,
                provider: 'instagram'
            }
        });

        return !!authProvider && !!authProvider.accessToken;
    } catch (error) {
        console.error('Error validating Instagram access:', error);
        return false;
    }
}

export async function postToInstagram(params: {
    content: string;
    media?: Array<{
        id: string;
        url: string;
        type: 'image' | 'video';
        mimeType?: string;
        alt?: string;
    }>;
    accessToken: string;
    userId: string;
}) {
    const { content, media, accessToken, userId } = params;

    try {
        // Instagram requires media for posts - cannot post text-only to feed
        if (!media || media.length === 0) {
            return {
                status: "failed",
                error: "Instagram does not allow text-only posts. Must include media (image or video).",
                success: false
            };
        }

        // Get Instagram Business Account ID from database
        const businessAccountId = await getInstagramBusinessAccountId(userId);
        if (!businessAccountId) {
            return {
                status: "failed",
                error: "Could not retrieve Instagram Business Account ID. Make sure you have a connected Instagram Business account.",
                success: false
            };
        }

        console.log(`Posting to Instagram with ${media.length} media files`);

        // For single media posts
        if (media.length === 1) {
            const mediaItem = media[0];

            try {
                let result;

                if (mediaItem.type === 'video') {
                    console.log('Posting video to Instagram');
                    result = await postVideo(accessToken, mediaItem.url, content, businessAccountId);
                } else {
                    console.log('Posting image to Instagram');
                    result = await postImage(accessToken, mediaItem.url, content, businessAccountId);
                }

                if (result && result.id) {
                    console.log(`Instagram post created successfully: ${result.id}`);

                    return {
                        platformPostId: result.id,
                        status: "published",
                        publishedAt: new Date().toISOString(),
                        url: result.permalink || `https://instagram.com/p/${result.id}`,
                        type: mediaItem.type === 'video' ? "video_post" : "image_post",
                        success: true
                    };
                } else {
                    console.error('Instagram API returned no result');
                    return {
                        status: "failed",
                        error: "Instagram API returned no result - post may not have been created",
                        success: false
                    };
                }
            } catch (postError: any) {
                console.error('Error posting to Instagram:', postError);
                return {
                    status: "failed",
                    error: `Failed to post to Instagram: ${postError.message || postError}`,
                    success: false
                };
            }
        } else {
            // For multiple media posts (carousel)
            // Instagram Graph API supports carousel posts but requires different implementation
            // For now, we'll post the first media item and note that carousel support needs enhancement
            console.log('Multiple media detected - posting first item (carousel support coming soon)');

            const firstMedia = media[0];

            try {
                let result;

                if (firstMedia.type === 'video') {
                    result = await postVideo(accessToken, firstMedia.url, content, businessAccountId);
                } else {
                    result = await postImage(accessToken, firstMedia.url, content, businessAccountId);
                }

                if (result && result.id) {
                    return {
                        platformPostId: result.id,
                        status: "published",
                        publishedAt: new Date().toISOString(),
                        url: result.permalink || `https://instagram.com/p/${result.id}`,
                        type: "carousel_post",
                        success: true,
                        note: `Posted first of ${media.length} media items. Full carousel support coming soon.`
                    };
                } else {
                    return {
                        status: "failed",
                        error: "Instagram API returned no result for carousel post",
                        success: false
                    };
                }
            } catch (carouselError: any) {
                console.error('Error posting carousel to Instagram:', carouselError);
                return {
                    status: "failed",
                    error: `Failed to post carousel to Instagram: ${carouselError.message || carouselError}`,
                    success: false
                };
            }
        }

    } catch (error: any) {
        console.error("Instagram API error:", error);

        let errorMessage = "Failed to post to Instagram";

        // Handle specific Instagram API errors
        if (error.error && error.error.message) {
            errorMessage = error.error.message;
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
 * Get Instagram Business Account ID from database
 */
async function getInstagramBusinessAccountId(userId: string): Promise<string | null> {
    try {
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

        return authProvider.providerId;
    } catch (error) {
        console.error("Error retrieving Instagram Business Account ID:", error);
        return null;
    }
}

export async function logPostActivity(userId: string, postId: string): Promise<void> {
    try {
        console.log(`[${new Date().toISOString()}] User ${userId} posted to Instagram: ${postId}`);

        // You can add database logging here if needed
        // await prisma.postActivity.create({
        //     data: {
        //         userId,
        //         postId: postId,
        //         platform: 'instagram',
        //         activityType: 'post_created',
        //         timestamp: new Date()
        //     }
        // });
    } catch (error) {
        console.error('Error logging Instagram post activity:', error);
    }
}
