import { SubscriptionPlan } from "@prisma/client";
import { AuthSession } from "@/validations/types";
import { OAuthService } from "./oauth";
import { generateState } from "./authentications";
import { isPlatformAccessible } from "@/lib/subscription-access";
import { AuthError } from "@/lib/errors";
import { logger } from "@/config/logger";

export interface OAuthInitiationRequest {
  platform: string;
  redirectUri: string;
  userPlan: SubscriptionPlan;
  userId: string;
}

export interface OAuthInitiationResponse {
  authUrl: string;
  state: string;
  codeVerifier?: string;
  codeChallenge?: string;
}

export interface ConnectedPlatform {
  platform: string;
  isConnected: boolean;
  username?: string;
  accountId?: string;
  connectedAt?: Date;
  hasValidToken: boolean;
  requiresPremium: boolean;
}

/**
 * Enhanced OAuth Manager that handles multi-platform connectivity
 * with subscription-based access control and PKCE security
 */
export class OAuthManager {
  /**
   * Get all available platforms with connection status for a user
   */
  static getAvailablePlatforms(userPlan: SubscriptionPlan, session?: AuthSession): ConnectedPlatform[] {
    const platforms = ['facebook', 'instagram', 'twitter', 'amazon'];
    
    return platforms.map(platform => ({
      platform,
      isConnected: this.isPlatformConnected(platform, session),
      username: this.getPlatformUsername(platform, session),
      accountId: this.getPlatformAccountId(platform, session),
      connectedAt: this.getPlatformConnectedAt(platform, session),
      hasValidToken: this.hasValidToken(platform, session),
      requiresPremium: platform === 'amazon', // Only Amazon requires premium for now
    }));
  }

  /**
   * Check if multi-platform connectivity is allowed
   */
  static isMultiPlatformAllowed(userPlan: SubscriptionPlan): boolean {
    return userPlan === 'PREMIUM_MONTHLY' || userPlan === 'PREMIUM_YEARLY';
  }

  /**
   * Get the count of connected platforms
   */
  static getConnectedPlatformCount(session?: AuthSession): number {
    if (!session?.connectedPlatforms) return 0;
    
    const platforms = ['facebook', 'instagram', 'twitter', 'amazon'];
    return platforms.filter(platform => this.isPlatformConnected(platform, session)).length;
  }

  /**
   * Validate if user can connect to additional platforms
   */
  static validateAdditionalConnection(platform: string, userPlan: SubscriptionPlan, session?: AuthSession): void {
    // Check platform access based on subscription
    if (!isPlatformAccessible(platform, userPlan)) {
      throw new AuthError(`${platform} connectivity requires a premium subscription`);
    }

    // Check if already connected
    if (this.isPlatformConnected(platform, session)) {
      throw new AuthError(`${platform} is already connected to your account`);
    }

    // For freemium users, limit to single platform connection
    if (userPlan === 'FREEMIUM') {
      const connectedCount = this.getConnectedPlatformCount(session);
      if (connectedCount >= 1) {
        throw new AuthError('Freemium plan allows only one platform connection. Upgrade to Premium for multi-platform connectivity.');
      }
    }
  }

