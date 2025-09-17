import { z } from "zod"

// Platform types - Enhanced to include Amazon and TikTok
export type SocialPlatform = "instagram" | "facebook" | "twitter" | "amazon" | "tiktok"

// Media validation schemas
export const MediaUploadSchema = z.object({
  id: z.string().optional(), // Database ID for uploaded media
  type: z.enum(["image", "video"]),
  size: z.number().max(50 * 1024 * 1024), // 50MB max
  mimeType: z.string().regex(/^(image|video)\//).optional(), // Optional since backend will fetch from DB
  filename: z.string().min(1).max(255),
  duration: z.number().optional(), // for videos
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
})

export const PostContentSchema = z.object({
  content: z.string().min(1).max(2200), // Max for Twitter is 280, Instagram 2200
  hashtags: z.array(z.string().regex(/^[a-zA-Z0-9_]+$/)).optional(),
  mentions: z.array(z.string()).optional(),
  link: z.string().url().optional(),
})

export const PostScheduleSchema = z.object({
  scheduledAt: z.date().min(new Date()),
  timezone: z.string().default("UTC"),
})

export const PostRequestSchema = z.object({
  platforms: z.array(z.enum(["instagram", "facebook", "twitter", "amazon", "tiktok"])).min(1),
  content: PostContentSchema,
  media: z.array(MediaUploadSchema).max(10).optional(),
  schedule: PostScheduleSchema.optional(),
  isDraft: z.boolean().default(false),
  // Amazon-specific fields
  amazon: z.object({
    brandEntityId: z.string().optional(), // Amazon Brand Registry entity ID
    marketplaceId: z.string().default("ATVPDKIKX0DER"), // Default to US marketplace
    productAsins: z.array(z.string().regex(/^[A-Z0-9]{10}$/)).max(5).optional(), // Max 5 products per post
    brandStoryTitle: z.string().max(50).optional(), // Brand story title
    brandStoryContent: z.string().max(300).optional(), // Brand story content
    callToAction: z.enum(["LEARN_MORE", "SHOP_NOW", "EXPLORE", "DISCOVER"]).optional(),
    targetAudience: z.object({
      interests: z.array(z.string()).optional(),
      demographics: z.object({
        ageRange: z.enum(["18-24", "25-34", "35-44", "45-54", "55+"]).optional(),
        gender: z.enum(["MALE", "FEMALE", "ALL"]).optional(),
      }).optional(),
    }).optional(),
  }).optional(),
  // TikTok-specific fields
  tiktok: z.object({
    advertiserId: z.string().optional(), // TikTok Business advertiser ID
    videoProperties: z.object({
      title: z.string().max(100).optional(),
      description: z.string().max(2200).optional(),
      tags: z.array(z.string().max(20)).max(5).optional(),
      category: z.enum([
        "EDUCATION",
        "ENTERTAINMENT",
        "COMEDY",
        "MUSIC",
        "DANCE",
        "SPORTS",
        "FOOD",
        "BEAUTY",
        "FASHION",
        "LIFESTYLE",
        "TECHNOLOGY",
        "BUSINESS",
        "GAMING",
        "PETS",
        "DIY",
        "TRAVEL"
      ]).optional(),
      language: z.string().length(2).default("en"),
      thumbnailTime: z.number().min(0).optional(),
    }).optional(),
    privacy: z.enum(["PUBLIC", "PRIVATE", "FOLLOWERS_ONLY"]).default("PUBLIC"),
    allowComments: z.boolean().default(true),
    allowDuet: z.boolean().default(true),
    allowStitch: z.boolean().default(true),
    brandedContent: z.boolean().default(false),
    promotionalContent: z.boolean().default(false),
    category: z.enum([
      "EDUCATION",
      "ENTERTAINMENT",
      "COMEDY",
      "MUSIC",
      "DANCE",
      "SPORTS",
      "FOOD",
      "BEAUTY",
      "FASHION",
      "LIFESTYLE",
      "TECHNOLOGY",
      "BUSINESS",
      "GAMING",
      "PETS",
      "DIY",
      "TRAVEL"
    ]).optional(),
  }).optional(),
})

// Response types
export interface MediaUploadResponse {
  id: string
  url: string
  filename: string
  type: "image" | "video"
  size: number
  dimensions?: {
    width: number
    height: number
  }
  duration?: number
}

export interface PostResponse {
  id: string
  status: "draft" | "scheduled" | "published" | "failed"
  platforms: {
    platform: SocialPlatform
    status: "pending" | "published" | "failed"
    platformPostId?: string
    error?: string
    publishedAt?: string
  }[]
  content: {
    text: string
    hashtags?: string[]
    mentions?: string[]
    link?: string
  }
  media?: MediaUploadResponse[]
  scheduledAt?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PostAnalytics {
  postId: string
  platform: SocialPlatform
  metrics: {
    views?: number
    likes?: number
    comments?: number
    shares?: number
    clicks?: number
    engagement_rate?: number
  }
  lastUpdated: string
}

// Platform-specific constraints
export const PlatformConstraints = {
  instagram: {
    maxContentLength: 2200,
    maxMedia: 10,
    supportedMediaTypes: ["image/jpeg", "image/png", "video/mp4"],
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    maxImageSize: 8 * 1024 * 1024,   // 8MB
    maxVideoDuration: 60, // seconds
    aspectRatios: {
      square: { min: 0.8, max: 1.91 },
      portrait: { min: 0.8, max: 1.91 },
      landscape: { min: 1.91, max: 1.91 }
    }
  },
  facebook: {
    maxContentLength: 63206,
    maxMedia: 30,
    supportedMediaTypes: ["image/jpeg", "image/png", "image/gif", "video/mp4"],
    maxVideoSize: 10 * 1024 * 1024 * 1024, // 10GB
    maxImageSize: 4 * 1024 * 1024,         // 4MB
    maxVideoDuration: 240, // 4 minutes
    aspectRatios: {
      square: { min: 1, max: 1 },
      portrait: { min: 0.8, max: 1.25 },
      landscape: { min: 1.25, max: 1.78 }
    }
  },
  twitter: {
    maxContentLength: 280,
    maxMedia: 4,
    supportedMediaTypes: ["image/jpeg", "image/png", "image/gif", "video/mp4"],
    maxVideoSize: 512 * 1024 * 1024, // 512MB
    maxImageSize: 5 * 1024 * 1024,   // 5MB
    maxVideoDuration: 140, // seconds
    aspectRatios: {
      square: { min: 1, max: 1 },
      portrait: { min: 0.5, max: 2 },
      landscape: { min: 0.5, max: 2 }
    }
  },
  amazon: {
    maxContentLength: 1000, // Amazon Posts content limit
    maxMedia: 5,
    supportedMediaTypes: ["image/jpeg", "image/png", "video/mp4"],
    maxVideoSize: 500 * 1024 * 1024, // 500MB
    maxImageSize: 10 * 1024 * 1024,  // 10MB
    maxVideoDuration: 60, // seconds
    aspectRatios: {
      square: { min: 1, max: 1 },
      portrait: { min: 0.8, max: 1.25 },
      landscape: { min: 1.25, max: 1.78 }
    },
    requiredBrandRegistry: true,
    maxASINs: 10,
    maxProductHighlights: 5
  },
  tiktok: {
    maxContentLength: 2200,
    maxMedia: 1, // TikTok primarily supports single video posts
    supportedMediaTypes: ["video/mp4", "video/quicktime", "video/webm"],
    maxVideoSize: 500 * 1024 * 1024, // 500MB as per TikTok Business API
    maxImageSize: 0, // TikTok doesn't support image-only posts for business accounts
    maxVideoDuration: 180, // 3 minutes for business accounts
    minVideoDuration: 3, // 3 seconds minimum
    aspectRatios: {
      portrait: { min: 0.5625, max: 1.778 }, // 9:16 to 16:9
      square: { min: 1, max: 1 }, // 1:1 (less common)
      landscape: { min: 1.778, max: 1.778 } // 16:9 (less common)
    },
    recommendedAspectRatio: 0.5625, // 9:16 vertical
    requiresBusinessAccount: true,
    supportedFormats: ["MP4", "MOV", "MPEG4", "WEBM"],
    recommendedResolution: {
      width: 1080,
      height: 1920
    },
    minResolution: {
      width: 540,
      height: 960
    },
    maxFrameRate: 60,
    recommendedFrameRate: 30
  }
} as const

// TikTok-specific schemas and types
export const TikTokBusinessAccountSchema = z.object({
  advertiserId: z.string().min(1),
  accountName: z.string().optional(),
  accountType: z.enum(["BUSINESS", "CREATOR"]).default("BUSINESS"),
  industry: z.string().optional(),
  companyName: z.string().optional(),
  contactEmail: z.string().email().optional(),
})

export const TikTokVideoPropertiesSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(2200).optional(),
  tags: z.array(z.string().max(20)).max(5).optional(),
  category: z.enum([
    "EDUCATION",
    "ENTERTAINMENT",
    "COMEDY",
    "MUSIC",
    "DANCE",
    "SPORTS",
    "FOOD",
    "BEAUTY",
    "FASHION",
    "LIFESTYLE",
    "TECHNOLOGY",
    "BUSINESS",
    "GAMING",
    "PETS",
    "DIY",
    "TRAVEL"
  ]).optional(),
  language: z.string().length(2).default("en"),
  thumbnailTime: z.number().min(0).optional(), // Time in seconds for auto-generated thumbnail
})

