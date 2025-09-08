
export { }
import { type NextRequest, NextResponse } from "next/server"
import { SignJWT, jwtVerify } from "jose"
import { AuthSession } from "@/validations/types"
import { env } from "@/validations/env"
import { logger } from "@/config/logger"
import { AuthError } from "@/lib/errors"
import { JwtPayload } from "jsonwebtoken"
import { cookies } from "next/headers"
import { APP_CONFIG } from "@/config/data/consts"
import bcrypt from "bcryptjs"
import { authRateLimit } from "@/config/middleware/rate-limiter"


export interface RateLimitResult {
  allowed: boolean;
  resetTime?: Date;
}

/**
 * Unified Session Management Service
 * Provides both server-side and client-side session management capabilities
 */
export class ServerSessionService {
  private static readonly encodedKey = new TextEncoder().encode(env.SESSION_SECRET)
  private static readonly JWT_SECRET = env.JWT_SECRET!
  private static readonly JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET!

  // In-memory rate limiting store
  private static readonly loginAttempts = new Map<string, { count: number; lastAttempt: number }>()

  static {
    if (!this.JWT_SECRET || !this.JWT_REFRESH_SECRET) {
      throw new Error("JWT secrets are not configured")
    }
  }

  /**
   * Encrypt session data into a JWT token (now using minimal session)
   */
  static async encrypt(payload: AuthSession): Promise<string> {
    return new SignJWT(payload as JwtPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(new Date(Date.now() + APP_CONFIG.SESSION_DURATION))
      .sign(this.encodedKey)
  }

  /**
   * Decrypt JWT token to minimal session data
   */
  static async decrypt(session: string): Promise<AuthSession | null> {
    try {
      const { payload } = await jwtVerify(session, this.encodedKey, {
        algorithms: ["HS256"],
      })

      // Ensure payload has the right structure
      if (typeof payload === 'object' && payload !== null && 'userId' in payload) {
        return payload as unknown as AuthSession;
      }
      return null;
    } catch (error) {
      logger.warn("Failed to decrypt session", { error: error instanceof Error ? error.message : "Unknown error" })
      return null
    }
  }

  /**
   * Get minimal session from request cookies (server-side)
   */
  static async getSession(request: NextRequest): Promise<AuthSession | null> {
    const sessionCookie = request.cookies.get("session")?.value
    if (!sessionCookie) return null

    const session = await this.decrypt(sessionCookie)

    // Validate session age
    if (
      session &&
      session.user_tokens?.expires_at &&
      Date.now() > new Date(session.user_tokens.expires_at).getTime()
    ) {
      logger.info("Session expired", { userId: session.userId })
      return null
    }

    return session
  }

  /**
   * Set minimal session cookie (server-side)
   */
  static async setSession(
    _request: NextRequest,
    sessionData: AuthSession,
    response?: NextResponse,
  ): Promise<NextResponse> {
    try {

      const session = await this.encrypt({
        ...sessionData,
      })

      const responseToUse = response || NextResponse.json({ success: true })

      responseToUse.cookies.set("session", session, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: APP_CONFIG.SESSION_DURATION / 1000,
        path: "/",
      })

      logger.info("Minimal session set successfully", {
        userId: sessionData.userId,
      })

      return responseToUse
    } catch (error) {
      logger.error("Failed to set session", { error: error instanceof Error ? error.message : "Unknown error" })
      throw new AuthError("Failed to set session")
    }
  }

  /**
   * Clear session cookie (server-side)
   */
  static async clearSession(response: NextResponse): Promise<void> {
    // Multiple approaches to ensure cookie is cleared in different browsers

    // Approach 1: Delete the cookie
    response.cookies.delete("session");

    // Approach 2: Set with empty value and immediate expiry
    response.cookies.set("session", "", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/",
      expires: new Date(0), // Set expiration date in the past
    });

