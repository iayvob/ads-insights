/**
 * Twitter Configuration Validator
 * 
 * This utility helps validate and diagnose Twitter API configuration issues.
 * Use this to check if your Twitter API setup is correctly configured.
 */

import { env } from '../validations/env';

export interface TwitterConfigStatus {
    oauth2: {
        configured: boolean;
        clientId: boolean;
        clientSecret: boolean;
    };
    oauth1: {
        configured: boolean;
        apiKey: boolean;
        apiSecret: boolean;
    };
    capabilities: {
        textPosting: boolean;
        mediaPosting: boolean;
    };
    recommendations: string[];
}

/**
 * Check the current Twitter API configuration status
 */
export function checkTwitterConfig(): TwitterConfigStatus {
    const oauth2ClientId = !!env.TWITTER_CLIENT_ID;
    const oauth2ClientSecret = !!env.TWITTER_CLIENT_SECRET;
    const oauth1ApiKey = !!env.TWITTER_API_KEY;
    const oauth1ApiSecret = !!env.TWITTER_API_SECRET;

    const oauth2Configured = oauth2ClientId && oauth2ClientSecret;
    const oauth1Configured = oauth1ApiKey && oauth1ApiSecret;

    const recommendations: string[] = [];

    if (!oauth2Configured) {
        recommendations.push(
            'Configure OAuth 2.0 credentials (TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET) for text posting and user authentication'
        );
    }

    if (!oauth1Configured) {
        recommendations.push(
            'Configure OAuth 1.0a credentials (TWITTER_API_KEY, TWITTER_API_SECRET) for media upload support'
        );
    }

    if (oauth2Configured && !oauth1Configured) {
        recommendations.push(
            'Text posting is available. Add OAuth 1.0a credentials to enable media uploads'
        );
    }

    if (!oauth2Configured && oauth1Configured) {
        recommendations.push(
            'OAuth 1.0a is configured but OAuth 2.0 is missing. Add OAuth 2.0 credentials for user authentication'
        );
    }

    if (oauth2Configured && oauth1Configured) {
        recommendations.push(
            'Both OAuth versions are configured. Media posting capability depends on implementing dual OAuth flow'
        );
    }

    return {
        oauth2: {
            configured: oauth2Configured,
            clientId: oauth2ClientId,
            clientSecret: oauth2ClientSecret,
        },
        oauth1: {
            configured: oauth1Configured,
            apiKey: oauth1ApiKey,
            apiSecret: oauth1ApiSecret,
        },
        capabilities: {
            textPosting: oauth2Configured,
            mediaPosting: false, // Currently not supported due to OAuth mismatch
        },
        recommendations,
    };
}

/**
 * Quick check for posting capability
 */
export function canPostToTwitter(hasMedia: boolean = false): {
    canPost: boolean;
    reason?: string;
} {
    const config = checkTwitterConfig();

    if (hasMedia) {
        return {
            canPost: false,
            reason: 'Media posting requires OAuth 1.0a implementation. Currently only text posting is supported.',
        };
    }

    if (!config.capabilities.textPosting) {
        return {
            canPost: false,
            reason: 'Twitter OAuth 2.0 credentials not configured. Please add TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET.',
        };
    }

    return { canPost: true };
}