export const TikTokUploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  videoId: z.string(),
  uploadHeaders: z.record(z.string()),
  expiresAt: z.date(),
})

export const TikTokVideoUploadSchema = z.object({
  videoId: z.string(),
  uploadUrl: z.string().url(),
  fileName: z.string(),
  fileSize: z.number().positive(),
  duration: z.number().positive(),
  format: z.string(),
  resolution: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  frameRate: z.number().positive(),
})

export const TikTokPostContentSchema = z.object({
  videoId: z.string().min(1),
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string().regex(/^[a-zA-Z0-9_]+$/)).max(10).optional(),
  mentions: z.array(z.string()).max(5).optional(),
  privacy: z.enum(["PUBLIC", "PRIVATE", "FOLLOWERS_ONLY"]).default("PUBLIC"),
  allowComments: z.boolean().default(true),
  allowDuet: z.boolean().default(true),
  allowStitch: z.boolean().default(true),
  brandedContent: z.boolean().default(false),
  promotionalContent: z.boolean().default(false),
})

export const TikTokPostSubmissionSchema = z.object({
  advertiserId: z.string(),
  postContent: TikTokPostContentSchema,
  videoProperties: TikTokVideoPropertiesSchema.optional(),
  scheduledPublishTime: z.date().optional(),
  autoPublish: z.boolean().default(true),
})

