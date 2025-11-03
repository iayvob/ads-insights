import { SubscriptionPlan } from "@prisma/client";

export interface PlatformAccess {
  facebook: boolean;
  instagram: boolean;
  twitter: boolean;
  tiktok: boolean;
  amazon: boolean;
}

export interface FeatureAccess {
  postAnalytics: boolean;
  adsAnalytics: boolean;
  aiPostingAssistant: boolean;
  advancedInsights: boolean;
  unlimitedHistory: boolean;
  exportData: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  multiplatformAccess: boolean;
}

/**
 * Check which platforms are accessible based on subscription plan
 */
export function getPlatformAccess(plan: SubscriptionPlan): PlatformAccess {
  switch (plan) {
    case "FREEMIUM":
      return {
        facebook: false, // Facebook not available in freemium
        instagram: true, // Instagram available in freemium
        twitter: true,   // Twitter/X available in freemium
        tiktok: false,
        amazon: false,
      };

    case "PREMIUM_MONTHLY":
    case "PREMIUM_YEARLY":
      return {
        facebook: true,
        instagram: true,
        twitter: true,
        tiktok: true,
        amazon: true,
      };

    default:
      return {
        facebook: false,
        instagram: true, // Default to Instagram for unknown plans
        twitter: false,
        tiktok: false,
        amazon: false,
      };
  }
}

/**
 * Check which features are accessible based on subscription plan
 */
export function getFeatureAccess(plan: SubscriptionPlan): FeatureAccess {
  switch (plan) {
    case "FREEMIUM":
      return {
        postAnalytics: true,
        adsAnalytics: false, // No ads analytics in freemium
        aiPostingAssistant: false, // No AI posting assistant in freemium
        advancedInsights: false,
        unlimitedHistory: false,
        exportData: false,
        apiAccess: false,
        prioritySupport: false,
        multiplatformAccess: true, // Allow Instagram and Twitter in freemium
      };

    case "PREMIUM_MONTHLY":
    case "PREMIUM_YEARLY":
      return {
        postAnalytics: true,
        adsAnalytics: true, // Ads analytics available in premium
        aiPostingAssistant: true, // AI posting assistant available in premium
        advancedInsights: true,
        unlimitedHistory: true,
        exportData: true,
        apiAccess: true,
        prioritySupport: true,
        multiplatformAccess: true, // Multiple platforms in premium
      };

    default:
      return {
        postAnalytics: true,
        adsAnalytics: false,
        aiPostingAssistant: false, // Default to no AI posting assistant
        advancedInsights: false,
        unlimitedHistory: false,
        exportData: false,
        apiAccess: false,
        prioritySupport: false,
        multiplatformAccess: false, // Default to single platform
      };
  }
}

/**
 * Check if a specific platform is accessible
 */
export function isPlatformAccessible(platform: string, plan: SubscriptionPlan): boolean {
  // Add debug logging to trace access issues
  console.log(`🔍 Checking platform access: ${platform} for plan: ${plan}`);

  const access = getPlatformAccess(plan);
  console.log(`🔍 Platform access rights:`, access);

  let hasAccess = false;

  switch (platform.toLowerCase()) {
    case "facebook":
      hasAccess = access.facebook;
      break;
    case "instagram":
      hasAccess = access.instagram;
      break;
    case "twitter":
    case "x":
      hasAccess = access.twitter;
      break;
    case "tiktok":
      hasAccess = access.tiktok;
      break;
    case "amazon":
      hasAccess = access.amazon;
      break;
    default:
      hasAccess = false;
  }

  console.log(`✅ Platform ${platform} access result: ${hasAccess}`);
  return hasAccess;
}

/**
 * Check if a specific feature is accessible
 */
export function isFeatureAccessible(feature: string, plan: SubscriptionPlan): boolean {
  const access = getFeatureAccess(plan);

  switch (feature.toLowerCase()) {
    case "post_analytics":
    case "postanalytics":
      return access.postAnalytics;
    case "ads_analytics":
    case "adsanalytics":
      return access.adsAnalytics;
    case "ai_posting_assistant":
    case "aipostingassistant":
    case "ai_posting":
    case "aiposting":
      return access.aiPostingAssistant;
    case "advanced_insights":
    case "advancedinsights":
      return access.advancedInsights;
    case "unlimited_history":
    case "unlimitedhistory":
      return access.unlimitedHistory;
    case "export_data":
    case "exportdata":
      return access.exportData;
    case "api_access":
    case "apiaccess":
      return access.apiAccess;
    case "priority_support":
    case "prioritysupport":
      return access.prioritySupport;
    default:
      return false;
  }
}

/**
 * Get restriction message for blocked platforms/features
 */
