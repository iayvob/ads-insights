import { NextRequest } from "next/server"

// Platform-specific rate limiting configurations based on API limits
export interface PlatformRateLimitConfig {
  windowMs: number
  maxRequests: number
  burstLimit?: number // For burst allowances
  resetTime?: number
}

// Rate limiting configurations for each platform (based on their latest API limits)
export const PLATFORM_RATE_LIMITS: Record<string, PlatformRateLimitConfig> = {
  // Facebook Graph API - 200 requests per hour per user, 4800 per hour per app
  facebook: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 180, // Conservative limit per user per hour
    burstLimit: 20, // Allow short bursts
  },
  
  // Instagram Graph API - Same as Facebook (shares limits)
  instagram: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 180,
    burstLimit: 20,
  },
  
  // Twitter API v2 - 300 tweets per 15 minutes (20/min average)
  twitter: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 250, // Conservative limit
    burstLimit: 10,
  },
  
  // LinkedIn API - 100 posts per day per user
  linkedin: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 90, // Conservative daily limit
    burstLimit: 5,
  },
  
  // TikTok API - Varies, but generally conservative
  tiktok: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    burstLimit: 5,
  },
  
  // YouTube API - 10,000 units per day (posting costs ~1600 units)
  youtube: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 6, // ~6 posts per day
    burstLimit: 2,
  }
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
    burstCount: number
    burstResetTime: number
  }
}

// In-memory store (use Redis in production)
const platformStore: RateLimitStore = {}

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(platformStore).forEach((key) => {
    const entry = platformStore[key]
    if (entry.resetTime < now && entry.burstResetTime < now) {
      delete platformStore[key]
    }
  })
}, 10 * 60 * 1000)

export interface PlatformRateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
  burstRemaining: number
}

export function platformRateLimit(
  platform: string,
  userId: string,
  req: NextRequest
): PlatformRateLimitResult {
  const config = PLATFORM_RATE_LIMITS[platform]
  if (!config) {
    throw new Error(`Rate limit config not found for platform: ${platform}`)
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  const key = `${platform}:${userId}:${ip}`
  const now = Date.now()

  // Initialize or reset if expired
  if (!platformStore[key] || platformStore[key].resetTime < now) {
    platformStore[key] = {
      count: 1,
      resetTime: now + config.windowMs,
      burstCount: 1,
      burstResetTime: now + (60 * 1000), // 1 minute burst window
    }
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: platformStore[key].resetTime,
      burstRemaining: (config.burstLimit || 10) - 1,
    }
  }

  // Reset burst count if burst window expired
  if (platformStore[key].burstResetTime < now) {
    platformStore[key].burstCount = 0
    platformStore[key].burstResetTime = now + (60 * 1000)
  }

  // Check burst limit first
  const burstLimit = config.burstLimit || 10
  if (platformStore[key].burstCount >= burstLimit) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - platformStore[key].count),
      resetTime: platformStore[key].resetTime,
      retryAfter: Math.ceil((platformStore[key].burstResetTime - now) / 1000),
      burstRemaining: 0,
    }
  }

  // Check main limit
  if (platformStore[key].count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: platformStore[key].resetTime,
      retryAfter: Math.ceil((platformStore[key].resetTime - now) / 1000),
      burstRemaining: Math.max(0, burstLimit - platformStore[key].burstCount),
    }
  }

  // Increment counters
  platformStore[key].count++
  platformStore[key].burstCount++

  return {
    success: true,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - platformStore[key].count),
    resetTime: platformStore[key].resetTime,
    burstRemaining: Math.max(0, burstLimit - platformStore[key].burstCount),
  }
}