export const TikTokOAuthSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number(),
  tokenType: z.string().default("Bearer"),
  scope: z.string(),
  advertiserId: z.string(),
})

// Error types
export interface PostingError {
  code: string
  message: string
  platform?: SocialPlatform
  details?: any
}

export const PostingErrorCodes = {
  INVALID_CONTENT: "INVALID_CONTENT",
  MEDIA_TOO_LARGE: "MEDIA_TOO_LARGE",
  UNSUPPORTED_MEDIA_TYPE: "UNSUPPORTED_MEDIA_TYPE",
  PLATFORM_NOT_CONNECTED: "PLATFORM_NOT_CONNECTED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  PLATFORM_API_ERROR: "PLATFORM_API_ERROR",
  PREMIUM_REQUIRED: "PREMIUM_REQUIRED",
  SCHEDULING_ERROR: "SCHEDULING_ERROR",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  // Amazon-specific error codes
  AMAZON_SP_API_ERROR: "AMAZON_SP_API_ERROR",
  AMAZON_INVALID_ASIN: "AMAZON_INVALID_ASIN",
  AMAZON_BRAND_NOT_REGISTERED: "AMAZON_BRAND_NOT_REGISTERED",
  AMAZON_INSUFFICIENT_BRAND_PERMISSIONS: "AMAZON_INSUFFICIENT_BRAND_PERMISSIONS",
  AMAZON_MARKETPLACE_NOT_SUPPORTED: "AMAZON_MARKETPLACE_NOT_SUPPORTED",
  AMAZON_MEDIA_UPLOAD_FAILED: "AMAZON_MEDIA_UPLOAD_FAILED",
  AMAZON_POST_CREATION_FAILED: "AMAZON_POST_CREATION_FAILED",
  AMAZON_TOKEN_EXPIRED: "AMAZON_TOKEN_EXPIRED",
  // TikTok-specific error codes
  TIKTOK_BUSINESS_API_ERROR: "TIKTOK_BUSINESS_API_ERROR",
  TIKTOK_VIDEO_UPLOAD_FAILED: "TIKTOK_VIDEO_UPLOAD_FAILED",
  TIKTOK_INVALID_VIDEO_FORMAT: "TIKTOK_INVALID_VIDEO_FORMAT",
  TIKTOK_VIDEO_TOO_LARGE: "TIKTOK_VIDEO_TOO_LARGE",
  TIKTOK_VIDEO_TOO_SHORT: "TIKTOK_VIDEO_TOO_SHORT",
  TIKTOK_VIDEO_TOO_LONG: "TIKTOK_VIDEO_TOO_LONG",
  TIKTOK_INVALID_RESOLUTION: "TIKTOK_INVALID_RESOLUTION",
  TIKTOK_BUSINESS_ACCOUNT_REQUIRED: "TIKTOK_BUSINESS_ACCOUNT_REQUIRED",
  TIKTOK_INSUFFICIENT_PERMISSIONS: "TIKTOK_INSUFFICIENT_PERMISSIONS",
  TIKTOK_ADVERTISER_ID_REQUIRED: "TIKTOK_ADVERTISER_ID_REQUIRED",
  TIKTOK_UPLOAD_URL_EXPIRED: "TIKTOK_UPLOAD_URL_EXPIRED",
  TIKTOK_PUBLISH_FAILED: "TIKTOK_PUBLISH_FAILED",
  TIKTOK_TOKEN_EXPIRED: "TIKTOK_TOKEN_EXPIRED",
} as const