export function getRestrictionMessage(type: "platform" | "feature", name: string): string {
  if (type === "platform") {
    switch (name.toLowerCase()) {
      case "facebook":
      case "tiktok":
        return `${name} is only available with Premium plans. Freemium users can access Twitter/X and Instagram only. Upgrade to connect additional platforms.`;
      case "amazon":
        return "Amazon analytics is only available with Premium plans. Upgrade to access Amazon insights.";
      default:
        return `${name} access is restricted. Please upgrade your plan.`;
    }
  } else {
    switch (name.toLowerCase()) {
      case "multiplatform_access":
      case "multiplatformaccess":
        return "Additional platform access is only available with Premium plans. Freemium users can connect Twitter/X and Instagram only.";
      case "ads_analytics":
      case "adsanalytics":
        return "Ads analytics is only available with Premium plans. Upgrade to analyze your advertising performance.";
      case "ai_posting_assistant":
      case "aipostingassistant":
      case "ai_posting":
      case "aiposting":
        return "AI-powered posting assistant is only available with Premium plans. Upgrade to create posts with AI assistance.";
      case "advanced_insights":
      case "advancedinsights":
        return "Advanced insights are only available with Premium plans. Upgrade for deeper analytics.";
      case "unlimited_history":
      case "unlimitedhistory":
        return "Unlimited data history is only available with Premium plans. Freemium users have 30-day history.";
      case "export_data":
      case "exportdata":
        return "Data export (CSV/PDF) is only available with Premium plans. Upgrade to export your data.";
      case "api_access":
      case "apiaccess":
        return "API access is only available with Premium plans. Upgrade to integrate with your tools.";
      default:
        return `${name} is only available with Premium plans. Please upgrade to access this feature.`;
    }
  }
}

/**
 * Get maximum number of platforms allowed for subscription plan
 */
export function getMaxPlatformCount(plan: SubscriptionPlan): number {
  switch (plan) {
    case "FREEMIUM":
      return 2; // Two platforms for freemium: Twitter/X and Instagram
    case "PREMIUM_MONTHLY":
    case "PREMIUM_YEARLY":
      return 5; // All platforms for premium
    default:
      return 1; // Default to single platform
  }
}

/**
 * Check if user can connect a new platform
 */
export function canConnectPlatform(plan: SubscriptionPlan, currentConnectedCount: number): boolean {
  const maxPlatforms = getMaxPlatformCount(plan);
  return currentConnectedCount < maxPlatforms;
}

/**
 * Get default platforms for freemium users (now returns array of allowed platforms)
 */
export function getDefaultFreemiumPlatform(): string[] {
  return ["instagram", "twitter"];
}

/**
 * Filter available platforms based on subscription
 */
export function getAvailablePlatforms(plan: SubscriptionPlan): string[] {
  const access = getPlatformAccess(plan);
  const platforms: string[] = [];

  if (access.facebook) platforms.push("facebook");
  if (access.instagram) platforms.push("instagram");
  if (access.twitter) platforms.push("twitter");
  if (access.tiktok) platforms.push("tiktok");
  if (access.amazon) platforms.push("amazon");

  return platforms;
}

/**
 * Check if user should be shown upgrade prompts
 */
export function shouldShowUpgradePrompt(plan: SubscriptionPlan): boolean {
  return plan === "FREEMIUM";
}

/**
 * Check if AI posting assistant is accessible
 */
export function isAIPostingAssistantAccessible(plan: SubscriptionPlan): boolean {
  return isFeatureAccessible("ai_posting_assistant", plan);
}

/**
 * Get analytics type restrictions
 */
export function getAnalyticsTypeAccess(plan: SubscriptionPlan): {
  posts: boolean;
  ads: boolean;
} {
  const featureAccess = getFeatureAccess(plan);

  return {
    posts: featureAccess.postAnalytics,
    ads: featureAccess.adsAnalytics,
  };
}

/**
 * Validate premium access for specific features
 */
export async function validatePremiumAccess(userId: string, feature: string): Promise<{
  hasAccess: boolean;
  plan?: SubscriptionPlan;
  message?: string;
}> {
  try {
    // This would typically fetch the user's subscription from the database
    // For now, we'll mock it to return premium access
    // In a real implementation, you'd query the database for user subscription

    // Mock user subscription - replace with actual database query
    const userSubscription = {
      plan: "PREMIUM_MONTHLY" as SubscriptionPlan,
      status: "ACTIVE"
    };

    // Check if feature requires premium
    const featureRequiresPremium = ["posting", "ai_assistant", "unlimited_history", "export_data"].includes(feature);

    if (!featureRequiresPremium) {
      return { hasAccess: true, plan: userSubscription.plan };
    }

    // Check if user has premium plan
    const isPremium = userSubscription.plan === "PREMIUM_MONTHLY" || userSubscription.plan === "PREMIUM_YEARLY";
    const isActive = userSubscription.status === "ACTIVE";

    if (isPremium && isActive) {
      return { hasAccess: true, plan: userSubscription.plan };
    }

    return {
      hasAccess: false,
      plan: userSubscription.plan,
      message: "Premium subscription required for this feature"
    };

  } catch (error) {
    console.error("Error validating premium access:", error);
    return {
      hasAccess: false,
      message: "Unable to validate subscription access"
    };
  }
}
