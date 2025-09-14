// Helper Functions for Facebook Route - Following the documentation exactly
import { NextRequest } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { prisma } from "@/config/database/prisma";
import { postTextOrLink, postImage, postVideo } from "@/lib/facebook";

export interface FacebookConnection {
    accessToken: string;
    userId: string;
    pageId: string;
    connected: boolean;
    expiresAt?: Date;
    pageName?: string;
    scopes?: string[];
}

export async function getFacebookConnection(request: NextRequest): Promise<FacebookConnection | null> {
    try {
        const session = await ServerSessionService.getSession(request);
        if (!session?.userId) {
            return null;
        }

        // Get Facebook auth provider from database
        const authProvider = await prisma.authProvider.findFirst({
            where: {
                userId: session.userId,
                provider: 'facebook'
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
            pageId: authProvider.advertisingAccountId || '', // Use advertising account ID as page ID
            connected: true,
            expiresAt: authProvider.expiresAt || undefined,
            pageName: authProvider.username || ''
        };
    } catch (error) {
        console.error("Error fetching Facebook connection:", error);
        return null;
    }
}

export async function validateFacebookAccess(userId: string): Promise<boolean> {
    try {
        // Check if user has Facebook provider saved in the database
        const authProvider = await prisma.authProvider.findFirst({
            where: {
                userId,
                provider: 'facebook'
            }
        });

        return !!authProvider && !!authProvider.accessToken && !!authProvider.advertisingAccountId;
    } catch (error) {
        console.error('Error validating Facebook access:', error);
        return false;
    }
}

export async function postToFacebook(params: {
    content: string;
    media?: Array<{
        id: string;
        url: string;
        type: 'image' | 'video';
        mimeType?: string;
        alt?: string;
    }>;
    pageId: string;
    accessToken: string;
}) {
    const { content, media, pageId, accessToken } = params;

    try {
        console.log(`Posting to Facebook Page ${pageId} with content length: ${content.length}`);

        // Facebook supports text-only posts, single media posts, and multi-media posts
        if (!media || media.length === 0) {
            // Text-only post
            console.log('Creating text-only post on Facebook');

            try {
                const result = await postTextOrLink(pageId, accessToken, content);

                if (result && (result as any).id) {
                    const postId = (result as any).id;
                    console.log(`Facebook text post created successfully: ${postId}`);

                    return {
                        platformPostId: postId,
                        status: "published",
                        publishedAt: new Date().toISOString(),
                        url: `https://facebook.com/${postId}`,
                        type: "text_post",
                        success: true
                    };
                } else {
                    console.error('Facebook API returned no result for text post');
                    return {
                        status: "failed",
                        error: "Facebook API returned no result - post may not have been created",
                        success: false
                    };
                }
            } catch (textError: any) {
                console.error('Error posting text to Facebook:', textError);
                return {
                    status: "failed",
                    error: `Failed to post text to Facebook: ${textError.message || textError}`,
                    success: false
                };
            }
        } else if (media.length === 1) {
            // Single media post
            const mediaItem = media[0];
            console.log(`Posting single ${mediaItem.type} to Facebook`);

            try {
                let result;

                if (mediaItem.type === 'video') {
                    result = await postVideo(pageId, accessToken, mediaItem.url, content);
                } else {
                    result = await postImage(pageId, accessToken, mediaItem.url, content);
                }

                if (result && (result as any).id) {
                    const postId = (result as any).id;
                    console.log(`Facebook ${mediaItem.type} post created successfully: ${postId}`);

                    return {
                        platformPostId: postId,
                        status: "published",
                        publishedAt: new Date().toISOString(),
                        url: `https://facebook.com/${postId}`,
                        type: mediaItem.type === 'video' ? "video_post" : "image_post",
                        success: true
                    };
                } else {
                    console.error(`Facebook API returned no result for ${mediaItem.type} post`);
                    return {
                        status: "failed",
                        error: `Facebook API returned no result for ${mediaItem.type} post`,
                        success: false
                    };
                }
            } catch (mediaError: any) {
                console.error(`Error posting ${mediaItem.type} to Facebook:`, mediaError);
                return {
                    status: "failed",
                    error: `Failed to post ${mediaItem.type} to Facebook: ${mediaError.message || mediaError}`,
                    success: false
                };
            }
        } else {
            // Multiple media posts - Facebook supports this but requires different implementation
            // For now, post the first media item with a note about multi-media support
            console.log('Multiple media detected - posting first item (full multi-media support coming soon)');

            const firstMedia = media[0];

            try {
                let result;

                if (firstMedia.type === 'video') {
                    result = await postVideo(pageId, accessToken, firstMedia.url, content);
                } else {
                    result = await postImage(pageId, accessToken, firstMedia.url, content);
                }

                if (result && (result as any).id) {
                    const postId = (result as any).id;

                    return {
                        platformPostId: postId,
                        status: "published",
                        publishedAt: new Date().toISOString(),
                        url: `https://facebook.com/${postId}`,
                        type: "multi_media_post",
                        success: true,
                        note: `Posted first of ${media.length} media items. Full multi-media support coming soon.`
                    };
                } else {
                    return {
                        status: "failed",
                        error: "Facebook API returned no result for multi-media post",
                        success: false
                    };
                }
            } catch (multiMediaError: any) {
                console.error('Error posting multi-media to Facebook:', multiMediaError);
                return {
                    status: "failed",
                    error: `Failed to post multi-media to Facebook: ${multiMediaError.message || multiMediaError}`,
                    success: false
                };
            }
        }

    } catch (error: any) {
        console.error("Facebook API error:", error);

        let errorMessage = "Failed to post to Facebook";

        // Handle specific Facebook API errors
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
export async function logPostActivity(userId: string, postId: string): Promise<void> {
    try {
        console.log(`[${new Date().toISOString()}] User ${userId} posted to Facebook: ${postId}`);

        // You can add database logging here if needed
        // await prisma.postActivity.create({
        //     data: {
        //         userId,
        //         postId: postId,
        //         platform: 'facebook',
        //         activityType: 'post_created',
        //         timestamp: new Date()
        //     }
        // });
    } catch (error) {
        console.error('Error logging Facebook post activity:', error);
    }
}
