import { SubscriptionPlan } from "@prisma/client";
import { getPlatformAccess, getFeatureAccess, canConnectPlatform, getDefaultFreemiumPlatform } from "@/lib/subscription-access";
import { logger } from "@/config/logger";

export interface PlatformConnection {
  platform: string;
  isConnected: boolean;
  userId: string;
  username?: string;
  connectedAt: Date;
  lastSyncAt?: Date;
  status: 'active' | 'expired' | 'error';
}

export interface SessionPlatformData {
  connected: {
    facebook?: any;
    instagram?: any;
    twitter?: any;
    tiktok?: any;
    amazon?: any;
  };
  restrictions: {
    allowedPlatforms: string[];
    maxPlatforms: number;
    currentConnectedCount: number;
    canConnectMore: boolean;
  };
  features: {
    postsAnalytics: boolean;
    adsAnalytics: boolean;
    multiplatformAccess: boolean;
  };
}

/**
 * Validate platform connection against subscription plan
 */
export function validatePlatformConnection(
  platform: string,
  userPlan: SubscriptionPlan,
  currentConnections: string[]
): {
  allowed: boolean;
  reason?: string;
  suggestedAction?: string;
} {
  const platformAccess = getPlatformAccess(userPlan);
  const platformKey = platform.toLowerCase() as keyof typeof platformAccess;

  // Check if platform is allowed for this plan
  if (!platformAccess[platformKey]) {
    return {
      allowed: false,
      reason: `${platform} is not available on your current plan`,
      suggestedAction: 'upgrade_required'
    };
  }

  // Check platform count limits
  if (!canConnectPlatform(userPlan, currentConnections.length)) {
    return {
      allowed: false,
      reason: `You've reached the maximum number of connected platforms for your plan`,
      suggestedAction: userPlan === 'FREEMIUM' ? 'upgrade_or_disconnect' : 'contact_support'
    };
  }

  // For freemium users, only allow the default platforms
  if (userPlan === 'FREEMIUM') {
    const allowedFreemiumPlatforms = getDefaultFreemiumPlatform();
    if (!allowedFreemiumPlatforms.includes(platform.toLowerCase())) {
      return {
        allowed: false,
        reason: `Freemium users can only connect Twitter/X and Instagram. Please upgrade for additional platforms.`,
        suggestedAction: 'upgrade_required'
      };
    }
  }

  return { allowed: true };
}

/**
 * Get analytics access for a platform and user plan
 */
export function getPlatformAnalyticsAccess(
  platform: string,
  userPlan: SubscriptionPlan
): {
  posts: boolean;
  ads: boolean;
  reason?: string;
} {
  const featureAccess = getFeatureAccess(userPlan);
  const platformAccess = getPlatformAccess(userPlan);
  const platformKey = platform.toLowerCase() as keyof typeof platformAccess;

  // Check if platform is accessible
  if (!platformAccess[platformKey]) {
    return {
      posts: false,
      ads: false,
      reason: `${platform} is not available on your current plan`
    };
  }

  return {
    posts: featureAccess.postAnalytics,
    ads: featureAccess.adsAnalytics,
    reason: featureAccess.adsAnalytics ? undefined : 'Ads analytics requires Premium plan'
  };
}

/**
 * Filter platform analytics data based on subscription
 */
export function filterAnalyticsData(
  analyticsData: any,
  platform: string,
  userPlan: SubscriptionPlan
): any {
  const access = getPlatformAnalyticsAccess(platform, userPlan);

  if (!access.posts && !access.ads) {
    return null;
  }

  const filtered: any = {};

  // Always include basic data if posts analytics is allowed
  if (access.posts) {
    filtered.posts = analyticsData.posts;
    filtered.profile = analyticsData.profile;
    filtered.lastUpdated = analyticsData.lastUpdated;
  }

  // Only include ads data if ads analytics is allowed
  if (access.ads && analyticsData.ads) {
    filtered.ads = analyticsData.ads;
  }

  return filtered;
}

/**
 * Get session platform restrictions
 */
export function getSessionPlatformRestrictions(
  userPlan: SubscriptionPlan,
  connectedPlatforms: string[]
): SessionPlatformData['restrictions'] {
  const platformAccess = getPlatformAccess(userPlan);
  const allowedPlatforms = Object.entries(platformAccess)
    .filter(([_, allowed]) => allowed)
    .map(([platform, _]) => platform);

  return {
    allowedPlatforms,
    maxPlatforms: userPlan === 'FREEMIUM' ? 1 : 5,
    currentConnectedCount: connectedPlatforms.length,
    canConnectMore: canConnectPlatform(userPlan, connectedPlatforms.length)
  };
}

/**
 * Validate posting access for platform
 */
export function validatePostingAccess(
  platform: string,
  userPlan: SubscriptionPlan
): {
  allowed: boolean;
  reason?: string;
} {
  // Only Instagram, Facebook, and Twitter are allowed for posting
  const allowedPostingPlatforms = ['instagram', 'facebook', 'twitter'];

  if (!allowedPostingPlatforms.includes(platform.toLowerCase())) {
    return {
      allowed: false,
      reason: `Posting is not available for ${platform}`
    };
  }

  const platformAccess = getPlatformAccess(userPlan);
  const platformKey = platform.toLowerCase() as keyof typeof platformAccess;

  if (!platformAccess[platformKey]) {
    return {
      allowed: false,
      reason: `${platform} is not available on your current plan`
    };
  }

  return { allowed: true };
}

/**
 * Log platform access attempt for analytics
 */
export function logPlatformAccessAttempt(
  userId: string,
  platform: string,
  action: 'connect' | 'disconnect' | 'view_analytics' | 'post',
  success: boolean,
  reason?: string
): void {
  logger.info('Platform access attempt', {
    userId,
    platform,
    action,
    success,
    reason,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get upgrade suggestions based on current restrictions
 */
export function getUpgradeSuggestions(
  userPlan: SubscriptionPlan,
  requestedFeature: string
): {
  title: string;
  description: string;
  benefits: string[];
  ctaText: string;
} {
  if (userPlan === 'FREEMIUM') {
    return {
      title: 'Upgrade to Premium',
      description: 'Unlock all platforms and advanced analytics',
      benefits: [
        'Connect Facebook, Twitter, TikTok & Amazon',
        'Access ads analytics for all platforms',
        'AI-powered posting assistant',
        'Unlimited data history',
        'Export data to CSV/PDF',
        'Priority customer support'
      ],
      ctaText: 'Upgrade to Premium'
    };
  }

  return {
    title: 'Feature Not Available',
    description: 'This feature is not available on your current plan',
    benefits: ['Contact support for more information'],
    ctaText: 'Contact Support'
  };
}

export default {
  validatePlatformConnection,
  getPlatformAnalyticsAccess,
  filterAnalyticsData,
  getSessionPlatformRestrictions,
  validatePostingAccess,
  logPlatformAccessAttempt,
  getUpgradeSuggestions
};
