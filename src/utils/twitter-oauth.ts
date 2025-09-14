/**
 * Twitter OAuth 1.0a Signature Generation Utility
 * 
 * This utility handles OAuth 1.0a signature generation for Twitter v1.1 API calls,
 * specifically for media upload endpoints that require this authentication method.
 */

import crypto from 'crypto';

export interface TwitterOAuth1Credentials {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessTokenSecret: string;
}

export interface OAuthSignature {
    signature: string;
    authorizationHeader: string;
}

/**
 * Generate OAuth 1.0a signature for Twitter API requests
 */
export function generateOAuthSignature(
    method: string,
    url: string,
    parameters: Record<string, string>,
    credentials: TwitterOAuth1Credentials
): OAuthSignature {
    // Step 1: Generate OAuth parameters
    const oauthParams = {
        oauth_consumer_key: credentials.consumerKey,
        oauth_token: credentials.accessToken,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_nonce: generateNonce(),
        oauth_version: '1.0'
    };

    // Step 2: Combine OAuth parameters with request parameters
    const allParams: Record<string, string> = { ...parameters, ...oauthParams };

    // Step 3: Create parameter string
    const parameterString = Object.keys(allParams)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
        .join('&');

    // Step 4: Create signature base string
    const signatureBaseString = [
        method.toUpperCase(),
        encodeURIComponent(url),
        encodeURIComponent(parameterString)
    ].join('&');

    // Step 5: Create signing key
    const signingKey = [
        encodeURIComponent(credentials.consumerSecret),
        encodeURIComponent(credentials.accessTokenSecret)
    ].join('&');

    // Step 6: Generate signature
    const signature = crypto
        .createHmac('sha1', signingKey)
        .update(signatureBaseString)
        .digest('base64');

    // Step 7: Create Authorization header
    const authorizationHeader = createAuthorizationHeader({
        ...oauthParams,
        oauth_signature: signature
    });

    return {
        signature,
        authorizationHeader
    };
}

/**
 * Generate a random nonce for OAuth requests
 */
function generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Create OAuth Authorization header
 */
function createAuthorizationHeader(oauthParams: Record<string, string>): string {
    const headerParams = Object.keys(oauthParams)
        .sort()
        .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
        .join(', ');

    return `OAuth ${headerParams}`;
}

/**
 * Validate OAuth 1.0a credentials
 */
export function validateOAuth1Credentials(credentials: Partial<TwitterOAuth1Credentials>): credentials is TwitterOAuth1Credentials {
    return !!(
        credentials.consumerKey &&
        credentials.consumerSecret &&
        credentials.accessToken &&
        credentials.accessTokenSecret
    );
}

/**
 * Create OAuth-authenticated fetch request for Twitter v1.1 API
 */
export async function createTwitterOAuth1Request(
    method: string,
    url: string,
    credentials: TwitterOAuth1Credentials,
    body?: FormData | URLSearchParams
): Promise<Response> {
    // Extract query parameters from URL
    const urlObj = new URL(url);
    const queryParams: Record<string, string> = {};

    urlObj.searchParams.forEach((value, key) => {
        queryParams[key] = value;
    });

    // Generate OAuth signature
    const { authorizationHeader } = generateOAuthSignature(
        method,
        `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`,
        queryParams,
        credentials
    );

    // Create request headers
    const headers: HeadersInit = {
        'Authorization': authorizationHeader
    };

    // Don't set Content-Type for FormData - let browser set it with boundary
    if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    // Make the request
    return fetch(url, {
        method,
        headers,
        body
    });
}

/**
 * Helper function to make Twitter v1.1 media upload requests
 */
export async function twitterV1MediaRequest(
    endpoint: string,
    credentials: TwitterOAuth1Credentials,
    body?: FormData | URLSearchParams
): Promise<Response> {
    return createTwitterOAuth1Request('POST', endpoint, credentials, body);
}