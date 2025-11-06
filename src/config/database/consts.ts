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
        "pages_manage_metadata",
        "read_insights",
    ].join(","),
    // Instagram uses Facebook Login for Business (not Instagram Login)
    // Requires Page permissions, not instagram_manage_insights
    // The "ANALYZE" task on the Facebook Page grants access to Instagram insights
    INSTAGRAM: [
        "instagram_basic",
        "instagram_content_publish",
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_metadata",
        "business_management",
        "read_insights",
    ].join(","),
    TWITTER: "tweet.read users.read like.read follows.read offline.access",
} as const


// Stripe Payment Plans
export const STRIPE_PLANS = {
    MONTHLY: env.STRIPE_MONTHLY_PRICE_ID || "price_monthly",
    YEARLY: env.STRIPE_YEARLY_PRICE_ID || "price_yearly",
} as const