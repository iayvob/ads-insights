import { logger } from "@/config/logger";
import { OAuthService } from "@/services/oauth";
import { UserService } from "@/services/user";

/**
 * A utility service to handle token refresh and management
 * Can be used in API routes or scheduled tasks
 */
export class TokenRefreshService {
  /**
   * Refreshes tokens for all connected providers for a user
   * @param userId The user ID to refresh tokens for
   */
  static async refreshAllUserTokens(userId: string) {
    try {
      // Get all providers for user
      const providers = await UserService.getActiveProviders(userId);
      
      if (!providers || providers.length === 0) {
        logger.info("No active providers to refresh for user", { userId });
        return { success: false, message: "No active providers" };
      }
      
      logger.info("Starting token refresh for user", { 
        userId, 
        providerCount: providers.length,
        providers: providers.map(p => p.provider)
      });
      
      const results = [];
      
      // Refresh each provider token as needed
      for (const provider of providers) {
        // Skip if not expiring soon (more than 24 hours remaining)
        const now = new Date();
        const expiresAt = provider.expiresAt ? new Date(provider.expiresAt) : null;
        const isExpiringSoon = expiresAt && 
          ((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)) < 24;
        
        // Only refresh tokens that are expiring soon or already expired
        if (!isExpiringSoon && expiresAt && expiresAt > now) {
          results.push({
            provider: provider.provider,
            refreshed: false,
            message: "Not expiring soon"
          });
          continue;
        }
        
        // Handle refresh based on provider type
        switch (provider.provider) {
          case 'facebook':
            // Facebook uses long-lived tokens that last 60 days
            // Attempt to refresh if less than 5 days remaining
            if (provider.refreshToken || 
               (expiresAt && ((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) < 5)) {
              const result = await this.refreshFacebookToken(userId, provider.id);
              results.push({
                provider: 'facebook',
                ...result
              });
            }
            break;
            
          case 'twitter':
            // Twitter supports refresh tokens
            if (provider.refreshToken) {
              const result = await this.refreshTwitterToken(userId, provider.id, provider.refreshToken);
              results.push({
                provider: 'twitter',
                ...result
              });
            }
            break;
            
          case 'instagram':
            // Instagram uses long-lived tokens from Facebook
            if (provider.refreshToken || 
               (expiresAt && ((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) < 5)) {
              const result = await this.refreshInstagramToken(userId, provider.id);
              results.push({
                provider: 'instagram',
                ...result
              });
            }
            break;
            
          default:
            results.push({
              provider: provider.provider,
              refreshed: false,
              message: "Provider refresh not supported"
            });
        }
      }
      
      return {
        success: true,
        results
      };
    } catch (error) {
      logger.error("Error refreshing user tokens", {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Refreshes a Facebook token
   */
  static async refreshFacebookToken(userId: string, providerId: string) {
    try {
      // Get the provider
      const provider = await UserService.getProviderById(providerId);
      if (!provider || !provider.accessToken) {
        return { refreshed: false, message: "Provider or access token not found" };
      }
      
      // Attempt to refresh the token
      const longLivedToken = await OAuthService.getLongLivedFacebookToken(provider.accessToken);
      
      if (!longLivedToken || !longLivedToken.access_token) {
        return { refreshed: false, message: "Could not obtain long-lived token" };
      }
      
      // Calculate new expiration
      const expiresIn = longLivedToken.expires_in || 60 * 24 * 60 * 60; // Default 60 days
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      
      // Update the provider with the new token
      await UserService.updateProviderToken(
        providerId, 
        longLivedToken.access_token,
        longLivedToken.refresh_token || null,
        expiresAt
      );
      
      logger.info("Successfully refreshed Facebook token", {
        userId,
        providerId,
        expiresAt
      });
      
      return { 
        refreshed: true, 
        expiresAt, 
        message: "Token refreshed successfully"
      };
    } catch (error) {
      logger.error("Error refreshing Facebook token", {
        userId,
        providerId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        refreshed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Refreshes a Twitter token using the refresh token
   */
  static async refreshTwitterToken(userId: string, providerId: string, refreshToken: string) {
    try {
      if (!refreshToken) {
        return { refreshed: false, message: "No refresh token available" };
      }
      
      // Get new token using the refresh token
      const newTokenData = await OAuthService.refreshTwitterToken(refreshToken);
      
      if (!newTokenData || !newTokenData.access_token) {
        return { refreshed: false, message: "Token refresh failed" };
      }
      
      // Calculate new expiration
      const expiresIn = newTokenData.expires_in || 7200; // Default 2 hours
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      
      // Update the provider with the new tokens
      await UserService.updateProviderToken(
        providerId,
        newTokenData.access_token,
        newTokenData.refresh_token || null,
        expiresAt
      );
      
      logger.info("Successfully refreshed Twitter token", {
        userId,
        providerId,
        expiresAt
      });
      
      return {
        refreshed: true,
        expiresAt,
        message: "Token refreshed successfully"
      };
    } catch (error) {
      logger.error("Error refreshing Twitter token", {
        userId,
        providerId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        refreshed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Refreshes an Instagram token
   */
  static async refreshInstagramToken(userId: string, providerId: string) {
    try {
      // Get the provider
      const provider = await UserService.getProviderById(providerId);
      if (!provider || !provider.accessToken) {
        return { refreshed: false, message: "Provider or access token not found" };
      }
      
      // Attempt to refresh the token - Instagram uses Facebook's token system
      const longLivedToken = await OAuthService.getLongLivedInstagramToken(provider.accessToken);
      
      if (!longLivedToken || !longLivedToken.access_token) {
        return { refreshed: false, message: "Could not obtain long-lived token" };
      }
      
      // Calculate new expiration
      const expiresIn = longLivedToken.expires_in || 60 * 24 * 60 * 60; // Default 60 days
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      
      // Update the provider with the new token
      await UserService.updateProviderToken(
        providerId, 
        longLivedToken.access_token,
        longLivedToken.refresh_token || null,
        expiresAt
      );
      
      logger.info("Successfully refreshed Instagram token", {
        userId,
        providerId,
        expiresAt
      });
      
      return { 
        refreshed: true, 
        expiresAt, 
        message: "Token refreshed successfully"
      };
    } catch (error) {
      logger.error("Error refreshing Instagram token", {
        userId,
        providerId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        refreshed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