// Amazon SP-API specific types and schemas
export const AmazonMarketplaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  countryCode: z.string().length(2),
  currency: z.string().length(3),
  domain: z.string().url(),
})

export const AmazonProductSchema = z.object({
  asin: z.string().regex(/^[A-Z0-9]{10}$/, "Invalid ASIN format"),
  title: z.string(),
  brand: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional(),
  price: z.object({
    amount: z.number().positive(),
    currency: z.string().length(3),
  }).optional(),
  availability: z.enum(["IN_STOCK", "OUT_OF_STOCK", "LIMITED", "UNKNOWN"]).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().min(0).optional(),
})

export const AmazonBrandContentSchema = z.object({
  brandEntityId: z.string(),
  brandName: z.string(),
  brandLogoUrl: z.string().url().optional(),
  brandStoryTitle: z.string().max(50),
  brandStoryContent: z.string().max(300),
  brandDescription: z.string().max(500).optional(),
  brandWebsiteUrl: z.string().url().optional(),
  brandValues: z.array(z.string()).max(5).optional(),
})

export const AmazonPostContentSchema = z.object({
  headline: z.string().max(80), // Amazon Posts headline limit
  bodyText: z.string().max(500), // Amazon Posts body text limit
  callToAction: z.enum([
    "LEARN_MORE",
    "SHOP_NOW",
    "EXPLORE",
    "DISCOVER",
    "VIEW_PRODUCTS",
    "SHOP_BRAND"
  ]),
  brandContent: AmazonBrandContentSchema.optional(),
  products: z.array(AmazonProductSchema).max(5), // Max 5 products per post
  targetMarketplace: AmazonMarketplaceSchema,
  tags: z.array(z.string()).max(10).optional(), // Amazon internal tags
})

