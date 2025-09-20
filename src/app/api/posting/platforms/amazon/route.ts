/**
 * Amazon Posting API Route
 * Handles Amazon Posts creation via SP-API
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlatformPostingService } from '@/services/platform-posting';
import { handlePlatformError } from '../common/error-handler';
import {
    PostingErrorCodes,
    type AmazonPostContent,
    type AmazonBrandContent
} from '@/validations/posting-types';
import {
    validateAmazonContent,
    convertToAmazonMediaAssets,
    handleAmazonError
} from './helpers';
import { authenticateRequest } from '@/config/middleware/auth';

export async function POST(request: NextRequest) {
    try {
        // Get user session
        const authResult = await authenticateRequest(request);
        if (!authResult.success || !authResult.user?.userId) {
            return NextResponse.json(
                {
                    error: 'Authentication required',
                    code: PostingErrorCodes.PLATFORM_NOT_CONNECTED
                },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const {
            content,
            mediaFiles,
            hashtags,
            amazonContent,
            scheduledAt
        } = body;

        // Validate Amazon-specific content
        if (!amazonContent) {
            return NextResponse.json(
                {
                    error: 'Amazon content is required for Amazon posting',
                    code: PostingErrorCodes.INVALID_CONTENT
                },
                { status: 400 }
            );
        }

        if (!amazonContent.brandContent?.brandName) {
            return NextResponse.json(
                {
                    error: 'Brand name is required for Amazon posting',
                    code: PostingErrorCodes.INVALID_CONTENT
                },
                { status: 400 }
            );
        }

        if (!amazonContent.products || amazonContent.products.length === 0) {
            return NextResponse.json(
                {
                    error: 'At least one product is required for Amazon posting',
                    code: PostingErrorCodes.INVALID_CONTENT
                },
                { status: 400 }
            );
        }

        if (!content || content.trim().length === 0) {
            return NextResponse.json(
                {
                    error: 'Post content cannot be empty',
                    code: PostingErrorCodes.INVALID_CONTENT
                },
                { status: 400 }
            );
        }

        // Prepare Amazon post content
        const amazonPostContent: AmazonPostContent = {
            headline: amazonContent.headline || content.substring(0, 80),
            bodyText: content.substring(0, 500),
            callToAction: amazonContent.callToAction || 'SHOP_NOW',
            products: amazonContent.products,
            targetMarketplace: amazonContent.targetMarketplace || {
                id: 'ATVPDKIKX0DER',
                name: 'Amazon.com',
                countryCode: 'US',
                currency: 'USD',
                domain: 'https://www.amazon.com'
            },
            brandContent: amazonContent.brandContent,
            tags: hashtags
        };

        // Validate the content
        const validation = validateAmazonContent(amazonPostContent);
        if (!validation.isValid) {
            return NextResponse.json(
                {
                    error: 'Amazon content validation failed',
                    details: validation.errors,
                    code: PostingErrorCodes.INVALID_CONTENT
                },
                { status: 400 }
            );
        }

        // Convert media files to Amazon format
        const amazonMediaAssets = mediaFiles ? convertToAmazonMediaAssets(mediaFiles) : [];

        // Create a mock session object for the platform posting service
        const session = {
            userId: authResult.user.userId,
            connectedPlatforms: {
                amazon: {
                    account: {
                        userId: authResult.user.userId,
                        username: 'amazon_seller',
                        email: authResult.user.email || ''
                    },
                    account_tokens: {
                        access_token: 'mock_access_token',
                        refresh_token: 'mock_refresh_token',
                        expires_at: Date.now() + 3600000
                    }
                }
            }
        };

        // Prepare posting content for platform service
        const postingContent = {
            text: content,
            media: mediaFiles || [],
            hashtags: hashtags || [],
            brandContent: amazonPostContent.brandContent,
            productASINs: amazonPostContent.products?.map(p => p.asin) || []
        };

        // Post to Amazon using the platform posting service
        const result = await PlatformPostingService.postToPlatform(
            session,
            'amazon',
            postingContent
        );

        if (result.success) {
            return NextResponse.json({
                success: true,
                postId: result.platformPostId,
                url: result.url,
                message: 'Successfully posted to Amazon'
            });
        } else {
            const errorResult = handleAmazonError(new Error(result.error));
            return NextResponse.json(
                {
                    error: errorResult.message,
                    code: errorResult.code
                },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Amazon posting error:', error);

        const errorResult = handleAmazonError(error);
        return NextResponse.json(
            {
                error: errorResult.message,
                code: errorResult.code
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        platform: 'amazon',
        status: 'available',
        features: ['posts', 'brand_content', 'product_links'],
        limits: {
            maxProducts: 5,
            maxMediaFiles: 10,
            maxHeadlineLength: 80,
            maxBodyLength: 500
        }
    });
}