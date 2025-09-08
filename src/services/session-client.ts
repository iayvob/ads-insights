import { AuthSession } from "@/validations/types";
import Cookies from "js-cookie";
import { logger } from "@/config/logger";
import { env } from "@/validations/env"

/**
 * Client-side authentication helper for use in Pages Router components.
 * This is a wrapper around SessionService that uses only client-side APIs.
 */

export class ClientSessionService {
  /**
   * Decrypt JWT token to session data (client-side wrapper)
   */
  static async decrypt(session: string): Promise<AuthSession | null> {
    try {
      // Client-safe decode: parse JWT payload without verifying signature
      // Never expose server secrets on the client.
      const parts = session.split(".");
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = typeof window !== "undefined"
        ? decodeURIComponent(
            atob(base64)
              .split("")
              .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          )
        : Buffer.from(base64, "base64").toString("utf-8");
      const payload = JSON.parse(jsonPayload) as Partial<AuthSession> & { exp?: number };

      // Optional expiry check using standard `exp` if present
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null;
      }

      // Basic shape validation
      if (!payload || typeof payload !== "object" || !("userId" in payload)) return null;

      return payload as AuthSession;
    } catch (e) {
      logger.warn("Failed to decode client session JWT", { error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }

  /**
   * Get the current user session from the client-side cookie
   */
  // Client-side session management functions
  static async getClientSession(): Promise<AuthSession | null> {
    try {
      // Client-side session handling
      if (typeof window !== 'undefined') {
        const sessionCookie = Cookies.get("session");
        if (!sessionCookie) return null;
        const payload = await this.decrypt(sessionCookie);
        return payload;
      }

      // Server-side - just return null, API routes should handle this
      return null;
    } catch (error) {
      console.error("Client session retrieval error:", error);
      return null;
    }
  }


  static async setClientSession(sessionDataOrToken: AuthSession | string, options: { dontRememberMe?: boolean } = {}): Promise<void> {
    try {
      // Only proceed if we're in a browser environment
      if (typeof window === 'undefined') {
        console.warn("Cannot set session on client side from server environment");
        return;
      }

      // We MUST NOT encrypt/sign on the client. Expect a pre-signed JWT string.
      const session = typeof sessionDataOrToken === "string"
        ? sessionDataOrToken
        : (console.warn("setClientSession called with object. Expected a JWT string from server. No cookie set."), null);

      if (!session) return;

      // Cookie expiration behavior:
      // 1. If dontRememberMe is true: Session cookie (expires when browser closes)
      // 2. If dontRememberMe is false (or undefined): 30-day persistent cookie
    if (options.dontRememberMe) {
        // Session cookie (expires when browser closes)
        Cookies.set("session", session, {
      secure: env.NODE_ENV === "production",
          sameSite: 'lax',
          path: '/',
        });
      } else {
        // Set with expiration date for persistent session (30 days)
        Cookies.set("session", session, {
          expires: 30, // days
      secure: env.NODE_ENV === "production",
          sameSite: 'lax',
          path: '/',
        });
      }

      logger.info("Client session set successfully", {
        payloadHint: "jwt",
        rememberMe: !options.dontRememberMe
      });
    } catch (error) {
      console.error("Client session setting error:", error);
      throw new Error("Failed to set client session");
    }
  }

  static clearClientSession(): void {
    try {
      // Only proceed if we're in a browser environment
      if (typeof window === 'undefined') {
        console.warn("Cannot clear session on client side from server environment");
        return;
      }

      Cookies.remove("session", { path: "/" });
      logger.info("Client session cleared successfully");
    } catch (error) {
      console.error("Client session clearing error:", error);
    }
  }

  /**
   * Check if a user is authenticated by verifying the client-side session cookie
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const session = await this.getClientSession();
      return !!session && !!session.userId;
    } catch (error) {
      console.error("Error checking authentication status:", error);
      return false;
    }
  }

  // Password hashing/verification are server-only concerns. Use API endpoints instead.

  /**
   * Get user profile information from session
   */
  static async getUserProfile(): Promise<{ user: any; plan?: string } | null> {
    try {
      const session = await this.getClientSession();
      if (!session) return null;

      return {
        user: session.user,
        plan: (session.user as any)?.plan || 'freemium'
      };
    } catch (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
  }

  /**
   * Check if user has premium plan
   */
  static async isPremiumUser(): Promise<boolean> {
    try {
      const profile = await this.getUserProfile();
      return profile?.plan === 'premium';
    } catch (error) {
      console.error("Error checking premium status:", error);
      return false;
    }
  }

  /**
   * Update session with new data (client-side merge)
   */
  static async updateSession(updates: Partial<AuthSession>): Promise<void> {
    try {
      const currentSession = await this.getClientSession();
      if (!currentSession) {
        throw new Error("No active session to update");
      }

  // Client cannot re-sign JWT. Call your API to update and return a new token, then set it via setClientSession(token).
  console.warn("updateSession is not supported on client-only. Use a server API to issue a new session JWT.");
  throw new Error("Client-only updateSession unsupported");
    } catch (error) {
      console.error("Error updating session:", error);
      throw new Error("Failed to update session");
    }
  }

  /**
   * Refresh session data from server
   */
  static async refreshSession(): Promise<AuthSession | null> {
    try {
      // This would typically make an API call to refresh session data
      // For now, we'll just return the current session
      return this.getClientSession();
    } catch (error) {
      console.error("Error refreshing session:", error);
      return null;
    }
  }

  /**
   * Get session expiry information
   */
  static async getSessionExpiry(): Promise<Date | null> {
    try {
      const session = await this.getClientSession();
      if (!session?.user_tokens?.expires_at) return null;

      return new Date(session.user_tokens.expires_at);
    } catch (error) {
      console.error("Error getting session expiry:", error);
      return null;
    }
  }

  /**
   * Check if session is expired
   */
  static async isSessionExpired(): Promise<boolean> {
    try {
      const expiryDate = await this.getSessionExpiry();
      if (!expiryDate) return false;

      return Date.now() > expiryDate.getTime();
    } catch (error) {
      console.error("Error checking session expiry:", error);
      return true; // Assume expired on error for security
    }
  }

  /**
   * Get connected platforms from session
   */
  static async getConnectedPlatforms(): Promise<string[]> {
    try {
      const session = await this.getClientSession();
      if (!session?.connectedPlatforms) return [];

      return Object.keys(session.connectedPlatforms).filter(platform =>
        session.connectedPlatforms && session.connectedPlatforms[platform as keyof typeof session.connectedPlatforms]
      );
    } catch (error) {
      console.error("Error getting connected platforms:", error);
      return [];
    }
  }

  /**
   * Check if a specific platform is connected
   */
  static async isPlatformConnected(platform: 'facebook' | 'instagram' | 'twitter' | 'amazon'): Promise<boolean> {
    try {
      const connectedPlatforms = await this.getConnectedPlatforms();
      return connectedPlatforms.includes(platform);
    } catch (error) {
      console.error(`Error checking ${platform} connection:`, error);
      return false;
    }
  }
}

// Named exports for direct import where preferred
export const decrypt = ClientSessionService.decrypt.bind(ClientSessionService);
export const getClientSession = ClientSessionService.getClientSession.bind(ClientSessionService);
export const setClientSession = ClientSessionService.setClientSession.bind(ClientSessionService);
export const clearClientSession = ClientSessionService.clearClientSession.bind(ClientSessionService);
export const isAuthenticated = ClientSessionService.isAuthenticated.bind(ClientSessionService);
export const getUserProfile = ClientSessionService.getUserProfile.bind(ClientSessionService);
export const isPremiumUser = ClientSessionService.isPremiumUser.bind(ClientSessionService);
export const updateSession = ClientSessionService.updateSession.bind(ClientSessionService);
export const refreshSession = ClientSessionService.refreshSession.bind(ClientSessionService);
export const getSessionExpiry = ClientSessionService.getSessionExpiry.bind(ClientSessionService);
export const isSessionExpired = ClientSessionService.isSessionExpired.bind(ClientSessionService);
export const getConnectedPlatforms = ClientSessionService.getConnectedPlatforms.bind(ClientSessionService);
export const isPlatformConnected = ClientSessionService.isPlatformConnected.bind(ClientSessionService);