// Security headers for platform requests
export function getPlatformSecurityHeaders(platform: string, userAgent?: string): Record<string, string> {
  const baseHeaders = {
    'User-Agent': userAgent || `AdInsights-Social-Manager/1.0`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'X-Requested-With': 'XMLHttpRequest',
  }

  switch (platform) {
    case 'facebook':
    case 'instagram':
      return {
        ...baseHeaders,
        'X-FB-API-Version': 'v19.0', // Latest stable version
      }
    
    case 'twitter':
      return {
        ...baseHeaders,
        'X-Client-Version': '2.0',
      }
    
    case 'linkedin':
      return {
        ...baseHeaders,
        'LinkedIn-Version': '202311', // Latest version
        'X-Restli-Protocol-Version': '2.0.0',
      }
    
    default:
      return baseHeaders
  }
}

// Platform-specific retry configurations
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export const PLATFORM_RETRY_CONFIGS: Record<string, RetryConfig> = {
  facebook: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  instagram: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  twitter: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 3,
  },
  linkedin: {
    maxRetries: 2,
    baseDelay: 1500,
    maxDelay: 45000,
    backoffMultiplier: 2.5,
  },
}

// Exponential backoff with jitter
export function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay)
  const jitter = cappedDelay * 0.1 * Math.random()
  return Math.floor(cappedDelay + jitter)
}

// Platform error handling
export interface PlatformError {
  code: string
  message: string
  isRetryable: boolean
  retryAfter?: number
  platform: string
}

export function handlePlatformError(platform: string, error: any): PlatformError {
  switch (platform) {
    case 'facebook':
    case 'instagram':
      return handleFacebookError(error)
    
    case 'twitter':
      return handleTwitterError(error)
    
    case 'linkedin':
      return handleLinkedInError(error)
    
    case 'tiktok':
      return handleTikTokError(error)
    
    default:
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'Unknown platform error',
        isRetryable: false,
        platform,
      }
  }
}

function handleFacebookError(error: any): PlatformError {
  const errorCode = error.response?.data?.error?.code || error.code
  const errorType = error.response?.data?.error?.type || 'unknown'
  const errorSubcode = error.response?.data?.error?.error_subcode
  
  // Facebook Graph API error codes
  switch (errorCode) {
    case 1:
    case 2:
      return {
        code: 'FB_API_UNKNOWN_ERROR',
        message: 'Facebook API temporary error',
        isRetryable: true,
        platform: 'facebook',
      }
    
    case 4:
      return {
        code: 'FB_RATE_LIMIT',
        message: 'Facebook API rate limit exceeded',
        isRetryable: true,
        retryAfter: 3600, // 1 hour
        platform: 'facebook',
      }
    
    case 10:
      return {
        code: 'FB_PERMISSION_DENIED',
        message: 'Insufficient permissions for Facebook posting',
        isRetryable: false,
        platform: 'facebook',
      }
    
    case 190:
      return {
        code: 'FB_TOKEN_EXPIRED',
        message: 'Facebook access token expired',
        isRetryable: false,
        platform: 'facebook',
      }
    
    case 368:
      return {
        code: 'FB_TEMPORARILY_BLOCKED',
        message: 'Temporarily blocked from posting to Facebook',
        isRetryable: true,
        retryAfter: 7200, // 2 hours
        platform: 'facebook',
      }
    
    default:
      return {
        code: 'FB_UNKNOWN_ERROR',
        message: error.response?.data?.error?.message || 'Facebook API error',
        isRetryable: errorType === 'OAuthException' ? false : true,
        platform: 'facebook',
      }
  }
}

