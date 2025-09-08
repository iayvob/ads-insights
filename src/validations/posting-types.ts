import { z } from "zod"

// Platform types
export type SocialPlatform = "instagram" | "facebook" | "twitter"

// Media validation schemas
export const MediaUploadSchema = z.object({
  type: z.enum(["image", "video"]),
  size: z.number().max(50 * 1024 * 1024), // 50MB max
  mimeType: z.string().regex(/^(image|video)\//),
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
  platforms: z.array(z.enum(["instagram", "facebook", "twitter"])).min(1),
  content: PostContentSchema,
  media: z.array(MediaUploadSchema).max(10).optional(),
  schedule: PostScheduleSchema.optional(),
  isDraft: z.boolean().default(false),
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
  }
} as const

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
} as const

// Type exports
export type MediaUpload = z.infer<typeof MediaUploadSchema>
export type PostContent = z.infer<typeof PostContentSchema>
export type PostSchedule = z.infer<typeof PostScheduleSchema>
export type PostRequest = z.infer<typeof PostRequestSchema>
