import { NextRequest, NextResponse } from 'next/server';
import { checkTwitterConfig, canPostToTwitter } from '@/utils/twitter-config';

/**
 * API endpoint to check Twitter configuration status
 * GET /api/config/twitter
 */
export async function GET(request: NextRequest) {
    try {
        const config = checkTwitterConfig();
        const textPostingCapability = canPostToTwitter(false);
        const mediaPostingCapability = canPostToTwitter(true);

        return NextResponse.json({
            success: true,
            config,
            capabilities: {
                textPosting: textPostingCapability,
                mediaPosting: mediaPostingCapability,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error checking Twitter configuration:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to check Twitter configuration',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}