export const AmazonMediaAssetSchema = z.object({
  assetId: z.string(),
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  url: z.string().url(),
  fileName: z.string(),
  fileSize: z.number(),
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  mimeType: z.string(),
  uploadDestination: z.object({
    uploadId: z.string(),
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
  }).optional(),
  status: z.enum(["UPLOADING", "PROCESSING", "READY", "FAILED"]).default("UPLOADING"),
  processingProgress: z.number().min(0).max(100).optional(),
})

export const AmazonPostSubmissionSchema = z.object({
  postId: z.string(),
  status: z.enum([
    "DRAFT",
    "PENDING_REVIEW",
    "APPROVED",
    "REJECTED",
    "PUBLISHED",
    "ARCHIVED"
  ]),
  submissionId: z.string().optional(),
  submittedAt: z.date().optional(),
  publishedAt: z.date().optional(),
  rejectionReason: z.string().optional(),
  moderationNotes: z.string().optional(),
  visibility: z.enum(["PUBLIC", "BRAND_FOLLOWERS", "PRIVATE"]).default("PUBLIC"),
  engagementMetrics: z.object({
    views: z.number().min(0).default(0),
    clicks: z.number().min(0).default(0),
    saves: z.number().min(0).default(0),
    shares: z.number().min(0).default(0),
  }).optional(),
})

export const AmazonOAuthSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.string().default("bearer"),
  expiresIn: z.number().positive(),
  expiresAt: z.date(),
  scope: z.string(),
  sellerId: z.string(),
  marketplaceId: z.string(),
  spApiEndpoint: z.string().url(),
  region: z.enum(["NA", "EU", "FE"]), // North America, Europe, Far East
})

export const AmazonUploadDestinationSchema = z.object({
  uploadDestinationId: z.string(),
  url: z.string().url(),
  headers: z.record(z.string()),
  contentType: z.string(),
  marketplace: z.string(),
  expires: z.date(),
})

// Amazon SP-API Response types
export interface AmazonApiResponse<T = any> {
  payload?: T
  errors?: Array<{
    code: string
    message: string
    details?: string
  }>
  pagination?: {
    nextToken?: string
    previousToken?: string
  }
}

export interface AmazonPostResponse {
  postId: string
  status: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
  metrics?: {
    views: number
    clicks: number
    engagement: number
  }
  moderationStatus?: string
  rejectionReason?: string
}

export interface AmazonUploadResponse {
  uploadDestinationId: string
  uploadUrl: string
  resourceId: string
  contentType: string
  uploadHeaders: Record<string, string>
  expiresAt: string
}

// Type exports
export type MediaUpload = z.infer<typeof MediaUploadSchema>
export type PostContent = z.infer<typeof PostContentSchema>
export type PostSchedule = z.infer<typeof PostScheduleSchema>
export type PostRequest = z.infer<typeof PostRequestSchema>
export type AmazonMarketplace = z.infer<typeof AmazonMarketplaceSchema>
export type AmazonProduct = z.infer<typeof AmazonProductSchema>
export type AmazonBrandContent = z.infer<typeof AmazonBrandContentSchema>
export type AmazonPostContent = z.infer<typeof AmazonPostContentSchema>
export type AmazonMediaAsset = z.infer<typeof AmazonMediaAssetSchema>
export type AmazonPostSubmission = z.infer<typeof AmazonPostSubmissionSchema>
export type AmazonOAuth = z.infer<typeof AmazonOAuthSchema>
export type AmazonUploadDestination = z.infer<typeof AmazonUploadDestinationSchema>
export type TikTokBusinessAccount = z.infer<typeof TikTokBusinessAccountSchema>
export type TikTokVideoProperties = z.infer<typeof TikTokVideoPropertiesSchema>
export type TikTokUploadUrlResponse = z.infer<typeof TikTokUploadUrlResponseSchema>
export type TikTokVideoUpload = z.infer<typeof TikTokVideoUploadSchema>
export type TikTokPostContent = z.infer<typeof TikTokPostContentSchema>
export type TikTokPostSubmission = z.infer<typeof TikTokPostSubmissionSchema>
export type TikTokOAuth = z.infer<typeof TikTokOAuthSchema>
