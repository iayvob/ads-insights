import { env } from '@/validations/env';
import { TwitterApi } from 'twitter-api-v2';
import crypto from 'crypto';

// X API v2 OAuth 2.0 Client Setup
export function getXApiClient() {
    return new TwitterApi({
        clientId: env.TWITTER_CLIENT_ID!,
        clientSecret: env.TWITTER_CLIENT_SECRET!, // Only for confidential clients
    });
}

export function getAuthenticatedXClient(accessToken: string) {
    return new TwitterApi(accessToken);
}

// Legacy support for OAuth 1.0a (deprecated - only for existing connections)
export function getTwitterAppClient() {
    return new TwitterApi({
        appKey: env.TWITTER_API_KEY!,
        appSecret: env.TWITTER_API_SECRET!,
    });
}

export function getTwitterUserClient(accessToken: string, accessSecret?: string) {
    // For OAuth 2.0 Bearer token authentication (X API v2) - PREFERRED
    if (!accessSecret) {
        return new TwitterApi(accessToken);
    }

    // For OAuth 1.0a authentication (legacy support only)
    return new TwitterApi({
        appKey: env.TWITTER_API_KEY!,
        appSecret: env.TWITTER_API_SECRET!,
        accessToken,
        accessSecret,
    });
}

export function getTwitterV2Client(bearerToken: string) {
    return new TwitterApi(bearerToken);
}

// OAuth 2.0 with PKCE Helper Functions
export interface PKCEChallenge {
    codeVerifier: string;
    codeChallenge: string;
    state: string;
}

export function generatePKCEChallenge(): PKCEChallenge {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
    const state = crypto.randomBytes(16).toString('hex');

    return {
        codeVerifier,
        codeChallenge,
        state
    };
}

export function generateXAuthUrl(redirectUri: string): { url: string; pkce: PKCEChallenge } {
    const pkce = generatePKCEChallenge();

    const scopes = [
        'tweet.read',
        'tweet.write',
        'users.read',
        'media.write', // Required for media upload
        'offline.access' // For refresh tokens
    ];

    // Manual OAuth 2.0 URL construction since twitter-api-v2 may not support all PKCE parameters
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: env.TWITTER_CLIENT_ID!,
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        state: pkce.state,
        code_challenge: pkce.codeChallenge,
        code_challenge_method: 'S256'
    });

    const url = `https://x.com/i/oauth2/authorize?${params.toString()}`;

    return {
        url,
        pkce
    };
}

export async function exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string
) {
    const client = getXApiClient();

    return await client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri,
    });
}

export async function refreshAccessToken(refreshToken: string) {
    const client = getXApiClient();

    return await client.refreshOAuth2Token(refreshToken);
}