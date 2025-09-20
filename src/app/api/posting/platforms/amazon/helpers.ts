/**
 * Amazon Posting Helpers
 * Utility functions for Amazon SP-API posting operations
 */

import {
    AmazonPostContent,
    AmazonMediaAsset,
    PostingErrorCodes
} from '@/validations/posting-types';

/**
 * Validate Amazon post content
 */
export function validateAmazonContent(content: AmazonPostContent): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Headline validation
    if (!content.headline || content.headline.trim().length === 0) {
        errors.push('Post headline cannot be empty');
    }

    if (content.headline && content.headline.length > 80) {
        errors.push('Post headline cannot exceed 80 characters');
    }

    // Body text validation
    if (!content.bodyText || content.bodyText.trim().length === 0) {
        errors.push('Post body text cannot be empty');
    }

    if (content.bodyText && content.bodyText.length > 500) {
        errors.push('Post body text cannot exceed 500 characters');
    }

    // Brand content validation
    if (content.brandContent) {
        const { brandName, brandStoryTitle } = content.brandContent;

        // Brand validation
        if (!brandName || brandName.trim().length === 0) {
            errors.push('Brand name is required');
        }

        if (brandName && brandName.length > 100) {
            errors.push('Brand name cannot exceed 100 characters');
        }

        // Brand story title validation
        if (brandStoryTitle && brandStoryTitle.length > 50) {
            errors.push('Brand story title cannot exceed 50 characters');
        }
    }

    // Products validation
    if (!content.products || content.products.length === 0) {
        errors.push('At least one product is required');
    }

    if (content.products && content.products.length > 5) {
        errors.push('Cannot link more than 5 products per post');
    }

    // Validate ASIN format for each product
    content.products?.forEach((product, index) => {
        if (!isValidASIN(product.asin)) {
            errors.push(`Invalid ASIN format at position ${index + 1}: ${product.asin}`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate Amazon ASIN format
 */
export function isValidASIN(asin: string): boolean {
    const asinRegex = /^[A-Z0-9]{10}$/;
    return asinRegex.test(asin);
}

/**
 * Validate Amazon media asset
 */
export function validateMediaAsset(asset: AmazonMediaAsset): string[] {
    const errors: string[] = [];

    if (!asset.mediaType) {
        errors.push('Media type is required');
    }

    if (!['IMAGE', 'VIDEO'].includes(asset.mediaType)) {
        errors.push('Media type must be IMAGE or VIDEO');
    }

    if (!asset.fileName) {
        errors.push('Filename is required');
    }

    if (asset.fileSize && asset.fileSize > 500 * 1024 * 1024) { // 500MB
        errors.push('File size cannot exceed 500MB');
    }

    // Image-specific validation
    if (asset.mediaType === 'IMAGE') {
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (asset.mimeType && !allowedImageTypes.includes(asset.mimeType)) {
            errors.push('Image must be JPEG, PNG, or WebP format');
        }
    }

    // Video-specific validation
    if (asset.mediaType === 'VIDEO') {
        const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
        if (asset.mimeType && !allowedVideoTypes.includes(asset.mimeType)) {
            errors.push('Video must be MP4, MOV, or AVI format');
        }

        if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) { // 100MB for videos
            errors.push('Video size cannot exceed 100MB');
        }
    }

    return errors;
}

/**
 * Format post content for Amazon API
 */
export function formatPostForAmazon(content: AmazonPostContent): AmazonPostContent {
    return {
        headline: content.headline.trim(),
        bodyText: content.bodyText.trim(),
        callToAction: content.callToAction,
        products: content.products,
        targetMarketplace: content.targetMarketplace,
        brandContent: content.brandContent,
        tags: content.tags?.slice(0, 10) // Limit to 10 tags
    };
}

/**
 * Convert media files to Amazon media assets
 */
export function convertToAmazonMediaAssets(mediaFiles: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    mimeType: string;
}>): AmazonMediaAsset[] {
    return mediaFiles.map((media, index) => ({
        assetId: `asset_${Date.now()}_${index}`,
        mediaType: media.type.toUpperCase() as 'IMAGE' | 'VIDEO',
        url: media.url,
        fileName: `media_${Date.now()}_${index}.${media.type === 'video' ? 'mp4' : 'jpg'}`,
        fileSize: 0, // Would be calculated in real implementation
        dimensions: { width: 1080, height: 1080 }, // Default dimensions
        mimeType: media.mimeType,
        status: 'READY' as const
    }));
}

/**
 * Get error message for specific error codes
 */
export function getAmazonErrorMessage(errorCode: typeof PostingErrorCodes[keyof typeof PostingErrorCodes]): string {
    switch (errorCode) {
        case PostingErrorCodes.PLATFORM_API_ERROR:
            return 'Amazon API error occurred';
        case PostingErrorCodes.INVALID_CONTENT:
            return 'Invalid content provided';
        case PostingErrorCodes.PLATFORM_NOT_CONNECTED:
            return 'Amazon account not connected';
        case PostingErrorCodes.INSUFFICIENT_PERMISSIONS:
            return 'Insufficient permissions for Amazon posting';
        default:
            return 'An unknown error occurred';
    }
}

/**
 * Handle Amazon API errors
 */
export function handleAmazonError(error: any): {
    code: typeof PostingErrorCodes[keyof typeof PostingErrorCodes];
    message: string;
} {
    if (error?.response?.status === 401) {
        return {
            code: PostingErrorCodes.PLATFORM_NOT_CONNECTED,
            message: 'Amazon authentication failed'
        };
    } else if (error?.response?.status === 400) {
        return {
            code: PostingErrorCodes.INVALID_CONTENT,
            message: error?.response?.data?.message || 'Invalid content provided'
        };
    } else if (error?.response?.status === 429) {
        return {
            code: PostingErrorCodes.RATE_LIMIT_EXCEEDED,
            message: 'Rate limit exceeded for Amazon API'
        };
    } else {
        return {
            code: PostingErrorCodes.PLATFORM_API_ERROR,
            message: error?.message || 'Amazon API error occurred'
        };
    }
}