import { env } from "@/validations/env"

// Session management constants
export const APP_CONFIG = {
    SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes
    MAX_LOGIN_ATTEMPTS: 5,
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 100,
} as const


// Providers Scopes 
export const OAUTH_SCOPES = {
    FACEBOOK: [
        "ads_management",
        "ads_read",
        "business_management",
        "pages_read_engagement",
        "pages_manage_ads",
        "pages_manage_posts",
        "read_insights",
        "instagram_basic",
        "instagram_content_publish"
    ].join(","),
    INSTAGRAM: [
        "ads_management",
        "ads_read", 
        "business_management",
        "pages_read_engagement",
        "pages_manage_ads",
        "pages_manage_posts",
        "read_insights",
        "instagram_basic",
        "instagram_content_publish"
    ].join(","),
    TWITTER: "tweet.read users.read like.read follows.read offline.access",
    TIKTOK: "user.info.basic,video.list,user.info.profile,user.info.stats",
    AMAZON: "profile advertising::campaign_management advertising::campaign_read advertising::reports",
} as const


// Stripe Payment Plans
export const STRIPE_PLANS = {
    MONTHLY: env.STRIPE_MONTHLY_PRICE_ID || "price_monthly",
    YEARLY: env.STRIPE_YEARLY_PRICE_ID || "price_yearly",
} as const