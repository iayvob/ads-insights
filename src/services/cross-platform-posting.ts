/**
 * Cross-platform posting utility
 * This file helps coordinate posting across multiple platforms and ensure consistent responses
 */

import { PlatformPostingService } from "@/services/platform-posting";
import { SocialPlatform } from "@/validations/posting-types";
import { AuthSession } from "@/validations/types";

// Standardized posting response
export interface PlatformPostResult {
    success: boolean;
    platformPostId?: string;
    mediaId?: string;
    url?: string;
    status?: string;
    error?: any;
    type?: string;
}

export class CrossPlatformPostingService {
    /**
     * Post content to the specified platform with unified error handling
     */
    static async postToPlatform(
        session: AuthSession,
        platform: SocialPlatform,
        content: {
            text: string;
            hashtags?: string[];
            mentions?: string[];
            media?: Array<{
                id: string;
                url: string;
                type: 'image' | 'video';
                mimeType?: string;
                alt?: string;
            }>;
            link?: string;
        },
        options?: {
            scheduling?: {
                publishAt: string;
                timezone: string;
            };
        }
    ): Promise<PlatformPostResult> {
        try {
            // Check for valid session and platform connection
            if (!session || !session.userId) {
                return {
                    success: false,
                    error: "Authentication required"
                };
            }

            // Format content for consistency across platforms
            const formattedContent = this.formatContentForPlatform(content, platform);

            // Call the PlatformPostingService
            const result = await PlatformPostingService.postToPlatform(
                session,
                platform,
                formattedContent
            );

            // Return standardized result
            if (result.success) {
                return {
                    success: true,
                    platformPostId: result.platformPostId,
                    url: result.url,
                    status: "published",
                    type: this.determinePlatformPostType(content.media, platform)
                };
            } else {
                return {
                    success: false,
                    error: result.error || `Unknown error posting to ${platform}`
                };
            }
        } catch (error) {
            console.error(`Error in CrossPlatformPostingService for ${platform}:`, error);

            return {
                success: false,
                error: error instanceof Error ? error.message : `Failed to post to ${platform}`
            };
        }
    }

    /**
     * Format content specifically for each platform
     */
    private static formatContentForPlatform(
        content: any,
        platform: SocialPlatform
    ): any {
        const formattedContent: any = {
            text: content.text || '',
            hashtags: content.hashtags || [],
            mentions: content.mentions || []
        };

        // If media is provided, format it properly
        if (content.media && content.media.length > 0) {
            formattedContent.media = content.media.map((m: any) => ({
                id: m.id,
                url: m.url,
                type: m.type,
                mimeType: m.mimeType
            }));
        }

        // Platform-specific formatting
        switch (platform) {
            case 'twitter':
                // Twitter has a 280 character limit
                if (formattedContent.text.length > 280) {
                    formattedContent.text = formattedContent.text.substring(0, 277) + '...';
                }
                break;

            case 'instagram':
                // Instagram requires media for posts
                if (!formattedContent.media || formattedContent.media.length === 0) {
                    throw new Error('Instagram posts require at least one image or video');
                }
                break;

            case 'facebook':
                // Facebook can include links separately
                if (content.link) {
                    formattedContent.link = content.link;
                }
                break;
        }

        return formattedContent;
    }

    /**
     * Determine the type of post based on content and platform
     */
    private static determinePlatformPostType(
        media: any[] | undefined,
        platform: SocialPlatform
    ): string {
        if (!media || media.length === 0) {
            return 'text_post';
        }

        if (media.length === 1) {
            return media[0].type === 'image' ? 'photo_post' : 'video_post';
        }

        if (platform === 'instagram' && media.length > 1) {
            return 'carousel_post';
        }

        return 'multi_media_post';
    }
}
