import type { User, AuthProvider, SubscriptionPlan } from "@prisma/client"

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

// Auth types
export interface AuthSession {
  userId: string
  plan?: SubscriptionPlan
  user?: {
    email?: string
    username: string
    image?: string
    id?: string
  }
  // Essential tokens only
  user_tokens?: {
    access_token: string
    refresh_token?: string
    expires_at: Date | string | number
  }
  // Temporary OAuth state (used during authentication flow)
  state?: string
  codeVerifier?: string
  codeChallenge?: string
  createdAt?: number
  // Platform connection status only (no detailed data)
  connectedPlatforms?: {
    facebook?: {
      account: {
        userId: string
        username: string
        email: string
        businesses?: any[]
        adAccounts?: any[]
        advertisingAccountId?: string
      }
      account_tokens: {
        access_token: string
        refresh_token?: string
        expires_at: number
      }
      account_codes?: {
        codeVerifier: string
        codeChallenge: string
        state: string
      }
    }
    instagram?: {
      account: {
        userId: string
        username: string
        email: string
        businesses?: any[]
        adAccounts?: any[]
        advertisingAccountId?: string
      }
      account_tokens: {
        access_token: string
        refresh_token?: string
        expires_at: number
      }
      account_codes?: {
        codeVerifier: string
        codeChallenge: string
        state: string
      }
    }
    twitter?: {
      account: {
        userId: string
        username: string
        email: string
        businesses?: any[]
        adAccounts?: any[]
        advertisingAccountId?: string
      }
      account_tokens: {
        access_token: string
        access_token_secret?: string
        refresh_token?: string
        expires_at: number
      }
      account_codes?: {
        codeVerifier: string
        codeChallenge: string
        state: string
      }
    },
    tiktok?: {
      account: {
        userId: string
        username: string
        display_name?: string
        businesses?: any[]
        adAccounts?: any[]
        advertisingAccountId?: string
      }
      account_tokens: {
        access_token: string
        refresh_token?: string
        expires_at: number
      }
      account_codes?: {
        codeVerifier: string
        codeChallenge: string
        state: string
      }
    },
    amazon?: {
      account: {
        userId: string
        username: string
        email: string
        businesses?: any[]
        adAccounts?: any[]
        advertisingAccountId?: string
      }
      account_tokens: {
        access_token: string
        refresh_token?: string
        expires_at: number
      }
      account_codes?: {
        codeVerifier: string
        codeChallenge: string
        state: string
      }
    }
  }
  // Twitter unified OAuth flow flag
  twitter_unified_flow?: boolean
}

// Minimal session type for lightweight storage (used in callbacks)
export interface MinimalAuthSession {
  userId: string
  plan?: SubscriptionPlan
  user?: {
    email?: string
    username: string
    image?: string
    id?: string
  }
  user_tokens?: {
    access_token: string
    refresh_token?: string
    expires_at: Date | string | number
  }
  // Temporary OAuth state (used during authentication flow)
  state?: string
  codeVerifier?: string
  codeChallenge?: string
  createdAt?: number
  // Simple array of connected platform names (detailed data stored in database)
  connectedPlatforms?: string[]
}

export interface ProviderTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
}

export interface UserWithProviders extends User {
  authProviders: AuthProvider[]
}

// Provider-specific data types
export interface FacebookUserData {
  id: string
  name: string
  email?: string
  picture?: string
  facebookPages?: any[]
  instagramAccounts?: any[]
}

export interface FacebookBusinessData {
  businesses: any[]
  adAccounts: any[]
  pages?: any[]
  instagramAccounts?: any[]
  primaryAdAccountId?: string
  analytics_summary?: {
    total_businesses: number
    total_ad_accounts: number
    active_ad_accounts: number
    total_pages: number
    instagram_connected_pages: number
    total_spend: number
    has_advertising_access: boolean
    has_content_access: boolean
  }
}

export interface InstagramUserData {
  id: string,
  username: string,
  name?: string,
  profilePictureUrl?: string,
  pageId?: string,
  pageName?: string,
  accessToken?: string
}

export interface InstagramBusinessData {
  businessAccounts: any[]
  adAccounts: any[]
  primaryAdAccountId?: string
  pages?: any[]
  analytics_summary?: {
    total_instagram_accounts: number
    total_ad_accounts: number
    active_ad_accounts: number
    total_followers: number
    total_media: number
    has_advertising_access: boolean
    has_content_access: boolean
    accounts_with_insights: number
    avg_followers_per_account?: number
  }
}

export interface TwitterUserData {
  id: string;
  username: string;
  name: string;
  verified: boolean;
  created_at: string;
  description: string;
  profile_image_url: string;
  location: string;
  url: string;
  pinned_tweet_id: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  entities: any;
  // Analytics flags
  analytics_eligible: boolean; // Basic threshold
  content_creator: boolean;
  verified_account: boolean;
}

export interface TikTokUserData {
  open_id: string
  union_id?: string
  username?: string
  display_name?: string
  avatar_url?: string
}

export interface AmazonUserData {
  id: string
  user_id: string
  name: string
  email?: string
}

// Validation schemas
export interface CreateUserInput {
  email?: string
  username?: string
}

export interface UpdateUserInput {
  username?: string
  email?: string
}

export interface AuthProviderInput {
  provider: "facebook" | "instagram" | "twitter" | "amazon" | "tiktok"
  providerId: string
  email?: string
  username?: string
  displayName?: string
  profileImage?: string
  // Additional profile data (previously stored in session)
  name?: string
  followersCount?: number
  mediaCount?: number
  accountType?: string
  canAccessInsights?: boolean
  canPublishContent?: boolean
  canManageAds?: boolean
  // OAuth tokens
  accessToken: string
  accessTokenSecret?: string // OAuth 1.0a access token secret
  refreshToken?: string
  expiresAt?: Date
  scopes?: string // OAuth granted scopes (space-separated string)
  tokenExpiresIn?: number // Time in seconds until token expires
  hasRefreshToken?: boolean // Whether the provider has a refresh token
  // Platform-specific data
  advertisingAccountId?: string
  businessAccounts?: any // Will be serialized as JSON string
  adAccounts?: any // Will be serialized as JSON string
  configId?: string
  // Analytics summary (previously in session)
  analyticsSummary?: any // Will be serialized as JSON string
}