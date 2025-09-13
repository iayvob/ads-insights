"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from './session-context';
import { logger } from '@/config/logger';

// Define subscription plan type used in this component
type SubscriptionPlan = 'FREEMIUM' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY';

export interface ConnectedPlatform {
  platform: string;
  isConnected: boolean;
  username?: string;
  accountId?: string;
  connectedAt?: Date;
  hasValidToken: boolean;
  requiresPremium: boolean;
}

export interface PlatformRequirements {
  requiresPremium: boolean;
  features: string[];
  limitations: string[];
}

export interface OAuthStatus {
  userPlan: SubscriptionPlan;
  availablePlatforms: ConnectedPlatform[];
  connectedCount: number;
  isMultiPlatformAllowed: boolean;
  premiumLockedPlatforms: string[];
  platformRequirements: Record<string, PlatformRequirements>;
  limits: {
    freemiumMaxConnections: number;
    premiumMaxConnections: string;
  };
}

export interface UseOAuthReturn {
  status: OAuthStatus | null;
  loading: boolean;
  error: string | null;
  connectPlatform: (platform: string) => Promise<void>;
  disconnectPlatform: (platform: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
  canConnectPlatform: (platform: string) => { canConnect: boolean; reason?: string };
}

/**
 * Hook for managing OAuth platform connections with subscription awareness
 */
export function useOAuth(): UseOAuthReturn {
  const [status, setStatus] = useState<OAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: sessionData } = useSession();

  /**
   * Fetch current OAuth status
   */
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/oauth/status', {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch OAuth status');
      }

      const data = await response.json();
      setStatus(data.data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      logger.error('Failed to fetch OAuth status', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Connect to a platform
   */
  const connectPlatform = useCallback(async (platform: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Check if user can connect to this platform
      const canConnect = canConnectPlatform(platform);
      if (!canConnect.canConnect) {
        throw new Error(canConnect.reason || 'Cannot connect to this platform');
      }

      // Initiate OAuth flow
      const response = await fetch(`/api/auth/oauth/initiate?platform=${encodeURIComponent(platform)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate OAuth flow');
      }

      const data = await response.json();

      // Redirect to OAuth provider
      if (data.data.authUrl) {
        // Store platform info in sessionStorage for post-auth handling
        sessionStorage.setItem('oauth_platform', platform);
        // Open auth URL in a new tab
        window.open(data.data.authUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No authorization URL received');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect platform';
      setError(errorMessage);
      logger.error('Failed to connect platform', { platform, error: errorMessage });
      setLoading(false);
    }
  }, [status]);

  /**
   * Disconnect from a platform
   */
  const disconnectPlatform = useCallback(async (platform: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/auth/oauth/disconnect?platform=${encodeURIComponent(platform)}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect platform');
      }

      // Refresh status after successful disconnect
      await fetchStatus();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect platform';
      setError(errorMessage);
      logger.error('Failed to disconnect platform', { platform, error: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  /**
   * Check if user can connect to a platform
   */
  const canConnectPlatform = useCallback((platform: string): { canConnect: boolean; reason?: string } => {
    if (!status) {
      return { canConnect: false, reason: 'Status not loaded' };
    }

    // Check if platform is already connected
    const platformInfo = status.availablePlatforms.find(p => p.platform === platform);
    if (platformInfo?.isConnected) {
      return { canConnect: false, reason: 'Platform is already connected' };
    }

    // Check if platform requires premium and user doesn't have it
    if (status.premiumLockedPlatforms.includes(platform)) {
      return { canConnect: false, reason: 'This platform requires a premium subscription' };
    }

    // Check connection limits for freemium users
    if (status.userPlan === 'FREEMIUM' && status.connectedCount >= status.limits.freemiumMaxConnections) {
      return {
        canConnect: false,
        reason: 'Freemium plan allows only one platform connection. Upgrade to Premium for multi-platform connectivity.'
      };
    }

    return { canConnect: true };
  }, [status]);

  /**
   * Refresh OAuth status
   */
  const refreshStatus = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  // Load initial status
  useEffect(() => {
    if (sessionData?.user?.id) {
      fetchStatus();
    }
  }, [sessionData?.user?.id, fetchStatus]);

  // Handle OAuth callback completion
  useEffect(() => {
    const handleOAuthCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      const platform = sessionStorage.getItem('oauth_platform');

      if (code && state && platform) {
        // OAuth flow completed successfully, refresh status
        sessionStorage.removeItem('oauth_platform');

        // Clear URL parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        // Refresh status to reflect new connection
        setTimeout(() => {
          fetchStatus();
        }, 1000);
      } else if (error) {
        // OAuth error occurred
        setError(`OAuth error: ${error}`);
        sessionStorage.removeItem('oauth_platform');

        // Clear URL parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    };

    // Check for OAuth callback on component mount
    handleOAuthCallback();
  }, [fetchStatus]);

  return {
    status,
    loading,
    error,
    connectPlatform,
    disconnectPlatform,
    refreshStatus,
    canConnectPlatform,
  };
}
