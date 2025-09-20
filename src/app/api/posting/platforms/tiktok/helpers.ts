/**
 * TikTok Posting Helpers
 * Utility functions for TikTok Business API posting operations
 */

import {
    PostingErrorCodes
} from '@/validations/posting-types';

/**
 * TikTok video validation limits
 */
export const TIKTOK_LIMITS = {
    TITLE_MAX_LENGTH: 150,
    DESCRIPTION_MAX_LENGTH: 2200,
    MAX_HASHTAGS: 100,
    MAX_VIDEO_DURATION_SEC: 600, // 10 minutes
    MAX_PHOTO_COUNT: 35,
    MAX_VIDEO_SIZE_MB: 287,
    MAX_PHOTO_SIZE_MB: 50,
    SUPPORTED_VIDEO_FORMATS: ['mp4', 'mov', 'mpeg', 'flv', 'webm', '3gp'],
    SUPPORTED_PHOTO_FORMATS: ['jpeg', 'jpg', 'gif', 'tiff', 'bmp', 'webp'],
} as const;

/**
 * TikTok content interface for validation
 */
export interface TikTokContent {
    text?: string;
    hashtags?: string[];
    mentions?: string[];
    advertiserId?: string;
    videoProperties?: {
        title?: string;
        description?: string;
        tags?: string[];
        category?: string;
        language?: string;
        thumbnailTime?: number;
    };
    privacy?: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY';
    allowComments?: boolean;
    allowDuet?: boolean;
    allowStitch?: boolean;
    brandedContent?: boolean;
    promotionalContent?: boolean;
}

/**
 * TikTok media asset interface
 */
export interface TikTokMediaAsset {
    id: string;
    url: string;
    type: 'image' | 'video';
    mimeType: string;
    size: number;
    duration?: number;
    dimensions?: {
        width: number;
        height: number;
    };
}

/**
 * Validate TikTok post content
 */