function handleTwitterError(error: any): PlatformError {
  const status = error.response?.status
  const errorCode = error.response?.data?.errors?.[0]?.code
  const title = error.response?.data?.title
  
  switch (status) {
    case 429:
      return {
        code: 'TWITTER_RATE_LIMIT',
        message: 'Twitter API rate limit exceeded',
        isRetryable: true,
        retryAfter: 900, // 15 minutes
        platform: 'twitter',
      }
    
    case 401:
      return {
        code: 'TWITTER_UNAUTHORIZED',
        message: 'Twitter authorization failed',
        isRetryable: false,
        platform: 'twitter',
      }
    
    case 403:
      if (errorCode === 186) {
        return {
          code: 'TWITTER_DUPLICATE',
          message: 'Duplicate tweet content',
          isRetryable: false,
          platform: 'twitter',
        }
      }
      return {
        code: 'TWITTER_FORBIDDEN',
        message: 'Twitter posting forbidden',
        isRetryable: false,
        platform: 'twitter',
      }
    
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        code: 'TWITTER_SERVER_ERROR',
        message: 'Twitter server error',
        isRetryable: true,
        platform: 'twitter',
      }
    
    default:
      return {
        code: 'TWITTER_UNKNOWN_ERROR',
        message: title || error.message || 'Twitter API error',
        isRetryable: status >= 500,
        platform: 'twitter',
      }
  }
}

function handleLinkedInError(error: any): PlatformError {
  const status = error.response?.status
  const serviceErrorCode = error.response?.data?.serviceErrorCode
  
  switch (status) {
    case 429:
      return {
        code: 'LINKEDIN_RATE_LIMIT',
        message: 'LinkedIn API rate limit exceeded',
        isRetryable: true,
        retryAfter: 3600, // 1 hour
        platform: 'linkedin',
      }
    
    case 401:
      return {
        code: 'LINKEDIN_UNAUTHORIZED',
        message: 'LinkedIn authorization expired',
        isRetryable: false,
        platform: 'linkedin',
      }
    
    case 403:
      return {
        code: 'LINKEDIN_FORBIDDEN',
        message: 'LinkedIn posting not allowed',
        isRetryable: false,
        platform: 'linkedin',
      }
    
    case 422:
      return {
        code: 'LINKEDIN_VALIDATION_ERROR',
        message: 'LinkedIn content validation failed',
        isRetryable: false,
        platform: 'linkedin',
      }
    
    default:
      return {
        code: 'LINKEDIN_UNKNOWN_ERROR',
        message: error.response?.data?.message || 'LinkedIn API error',
        isRetryable: status >= 500,
        platform: 'linkedin',
      }
  }
}

function handleTikTokError(error: any): PlatformError {
  const status = error.response?.status
  const errorCode = error.response?.data?.error?.code
  const errorType = error.response?.data?.error?.type
  
  switch (status) {
    case 401:
      return {
        code: 'TIKTOK_TOKEN_EXPIRED',
        message: 'TikTok access token has expired',
        isRetryable: false,
        platform: 'tiktok'
      }
    case 403:
      return {
        code: 'TIKTOK_PERMISSION_DENIED',
        message: 'Insufficient permissions for TikTok API',
        isRetryable: false,
        platform: 'tiktok'
      }
    case 429:
      return {
        code: 'TIKTOK_RATE_LIMIT',
        message: 'TikTok API rate limit exceeded',
        isRetryable: true,
        retryAfter: parseInt(error.response?.headers?.['retry-after']) || 3600,
        platform: 'tiktok'
      }
    case 400:
      if (errorCode === 'content_too_long') {
        return {
          code: 'CONTENT_TOO_LONG',
          message: 'Content exceeds TikTok character limits',
          isRetryable: false,
          platform: 'tiktok'
        }
      }
      if (errorCode === 'invalid_media') {
        return {
          code: 'INVALID_MEDIA',
          message: 'Media format not supported by TikTok',
          isRetryable: false,
          platform: 'tiktok'
        }
      }
      break
    case 503:
      return {
        code: 'TIKTOK_TEMPORARILY_BLOCKED',
        message: 'TikTok API temporarily unavailable',
        isRetryable: true,
        retryAfter: 1800,
        platform: 'tiktok'
      }
  }
  
  return {
    code: 'TIKTOK_API_ERROR',
    message: error.message || 'Unknown TikTok API error',
    isRetryable: false,
    platform: 'tiktok'
  }
}
