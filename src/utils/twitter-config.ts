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
 * Generate environment variable template based on missing configuration
 */
export function generateEnvTemplate(): string {
    const config = checkTwitterConfig();
    const lines: string[] = [];

    lines.push('# Twitter API Configuration');
    lines.push('# Add these to your .env.local file');
    lines.push('');

    if (!config.oauth2.configured) {
        lines.push('# OAuth 2.0 (Required for text posting and user authentication)');
        if (!config.oauth2.clientId) {
            lines.push('TWITTER_CLIENT_ID=your_oauth2_client_id_here');
        }
        if (!config.oauth2.clientSecret) {
            lines.push('TWITTER_CLIENT_SECRET=your_oauth2_client_secret_here');
        }
        lines.push('');
    }

    if (!config.oauth1.configured) {
        lines.push('# OAuth 1.0a (Required for media upload support)');
        if (!config.oauth1.apiKey) {
            lines.push('TWITTER_API_KEY=your_api_key_here');
        }
        if (!config.oauth1.apiSecret) {
            lines.push('TWITTER_API_SECRET=your_api_secret_key_here');
        }
        lines.push('');
    }

    lines.push('# Get these credentials from:');
    lines.push('# https://developer.twitter.com/en/portal/dashboard');
    lines.push('# Project Settings > Keys and Tokens');

    return lines.join('\n');
}

/**
 * Display configuration status in a readable format
 */
export function displayConfigStatus(): void {
    const config = checkTwitterConfig();

    console.log('\n🐦 Twitter API Configuration Status\n');

    console.log('OAuth 2.0 (Text Posting & Auth):');
    console.log(`  Client ID: ${config.oauth2.clientId ? '✅' : '❌'}`);
    console.log(`  Client Secret: ${config.oauth2.clientSecret ? '✅' : '❌'}`);
    console.log(`  Status: ${config.oauth2.configured ? '✅ Configured' : '❌ Missing'}\n`);

    console.log('OAuth 1.0a (Media Upload):');
    console.log(`  API Key: ${config.oauth1.apiKey ? '✅' : '❌'}`);
    console.log(`  API Secret: ${config.oauth1.apiSecret ? '✅' : '❌'}`);
    console.log(`  Status: ${config.oauth1.configured ? '✅ Configured' : '❌ Missing'}\n`);

    console.log('Platform Capabilities:');
    console.log(`  Text Posting: ${config.capabilities.textPosting ? '✅ Available' : '❌ Unavailable'}`);
    console.log(`  Media Posting: ${config.capabilities.mediaPosting ? '✅ Available' : '❌ Requires Implementation'}\n`);

    if (config.recommendations.length > 0) {
        console.log('📝 Recommendations:');
        config.recommendations.forEach((rec, index) => {
            console.log(`  ${index + 1}. ${rec}`);
        });
        console.log();
    }

    if (!config.oauth2.configured || !config.oauth1.configured) {
        console.log('🔧 Environment Template:');
        console.log(generateEnvTemplate());
    }
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