  /**
   * Initiate OAuth flow for a platform
   */
  static async initiateOAuth(request: OAuthInitiationRequest): Promise<OAuthInitiationResponse> {
    const { platform, redirectUri, userPlan, userId } = request;

    // Validate platform access and connection limits
    this.validateAdditionalConnection(platform, userPlan, undefined);

    // Generate secure state
    const state = generateState();

    try {
      switch (platform.toLowerCase()) {
        case 'facebook':
          return {
            authUrl: OAuthService.buildFacebookAuthUrl(state, redirectUri),
            state,
          };

        case 'instagram':
          return {
            authUrl: OAuthService.buildInstagramAuthUrl(state, redirectUri),
            state,
          };

        case 'twitter':
        case 'x':
          // For now, use a placeholder codeChallenge - this should be properly implemented with PKCE
          return {
            authUrl: await OAuthService.buildTwitterAuthUrl(state, redirectUri, 'placeholder'),
            state,
          };

        case 'amazon':
          // Amazon requires premium - check via subscription access lib
          if (userPlan === 'FREEMIUM') {
            throw new AuthError('Premium subscription required for Amazon platform');
          }
          return {
            authUrl: OAuthService.buildAmazonAuthUrl(state, redirectUri),
            state,
          };

        default:
          throw new AuthError(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      logger.error('OAuth initiation failed', { 
        platform, 
        userId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * Get platforms that are locked behind premium subscription
   */
  static getPremiumLockedPlatforms(userPlan: SubscriptionPlan): string[] {
    if (userPlan === 'PREMIUM_MONTHLY' || userPlan === 'PREMIUM_YEARLY') {
      return [];
    }
    return ['amazon'];
  }

  /**
   * Check if a platform requires a specific subscription tier
   */
  static getPlatformRequirements(platform: string): {
    requiresPremium: boolean;
    features: string[];
    limitations: string[];
  } {
    switch (platform.toLowerCase()) {
      case 'amazon':
        return {
          requiresPremium: true,
          features: ['Amazon Advertising insights', 'Campaign performance data', 'Product advertising metrics'],
          limitations: ['Premium subscription required'],
        };
      
      case 'facebook':
        return {
          requiresPremium: false,
          features: ['Post analytics', 'Page insights', 'Engagement metrics'],
          limitations: ['Ads analytics requires Premium'],
        };
      
      case 'instagram':
        return {
          requiresPremium: false,
          features: ['Post analytics', 'Story insights', 'Follower metrics'],
          limitations: ['Ads analytics requires Premium'],
        };
      
      case 'twitter':
      case 'x':
        return {
          requiresPremium: false,
          features: ['Tweet analytics', 'Engagement metrics', 'Follower insights'],
          limitations: ['Ads analytics requires Premium'],
        };
      
      default:
        return {
          requiresPremium: false,
          features: [],
          limitations: ['Unknown platform'],
        };
    }
  }

  // Private helper methods
  private static isPlatformConnected(platform: string, session?: AuthSession): boolean {
    if (!session?.connectedPlatforms) return false;
    
    switch (platform.toLowerCase()) {
      case 'facebook':
        return !!session.connectedPlatforms.facebook?.account?.userId;
      case 'instagram':
        return !!session.connectedPlatforms.instagram?.account?.userId;
      case 'twitter':
      case 'x':
        return !!session.connectedPlatforms.twitter?.account?.userId;
      case 'amazon':
        return !!session.connectedPlatforms.amazon?.account?.userId;
      default:
        return false;
    }
  }

  private static getPlatformUsername(platform: string, session?: AuthSession): string | undefined {
    if (!session?.connectedPlatforms) return undefined;
    
    switch (platform.toLowerCase()) {
      case 'facebook':
        return session.connectedPlatforms.facebook?.account?.username;
      case 'instagram':
        return session.connectedPlatforms.instagram?.account?.username;
      case 'twitter':
      case 'x':
        return session.connectedPlatforms.twitter?.account?.username;
      case 'amazon':
        return session.connectedPlatforms.amazon?.account?.username;
      default:
        return undefined;
    }
  }

  private static getPlatformAccountId(platform: string, session?: AuthSession): string | undefined {
    if (!session?.connectedPlatforms) return undefined;
    
    switch (platform.toLowerCase()) {
      case 'facebook':
        return session.connectedPlatforms.facebook?.account?.userId;
      case 'instagram':
        return session.connectedPlatforms.instagram?.account?.userId;
      case 'twitter':
      case 'x':
        return session.connectedPlatforms.twitter?.account?.userId;
      case 'amazon':
        return session.connectedPlatforms.amazon?.account?.userId;
      default:
        return undefined;
    }
  }

  private static getPlatformConnectedAt(platform: string, session?: AuthSession): Date | undefined {
    // This would typically come from database records
    // For now, return undefined as we don't have this data in the session
    return undefined;
  }

  private static hasValidToken(platform: string, session?: AuthSession): boolean {
    if (!session?.connectedPlatforms) return false;
    
    const now = Date.now();
    
    switch (platform.toLowerCase()) {
      case 'facebook':
        return !!session.connectedPlatforms.facebook?.account_tokens?.access_token && 
               (new Date(session.connectedPlatforms.facebook.account_tokens.expires_at).getTime() > now);
      case 'instagram':
        return !!session.connectedPlatforms.instagram?.account_tokens?.access_token && 
               (new Date(session.connectedPlatforms.instagram.account_tokens.expires_at).getTime() > now);
      case 'twitter':
      case 'x':
        return !!session.connectedPlatforms.twitter?.account_tokens?.access_token && 
               (new Date(session.connectedPlatforms.twitter.account_tokens.expires_at).getTime() > now);
      case 'amazon':
        return !!session.connectedPlatforms.amazon?.account_tokens?.access_token && 
               (new Date(session.connectedPlatforms.amazon.account_tokens.expires_at).getTime() > now);
      default:
        return false;
    }
  }
}