export function validateTikTokContent(content: TikTokContent, media?: TikTokMediaAsset[]): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Advertiser ID validation
    if (!content.advertiserId || content.advertiserId.trim().length === 0) {
        errors.push('TikTok advertiser ID is required');
    }

    // Text content validation
    if (content.text && content.text.length > TIKTOK_LIMITS.DESCRIPTION_MAX_LENGTH) {
        errors.push(`Caption cannot exceed ${TIKTOK_LIMITS.DESCRIPTION_MAX_LENGTH} characters`);
    }

    // Video properties validation
    if (content.videoProperties) {
        const { title, description, tags } = content.videoProperties;

        if (title && title.length > TIKTOK_LIMITS.TITLE_MAX_LENGTH) {
            errors.push(`Video title cannot exceed ${TIKTOK_LIMITS.TITLE_MAX_LENGTH} characters`);
        }

        if (description && description.length > TIKTOK_LIMITS.DESCRIPTION_MAX_LENGTH) {
            errors.push(`Video description cannot exceed ${TIKTOK_LIMITS.DESCRIPTION_MAX_LENGTH} characters`);
        }

        if (tags && tags.length > 5) {
            errors.push('Cannot have more than 5 tags per video');
        }
    }

    // Hashtags validation
    if (content.hashtags && content.hashtags.length > TIKTOK_LIMITS.MAX_HASHTAGS) {
        errors.push(`Cannot have more than ${TIKTOK_LIMITS.MAX_HASHTAGS} hashtags`);
    }

    // Media validation
    if (!media || media.length === 0) {
        errors.push('TikTok posts require at least one media file');
    }

    if (media) {
        media.forEach((asset, index) => {
            const mediaErrors = validateTikTokMediaAsset(asset);
            if (mediaErrors.length > 0) {
                errors.push(`Media ${index + 1}: ${mediaErrors.join(', ')}`);
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate TikTok media asset
 */
export function validateTikTokMediaAsset(asset: TikTokMediaAsset): string[] {
    const errors: string[] = [];

    // File type validation
    if (asset.type === 'video') {
        const fileExtension = asset.url.split('.').pop()?.toLowerCase() || '';
        if (!(TIKTOK_LIMITS.SUPPORTED_VIDEO_FORMATS as readonly string[]).includes(fileExtension)) {
            errors.push(`Unsupported video format: ${fileExtension}. Supported formats: ${TIKTOK_LIMITS.SUPPORTED_VIDEO_FORMATS.join(', ')}`);
        }

        // Video size validation
        if (asset.size > TIKTOK_LIMITS.MAX_VIDEO_SIZE_MB * 1024 * 1024) {
            errors.push(`Video size cannot exceed ${TIKTOK_LIMITS.MAX_VIDEO_SIZE_MB}MB`);
        }

        // Video duration validation
        if (asset.duration && asset.duration > TIKTOK_LIMITS.MAX_VIDEO_DURATION_SEC) {
            errors.push(`Video duration cannot exceed ${TIKTOK_LIMITS.MAX_VIDEO_DURATION_SEC} seconds`);
        }
    } else if (asset.type === 'image') {
        const fileExtension = asset.url.split('.').pop()?.toLowerCase() || '';
        if (!(TIKTOK_LIMITS.SUPPORTED_PHOTO_FORMATS as readonly string[]).includes(fileExtension)) {
            errors.push(`Unsupported image format: ${fileExtension}. Supported formats: ${TIKTOK_LIMITS.SUPPORTED_PHOTO_FORMATS.join(', ')}`);
        }

        // Image size validation
        if (asset.size > TIKTOK_LIMITS.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
            errors.push(`Image size cannot exceed ${TIKTOK_LIMITS.MAX_PHOTO_SIZE_MB}MB`);
        }
    }

    return errors;
}

/**
 * Format TikTok content for API submission
 */
export function formatTikTokContent(content: TikTokContent): TikTokContent {
    return {
        text: content.text?.trim(),
        hashtags: content.hashtags?.slice(0, TIKTOK_LIMITS.MAX_HASHTAGS),
        mentions: content.mentions,
        advertiserId: content.advertiserId?.trim(),
        videoProperties: content.videoProperties ? {
            title: content.videoProperties.title?.substring(0, TIKTOK_LIMITS.TITLE_MAX_LENGTH),
            description: content.videoProperties.description?.substring(0, TIKTOK_LIMITS.DESCRIPTION_MAX_LENGTH),
            tags: content.videoProperties.tags?.slice(0, 5),
            category: content.videoProperties.category,
            language: content.videoProperties.language || 'en',
            thumbnailTime: content.videoProperties.thumbnailTime
        } : undefined,
        privacy: content.privacy || 'PUBLIC',
        allowComments: content.allowComments ?? true,
        allowDuet: content.allowDuet ?? true,
        allowStitch: content.allowStitch ?? true,
        brandedContent: content.brandedContent ?? false,
        promotionalContent: content.promotionalContent ?? false
    };
}

/**
 * Get error message for TikTok-specific error codes
 */
export function getTikTokErrorMessage(errorCode: typeof PostingErrorCodes[keyof typeof PostingErrorCodes]): string {
    switch (errorCode) {
        case PostingErrorCodes.TIKTOK_BUSINESS_API_ERROR:
            return 'TikTok Business API error occurred';
        case PostingErrorCodes.TIKTOK_VIDEO_UPLOAD_FAILED:
            return 'Failed to upload video to TikTok';
        case PostingErrorCodes.TIKTOK_INVALID_VIDEO_FORMAT:
            return 'Invalid video format for TikTok';
        case PostingErrorCodes.TIKTOK_VIDEO_TOO_LARGE:
            return 'Video file too large for TikTok';
        case PostingErrorCodes.TIKTOK_VIDEO_TOO_LONG:
            return 'Video duration too long for TikTok';
        case PostingErrorCodes.TIKTOK_BUSINESS_ACCOUNT_REQUIRED:
            return 'TikTok Business account required for posting';
        case PostingErrorCodes.TIKTOK_ADVERTISER_ID_REQUIRED:
            return 'TikTok advertiser ID is required';
        case PostingErrorCodes.PLATFORM_NOT_CONNECTED:
            return 'TikTok account not connected';
        case PostingErrorCodes.INSUFFICIENT_PERMISSIONS:
            return 'Insufficient permissions for TikTok posting';
        default:
            return 'TikTok posting error occurred';
    }
}

/**
 * Handle TikTok API errors
 */
export function handleTikTokError(error: any): {
    code: typeof PostingErrorCodes[keyof typeof PostingErrorCodes];
    message: string;
} {
    if (error?.response?.status === 401) {
        return {
            code: PostingErrorCodes.PLATFORM_NOT_CONNECTED,
            message: 'TikTok authentication failed'
        };
    } else if (error?.response?.status === 400) {
        return {
            code: PostingErrorCodes.INVALID_CONTENT,
            message: error?.response?.data?.message || 'Invalid content provided for TikTok'
        };
    } else if (error?.response?.status === 429) {
        return {
            code: PostingErrorCodes.RATE_LIMIT_EXCEEDED,
            message: 'Rate limit exceeded for TikTok API'
        };
    } else if (error?.message?.includes('video')) {
        return {
            code: PostingErrorCodes.TIKTOK_VIDEO_UPLOAD_FAILED,
            message: 'Failed to upload video to TikTok'
        };
    } else {
        return {
            code: PostingErrorCodes.TIKTOK_BUSINESS_API_ERROR,
            message: error?.message || 'TikTok API error occurred'
        };
    }
}