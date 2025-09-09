/**
 * Common error handling for platform posting APIs
 */

import { NextResponse } from "next/server";

export enum PlatformErrorCodes {
    AUTH_ERROR = "PLATFORM_AUTH_ERROR",
    RATE_LIMIT = "PLATFORM_RATE_LIMIT",
    CONTENT_ERROR = "PLATFORM_CONTENT_ERROR",
    MEDIA_ERROR = "PLATFORM_MEDIA_ERROR",
    PERMISSION_ERROR = "PLATFORM_PERMISSION_ERROR",
    API_ERROR = "PLATFORM_API_ERROR",
    INTERNAL_ERROR = "INTERNAL_SERVER_ERROR"
}

export type PlatformError = {
    code: PlatformErrorCodes;
    message: string;
    details?: any;
    status: number;
}

export function getStatusCodeForError(error: string | object): number {
    if (typeof error === 'string') {
        if (error.includes('permission') || error.includes('access') || error.includes('denied')) {
            return 403;
        } else if (error.includes('not found') || error.includes('does not exist')) {
            return 404;
        } else if (error.includes('limit') || error.includes('throttle') || error.includes('too many')) {
            return 429;
        } else if (error.includes('invalid') || error.includes('missing')) {
            return 400;
        } else if (error.includes('unauthorized') || error.includes('token') || error.includes('login')) {
            return 401;
        }
    } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        if (errorObj.type === 'OAuthException') {
            return 401;
        } else if (errorObj.code === 190 || errorObj.code === 104) {
            return 401; // Facebook expired token
        } else if (errorObj.code === 4 || errorObj.code === 32) {
            return 401; // Twitter auth error
        } else if (errorObj.code === 88 || errorObj.code === 185) {
            return 429; // Twitter rate limit
        }
    }

    // Default error status
    return 500;
}

export function createErrorResponse(error: PlatformError): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: error.code,
            message: error.message,
            details: error.details
        },
        { status: error.status }
    );
}

/**
 * Handle common platform API errors 
 */
export function handlePlatformError(error: any, platform: string): NextResponse {
    console.error(`${platform.toUpperCase()} API Error:`, error);

    let errorResponse: PlatformError;

    if (error.message && error.message.includes('rate limit') || error.code === 88) {
        errorResponse = {
            code: PlatformErrorCodes.RATE_LIMIT,
            message: `${platform} rate limit exceeded. Please try again later.`,
            status: 429
        };
    } else if (error.message && (error.message.includes('auth') ||
        error.message.includes('token') ||
        error.message.includes('login') ||
        error.code === 190)) {
        errorResponse = {
            code: PlatformErrorCodes.AUTH_ERROR,
            message: `Authentication error with ${platform}. Please reconnect your account.`,
            status: 401
        };
    } else if (error.message && (error.message.includes('permission') ||
        error.message.includes('access'))) {
        errorResponse = {
            code: PlatformErrorCodes.PERMISSION_ERROR,
            message: `You don't have permission to perform this action on ${platform}.`,
            status: 403
        };
    } else if (error.message && (error.message.includes('media') ||
        error.message.includes('image') ||
        error.message.includes('video'))) {
        errorResponse = {
            code: PlatformErrorCodes.MEDIA_ERROR,
            message: `Media error when posting to ${platform}: ${error.message}`,
            status: 400
        };
    } else {
        // Default error
        errorResponse = {
            code: PlatformErrorCodes.INTERNAL_ERROR,
            message: `Failed to post to ${platform}: ${error.message || "Unknown error"}`,
            status: 500
        };
    }

    return createErrorResponse(errorResponse);
}