    // Approach 3: Override with invalid value
    response.cookies.set("session", "deleted", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: -1, // Negative max age
      path: "/",
    });

    logger.info("Session cookie cleared using multiple approaches");
  }

  /**
   * Require authentication middleware
   */
  static async requireAuth(request: NextRequest): Promise<AuthSession> {
    const session = await this.getSession(request)
    if (!session?.userId) {
      throw new AuthError("Authentication required")
    }
    return session
  }

  /**
   * Get user tokens from request cookies
   */
  static async getUserTokens(request: NextRequest): Promise<{ accessToken: string | undefined; refreshToken: string | undefined }> {
    const cookies = request.cookies
    return {
      accessToken: cookies.get("accessToken")?.value,
      refreshToken: cookies.get("refreshToken")?.value,
    }
  }

  /**
   * Logout user and clear session
   */
  static async logoutUser(request: NextRequest): Promise<NextResponse> {
    const session = await this.getSession(request);

    // Create a response that will be sent back to the client
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
      timestamp: Date.now() // Add timestamp to prevent caching
    });

    // Use our improved clearSession function
    await this.clearSession(response);

    if (session?.userId) {
      logger.info("User logged out", {
        userId: session.userId,
        connectedPlatforms: session.connectedPlatforms || [],
        timestamp: new Date().toISOString()
      });
    }

    // Add cache control headers to prevent caching
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  }

  /**
   * Add platform to minimal session
   */
  static async addPlatformToSession(request: NextRequest, platform: string): Promise<NextResponse> {
    const session = await this.getSession(request);

    if (!session?.userId) {
      throw new AuthError("Authentication required");
    }

    try {
      // Initialize connectedPlatforms object if not exists
      const connectedPlatforms = session.connectedPlatforms || {};
      
      // Set platform as connected in the object structure
      const updatedConnectedPlatforms = {
        ...connectedPlatforms,
        [platform]: {
          account: {
            userId: '',
            username: '',
            email: ''
          },
          account_tokens: {
            access_token: '',
            refresh_token: '',
            expires_at: new Date(Date.now() + 3600000).toISOString()
          }
        }
      };

      const updatedSession: AuthSession = {
        ...session,
        connectedPlatforms: updatedConnectedPlatforms,
      };

      logger.info("Platform added to session", {
        userId: session.userId,
        platform,
        connectedPlatforms: Object.keys(updatedConnectedPlatforms)
      });

      // Update session with new connected platforms object
      return await this.setSession(request, updatedSession);
    } catch (error) {
      logger.error("Failed to add platform to session", {
        userId: session.userId,
        platform,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw new AuthError("Failed to add platform");
    }
  }
  static async logoutPlatform(
    request: NextRequest,
    platform: 'facebook' | 'instagram' | 'twitter' | 'amazon'
  ): Promise<NextResponse> {
    const session = await this.getSession(request);

    // If no session, return success
    if (!session?.userId) {
      logger.info(`No active ${platform} session found to logout`);
      return NextResponse.json({
        success: true,
        message: `No active ${platform} session found`,
        timestamp: Date.now()
      });
    }

    // Check if platform is in connectedPlatforms object
    if (!session.connectedPlatforms?.[platform]) {
      logger.info(`${platform} not connected for user ${session.userId}`);
      return NextResponse.json({
        success: true,
        message: `${platform} not connected`,
        timestamp: Date.now()
      });
    }

    try {
      // Remove platform from connectedPlatforms object
      const updatedConnectedPlatforms = { ...session.connectedPlatforms };
      delete updatedConnectedPlatforms[platform];

      const updatedSession: AuthSession = {
        ...session,
        connectedPlatforms: updatedConnectedPlatforms,
      };

      logger.info(`Removing ${platform} from session`, {
        userId: session.userId,
        remainingPlatforms: Object.keys(updatedConnectedPlatforms)
      });

      // Create response with cache control headers
      const response = NextResponse.json({
        success: true,
        message: `${platform} session data cleared`,
        timestamp: Date.now()
      });

      // Add cache control headers to prevent caching
      response.headers.set("Cache-Control", "no-store, max-age=0");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");

      // Set updated session
      await this.setSession(request, updatedSession, response);

      logger.info(`${platform} session data cleared`, { userId: session.userId });
      return response;
    } catch (error) {
      logger.error(`${platform} logout error:`, error);
      return NextResponse.json({
        error: `Failed to logout from ${platform}`,
        timestamp: Date.now()
      }, { status: 500 });
    }
  }


  /**
   * Set authentication cookies (access and refresh tokens)
   */
  static async setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
    const cookieStore = await cookies()

    // Set access token cookie (shorter expiry)
    cookieStore.set("access-token", accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    })

    // Set refresh token cookie (longer expiry)
    cookieStore.set("refresh-token", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    })
  }

  /**
   * Clear authentication cookies
   */
  static async clearAuthCookies(): Promise<void> {
    const cookieStore = await cookies()

    cookieStore.delete("access-token")
    cookieStore.delete("refresh-token")
    cookieStore.delete("user-plan")
  }

  /**
   * Get Platform tokens (updated for minimal session)
   */
  static async getTokenFromCookiesPerPlatform(platform: 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'amazon' | 'user', request: NextRequest): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const session = await ServerSessionService.getSession(request);

    // If no session available, always return null tokens
    if (!session?.userId) {
      return {
        accessToken: null,
        refreshToken: null,
      };
    }

    if (platform === 'user') {
      return {
        accessToken: session.user_tokens?.access_token || null,
        refreshToken: session.user_tokens?.refresh_token || null,
      };
    }

    // For platform tokens, get from database using getActiveProviders
    try {
      const { UserService } = await import('@/services/user');
      const providers = await UserService.getActiveProviders(session.userId);

      const authProvider = providers.find(p => p.provider === platform);

      if (!authProvider) {
        return {
          accessToken: null,
          refreshToken: null,
        };
      }

      return {
        accessToken: authProvider.accessToken,
        refreshToken: authProvider.refreshToken,
      };
    } catch (error) {
      logger.error(`Failed to get tokens for platform ${platform}:`, error);
      return {
        accessToken: null,
        refreshToken: null,
      };
    }
  }

  // Password hashing/verification
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Utility: get client IP
  static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    if (forwarded) return forwarded.split(",")[0].trim();
    if (realIP) return realIP;
    return "unknown";
  }

  // Rate limiting using the middleware rate limiter
  static async checkRateLimit(
    request: NextRequest,
    action: string,
    maxAttempts = 5,
    windowMs = 60 * 1000
  ): Promise<RateLimitResult> {
    try {
      const identifier = this.getClientIP(request);
      const key = `${action}:${identifier}`;

      // Use the built-in rate limiter for enhanced functionality
      const result = await authRateLimit(request);

      if (result.success) {
        return { allowed: true };
      } else {
        return {
          allowed: false,
          resetTime: result.resetTime ? new Date(result.resetTime) : undefined
        };
      }
    } catch (error) {
      logger.error("Enhanced rate limit check failed:", error);
      // Fallback to simple in-memory rate limiting
      const identifier = this.getClientIP(request);
      const now = Date.now();
      const attempt = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
      if (now - attempt.lastAttempt > windowMs) {
        attempt.count = 1;
        attempt.lastAttempt = now;
      } else {
        attempt.count += 1;
        attempt.lastAttempt = now;
      }
      this.loginAttempts.set(identifier, attempt);
      const allowed = attempt.count <= maxAttempts;
      return { allowed, resetTime: allowed ? undefined : new Date(attempt.lastAttempt + windowMs) };
    }
  }

  // Utility function to set cookies in API responses
  static setResponseCookie(
    response: Response,
    name: string,
    value: string,
    options: {
      maxAge?: number;
      path?: string;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none'
    } = {}
  ): Response {
    const cookieValue = [
      `${name}=${value}`,
      options.httpOnly ? 'HttpOnly' : '',
      options.secure !== false ? 'Secure' : '', // Default to secure unless explicitly set to false
      options.sameSite ? `SameSite=${options.sameSite}` : 'SameSite=lax',
      options.path ? `Path=${options.path}` : 'Path=/',
      options.maxAge ? `Max-Age=${options.maxAge}` : '',
    ].filter(Boolean).join('; ');

    response.headers.append('Set-Cookie', cookieValue);
    return response;
  }
}