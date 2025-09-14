import { z } from "zod"

// Environment variable validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url(),
  APP_NAME: z.string().min(1).default("Social Media Manager"),
  SESSION_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),

  // OAuth Configuration
  // Facebook
  FACEBOOK_APP_ID: z.string().min(1),
  FACEBOOK_APP_SECRET: z.string().min(1),
  FACEBOOK_BUSINESS_CONFIG_ID: z.string().optional(),

  // Twitter (OAuth 2.0 for API v2)
  TWITTER_CLIENT_ID: z.string().min(1),
  TWITTER_CLIENT_SECRET: z.string().min(1),

  // Twitter OAuth 1.0a (for v1.1 media upload)
  TWITTER_API_KEY: z.string().min(1),
  TWITTER_API_SECRET: z.string().min(1),

  // Instagram (Instagram Business API uses Facebook credentials)
  INSTAGRAM_APP_ID: z.string().min(1),
  INSTAGRAM_APP_SECRET: z.string().min(1),

  // Amazon
  AMAZON_CLIENT_ID: z.string().optional(),
  AMAZON_CLIENT_SECRET: z.string().optional(),

  // TikTok
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),


  // OpenAI Configuration
  OPENAI_API_KEY: z.string().optional(),

  // Stripe Configuration
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_MONTHLY_PRICE_ID: z.string().min(1),
  STRIPE_YEARLY_PRICE_ID: z.string().min(1),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().optional(),
  RATE_LIMIT_MAX_REQUESTS: z.string().optional(),

  // Email service configuration
  SMTP_HOST: z.string().min(1).default("smtp.gmail.com"),
  SMTP_PORT: z.string().min(1).default("587"),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email().default("iayvob-support@gmail.com"),


  // Cloudinary Configuration (required for media uploads)
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
})

// Validate environment variables only on the server to avoid client-side Zod errors
type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    // Return minimal client-safe environment
    return {
      NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
      APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Social Media Manager",
    } as Env;
  }

  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.error("❌ Invalid environment variables:", error)
    // Re-throw to fail fast on server
    throw error;
  }
}

export const env: Env = validateEnv()

// Optional: a narrowed client env export for components that need public values
export const clientEnv = {
  NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Social Media Manager",
}