import { APP_CONFIG } from "@/config/data/consts"
import { prisma } from "@/config/database/prisma"
import { logger } from "@/config/logger"
import { DatabaseError } from "@/lib/errors"
import { AuthProviderInput, CreateUserInput, UserWithProviders, AuthSession } from "@/validations/types"
import { validateAndSanitizeUser } from "@/validations/validation"
import { AuthProvider, User } from "@prisma/client"

export class UserService {
  /**
   * Build full session data from minimal session and database
   */
  static async buildFullSessionFromMinimal(minimalSession: AuthSession): Promise<AuthSession> {
    try {
      logger.info("Building full session from minimal", { userId: minimalSession.userId });

      const user = await prisma.user.findUnique({
        where: { id: minimalSession.userId },
      });

      if (!user) {
        logger.error("User not found for session", { userId: minimalSession.userId });
        throw new DatabaseError("User not found");
      }

      logger.info("User found, getting active providers", { userId: minimalSession.userId });
      const authProviders = await this.getActiveProviders(minimalSession.userId);
      logger.info("Active providers retrieved", {
        userId: minimalSession.userId,
        providerCount: authProviders.length,
        providers: authProviders.map(p => p.provider)
      });

      // Build connected platforms data
      const connectedPlatforms: AuthSession['connectedPlatforms'] = {};

      for (const provider of authProviders) {
        logger.info("Processing provider", {
          provider: provider.provider,
          providerId: provider.providerId
        });

        let businessAccounts = null;
        let analyticsSummary = null;

        try {
          if (provider.businessAccounts) {
            businessAccounts = typeof provider.businessAccounts === 'string'
              ? JSON.parse(provider.businessAccounts)
              : provider.businessAccounts;
          }
          if (provider.analyticsSummary) {
            analyticsSummary = typeof provider.analyticsSummary === 'string'
              ? JSON.parse(provider.analyticsSummary)
              : provider.analyticsSummary;
          }
        } catch (e) {
          logger.warn("Failed to parse provider data", { provider: provider.provider, error: e });
        }

        connectedPlatforms[provider.provider as keyof typeof connectedPlatforms] = {
          account: {
            userId: provider.providerId,
            username: provider.username || '',
            email: provider.email || '',
            name: provider.displayName,
            profile_picture_url: provider.profileImage,
            followers_count: provider.followersCount,
            media_count: provider.mediaCount,
            account_type: provider.accountType,
            businessAccounts: businessAccounts?.business_accounts || [],
            adAccounts: businessAccounts?.ad_accounts || [],
            advertisingAccountId: provider.advertisingAccountId,
            can_access_insights: provider.canAccessInsights,
            can_publish_content: provider.canPublishContent,
            can_manage_ads: provider.canManageAds,
          } as any,
          account_tokens: {
            access_token: provider.accessToken || '',
            access_token_secret: provider.accessTokenSecret, // Include OAuth 1.0a secret
            refresh_token: provider.refreshToken,
            expires_at: provider.expiresAt?.toISOString() || new Date(Date.now() + 3600000).toISOString(),
          },
          analytics_summary: analyticsSummary || {},
          connected_at: provider.createdAt?.toISOString(),
          last_updated: provider.updatedAt?.toISOString()
        } as any;
      }

      logger.info("Building final session object", { userId: minimalSession.userId });
      const fullSession: AuthSession = {
        userId: minimalSession.userId,
        plan: user.plan,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          image: user.image,
        },
        user_tokens: minimalSession.user_tokens,
        state: minimalSession.state,
        codeVerifier: minimalSession.codeVerifier,
        codeChallenge: minimalSession.codeChallenge,
        createdAt: minimalSession.createdAt,
        connectedPlatforms,
      };

      logger.info("Full session built successfully", { userId: minimalSession.userId });
      return fullSession;
    } catch (error) {
      logger.error("Failed to build full session from minimal", {
        userId: minimalSession.userId,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : String(error),
        step: "unknown"
      });
      throw new DatabaseError("Failed to build session data");
    }
  }
  static async findOrCreateUserByEmail(email: string, userData?: CreateUserInput): Promise<UserWithProviders> {
    try {
      const sanitizedData = userData ? validateAndSanitizeUser(userData) : {} as Partial<CreateUserInput>

      let user = await prisma.user.findUnique({
        where: { email },
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            password: "",
            username: sanitizedData.username || `user_${Date.now()}`,
            plan: "FREEMIUM",
          },
        })
        logger.info("User created", { userId: user.id, email })
      }

      // Manually fetch auth providers since relation might not be defined
      const authProviders = await prisma.authProvider.findMany({
        where: { userId: user.id },
      })

      return {
        ...user,
        authProviders,
      } as UserWithProviders
    } catch (error) {
      logger.error("Failed to find or create user", { error, email })
      throw new DatabaseError("Failed to create user account")
    }
  }

  static async findUserByProvider(provider: string, providerId: string): Promise<UserWithProviders | null> {
    try {
      // Use providerId field as per schema
      const authProvider = await prisma.authProvider.findFirst({
        where: {
          provider: provider as any,
          providerId: providerId,
        },
      })

      if (!authProvider) {
        return null
      }

      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: authProvider.userId },
      })

      if (!user) {
        return null
      }

      // Get all auth providers for this user
      const authProviders = await prisma.authProvider.findMany({
        where: { userId: user.id },
      })

      return {
        ...user,
        authProviders,
      } as UserWithProviders
    } catch (error) {
      logger.error("Failed to find user by provider", { error, provider, providerId })
      throw new DatabaseError("Failed to find user")
    }
  }

  static async upsertAuthProvider(userId: string, providerData: AuthProviderInput): Promise<AuthProvider> {
    try {
      // Debug logging
      logger.info("Upserting auth provider", {
        userId,
        provider: providerData.provider,
        providerId: providerData.providerId,
        hasAccessToken: !!providerData.accessToken,
        expiresAt: providerData.expiresAt
      })

      // Enhanced provider search strategy
      // Step 1: Look for existing provider for this specific user and provider type
      const existingProviderForUser = await prisma.authProvider.findFirst({
        where: {
          userId,
          provider: providerData.provider as any,
        },
      })

      // Step 2: Look for any provider with this exact providerId (cross-user search)
      const existingProviderWithId = await prisma.authProvider.findFirst({
        where: {
          provider: providerData.provider as any,
          providerId: providerData.providerId,
        },
      })

      let result: AuthProvider

      if (existingProviderForUser) {
        // Case 1: User already has this provider type - update it
        logger.info("Updating existing provider for user", {
          providerId: existingProviderForUser.id,
          provider: providerData.provider
        })
        result = await prisma.authProvider.update({
          where: { id: existingProviderForUser.id },
          data: {
            providerId: providerData.providerId, // Update the providerId 
            email: providerData.email,
            username: providerData.username,
            displayName: providerData.displayName,
            profileImage: providerData.profileImage,
            name: providerData.name,
            followersCount: providerData.followersCount,
            mediaCount: providerData.mediaCount,
            accountType: providerData.accountType,
            canAccessInsights: providerData.canAccessInsights,
            canPublishContent: providerData.canPublishContent,
            canManageAds: providerData.canManageAds,
            accessToken: providerData.accessToken,
            accessTokenSecret: providerData.accessTokenSecret,
            refreshToken: providerData.refreshToken,
            expiresAt: providerData.expiresAt,
            ...(providerData.scopes && { scopes: providerData.scopes }), // Conditionally add scopes
            advertisingAccountId: providerData.advertisingAccountId,
            businessAccounts: providerData.businessAccounts ? JSON.stringify(providerData.businessAccounts) : null,
            adAccounts: providerData.adAccounts ? JSON.stringify(providerData.adAccounts) : null,
            configId: providerData.configId,
            analyticsSummary: providerData.analyticsSummary ? JSON.stringify(providerData.analyticsSummary) : null,
            updatedAt: new Date()
          },
        })
      } else if (existingProviderWithId && existingProviderWithId.userId !== userId) {
        // Case 2: Another user has this exact providerId - transfer it to current user
        logger.info("Transferring provider from different user", {
          fromUserId: existingProviderWithId.userId,
          toUserId: userId,
          providerId: existingProviderWithId.id,
          provider: providerData.provider
        })
        result = await prisma.authProvider.update({
          where: { id: existingProviderWithId.id },
          data: {
            userId, // Transfer to current user
            email: providerData.email,
            username: providerData.username,
            displayName: providerData.displayName,
            profileImage: providerData.profileImage,
            name: providerData.name,
            followersCount: providerData.followersCount,
            mediaCount: providerData.mediaCount,
            accountType: providerData.accountType,
            canAccessInsights: providerData.canAccessInsights,
            canPublishContent: providerData.canPublishContent,
            canManageAds: providerData.canManageAds,
            accessToken: providerData.accessToken,
            accessTokenSecret: providerData.accessTokenSecret,
            refreshToken: providerData.refreshToken,
            expiresAt: providerData.expiresAt,
            ...(providerData.scopes && { scopes: providerData.scopes }),
            advertisingAccountId: providerData.advertisingAccountId,
            businessAccounts: providerData.businessAccounts ? JSON.stringify(providerData.businessAccounts) : null,
            adAccounts: providerData.adAccounts ? JSON.stringify(providerData.adAccounts) : null,
            configId: providerData.configId,
            analyticsSummary: providerData.analyticsSummary ? JSON.stringify(providerData.analyticsSummary) : null,
            updatedAt: new Date()
          },
        })
      } else if (existingProviderWithId && existingProviderWithId.userId === userId) {
        // Case 3: User already has this exact provider - just update it
        logger.info("Updating existing provider with same ID for same user", {
          providerId: existingProviderWithId.id,
          provider: providerData.provider
        })
        result = await prisma.authProvider.update({
          where: { id: existingProviderWithId.id },
          data: {
            email: providerData.email,
            username: providerData.username,
            displayName: providerData.displayName,
            profileImage: providerData.profileImage,
            name: providerData.name,
            followersCount: providerData.followersCount,
            mediaCount: providerData.mediaCount,
            accountType: providerData.accountType,
            canAccessInsights: providerData.canAccessInsights,
            canPublishContent: providerData.canPublishContent,
            canManageAds: providerData.canManageAds,
            accessToken: providerData.accessToken,
            accessTokenSecret: providerData.accessTokenSecret,
            refreshToken: providerData.refreshToken,
            expiresAt: providerData.expiresAt,
            ...(providerData.scopes && { scopes: providerData.scopes }),
            advertisingAccountId: providerData.advertisingAccountId,
            businessAccounts: providerData.businessAccounts ? JSON.stringify(providerData.businessAccounts) : null,
            adAccounts: providerData.adAccounts ? JSON.stringify(providerData.adAccounts) : null,
            configId: providerData.configId,
            analyticsSummary: providerData.analyticsSummary ? JSON.stringify(providerData.analyticsSummary) : null,
            updatedAt: new Date()
          },
        })
      } else {
        // Case 4: Completely new provider - create it
        logger.info("Creating new provider", {
          provider: providerData.provider,
          userId,
          providerId: providerData.providerId
        })
        result = await prisma.authProvider.create({
          data: {
            userId,
            provider: providerData.provider as any,
            providerId: providerData.providerId,
            email: providerData.email,
            username: providerData.username,
            displayName: providerData.displayName,
            profileImage: providerData.profileImage,
            name: providerData.name,
            followersCount: providerData.followersCount,
            mediaCount: providerData.mediaCount,
            accountType: providerData.accountType,
            canAccessInsights: providerData.canAccessInsights,
            canPublishContent: providerData.canPublishContent,
            canManageAds: providerData.canManageAds,
            accessToken: providerData.accessToken,
            accessTokenSecret: providerData.accessTokenSecret,
            refreshToken: providerData.refreshToken,
            expiresAt: providerData.expiresAt,
            advertisingAccountId: providerData.advertisingAccountId,
            businessAccounts: providerData.businessAccounts ? JSON.stringify(providerData.businessAccounts) : null,
            adAccounts: providerData.adAccounts ? JSON.stringify(providerData.adAccounts) : null,
            configId: providerData.configId,
            analyticsSummary: providerData.analyticsSummary ? JSON.stringify(providerData.analyticsSummary) : null,
            ...(providerData.scopes && { scopes: providerData.scopes }),
          },
        })
      }

      logger.info("Auth provider upserted successfully", {
        providerId: result.id,
        provider: result.provider,
        hasAccessToken: !!result.accessToken
      })

      return result
    } catch (error) {
      logger.error("Failed to upsert auth provider", { error, userId, provider: providerData.provider })

      // Enhanced error handling for constraint violations
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        logger.error("Database constraint violation - attempting recovery", {
          error,
          userId,
          provider: providerData.provider,
          providerId: providerData.providerId
        })

        // Try to find and update the conflicting record
        try {
          const conflictingProvider = await prisma.authProvider.findFirst({
            where: {
              OR: [
                {
                  provider: providerData.provider as any,
                  providerId: providerData.providerId
                },
                {
                  userId,
                  provider: providerData.provider as any,
                }
              ]
            },
          })

          if (conflictingProvider) {
            logger.info("Found conflicting provider, updating it", {
              conflictingProviderId: conflictingProvider.id,
              conflictingUserId: conflictingProvider.userId
            })

            return await prisma.authProvider.update({
              where: { id: conflictingProvider.id },
              data: {
                userId, // Ensure it belongs to current user
                providerId: providerData.providerId,
                email: providerData.email,
                username: providerData.username,
                profileImage: providerData.profileImage,
                accessToken: providerData.accessToken,
                refreshToken: providerData.refreshToken,
                expiresAt: providerData.expiresAt,
                advertisingAccountId: providerData.advertisingAccountId,
                businessAccounts: providerData.businessAccounts ? JSON.stringify(providerData.businessAccounts) : null,
                adAccounts: providerData.adAccounts ? JSON.stringify(providerData.adAccounts) : null,
                configId: providerData.configId,
                updatedAt: new Date(),
                ...(providerData.scopes && { scopes: providerData.scopes }),
              },
            })
          }
        } catch (recoveryError) {
          logger.error("Recovery attempt failed", { recoveryError })
        }
      }

      throw new DatabaseError("Failed to save authentication provider")
    }
  }

  static async getUserWithProviders(userId: string): Promise<UserWithProviders> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new Error("User not found")
      }

      // Manually fetch auth providers since relation might not be defined
      const authProviders = await prisma.authProvider.findMany({
        where: { userId },
      })

      return {
        ...user,
        authProviders,
      } as UserWithProviders
    } catch (error) {
      logger.error("Failed to get user with providers", { error, userId })
      throw new DatabaseError("Failed to retrieve user data")
    }
  }

  static async removeAuthProvider(provider: string, userId: string): Promise<void> {
    try {
      await prisma.authProvider.deleteMany({
        where: {
          provider: provider as any,
          userId,
        },
      })
    } catch (error) {
      logger.error("Failed to remove auth provider", { error, provider, userId })
      throw new DatabaseError("Failed to remove authentication provider")
    }
  }

  static async getActiveProviders(userId: string): Promise<AuthProvider[]> {
    try {
      const now = new Date()

      // Debug logging
      logger.info("Getting active providers", { userId })

      const providers = await prisma.authProvider.findMany({
        where: {
          userId,
          accessToken: {
            not: null
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ],
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      logger.info("Active providers found", {
        userId,
        count: providers.length,
        providers: providers.map(p => ({
          provider: p.provider,
          id: p.id,
          providerId: p.providerId,
          expiresAt: p.expiresAt,
          hasAccessToken: !!p.accessToken,
          accessTokenLength: p.accessToken?.length || 0
        }))
      })

      return providers
    } catch (error) {
      logger.error("Failed to get active providers", { error, userId })
      throw new DatabaseError("Failed to retrieve authentication data")
    }
  }

  static async updateUser(userId: string, data: Partial<User>): Promise<User> {
    try {
      // Filter out undefined values to avoid Prisma issues
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      )

      return await prisma.user.update({
        where: { id: userId },
        data: updateData,
      })
    } catch (error) {
      logger.error("Failed to update user", { error, userId, data })
      throw new DatabaseError("Failed to update user")
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id: userId }
      })
    } catch (error) {
      logger.error("Failed to get user by ID", { error, userId })
      throw new DatabaseError("Failed to retrieve user")
    }
  }

  static async getUserStats() {
    try {
      const [totalUsers, providerStats] = await Promise.all([
        prisma.user.count(),
        prisma.authProvider.groupBy({
          by: ["provider"],
          _count: { provider: true },
        }),
      ])

      return {
        totalUsers,
        providerStats: providerStats.reduce(
          (acc, stat) => {
            acc[stat.provider] = stat._count.provider
            return acc
          },
          {} as Record<string, number>,
        ),
      }
    } catch (error) {
      logger.error("Failed to get user stats", { error })
      throw new DatabaseError("Failed to retrieve statistics")
    }
  }

  static isTokenExpired(provider: AuthProvider): boolean {
    if (!provider.expiresAt) return false
    return new Date() >= provider.expiresAt
  }

  static needsTokenRefresh(provider: AuthProvider): boolean {
    if (!provider.expiresAt) return false
    const threshold = new Date(Date.now() + APP_CONFIG.TOKEN_REFRESH_THRESHOLD)
    return provider.expiresAt <= threshold
  }

  /**
   * Get a specific provider by its ID
   */
  static async getProviderById(providerId: string): Promise<AuthProvider | null> {
    try {
      return await prisma.authProvider.findUnique({
        where: { id: providerId }
      });
    } catch (error) {
      logger.error("Failed to get provider by ID", {
        providerId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Update a provider's access token and expiration
   */
  static async updateProviderToken(
    providerId: string,
    accessToken: string,
    refreshToken: string | null = null,
    expiresAt: Date
  ): Promise<AuthProvider | null> {
    try {
      const provider = await prisma.authProvider.update({
        where: { id: providerId },
        data: {
          accessToken,
          refreshToken,
          expiresAt,
          updatedAt: new Date()
        }
      });

      logger.info("Provider token updated", {
        providerId,
        provider: provider.provider,
        hasAccessToken: !!provider.accessToken,
        hasRefreshToken: !!provider.refreshToken,
        expiresAt: provider.expiresAt
      });

      return provider;
    } catch (error) {
      logger.error("Failed to update provider token", {
        providerId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Find an auth provider by userId, provider type, and providerId
   */
  static async findAuthProvider(
    userId: string,
    provider: string,
    providerId: string
  ): Promise<AuthProvider | null> {
    try {
      const authProvider = await prisma.authProvider.findFirst({
        where: {
          userId,
          provider: provider as any,
          providerId
        }
      });

      return authProvider;
    } catch (error) {
      logger.error("Failed to find auth provider", {
        userId,
        provider,
        providerId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Update only the accessTokenSecret field for OAuth 1.0a
   * Used in unified flow to add OAuth 1.0a tokens to existing OAuth 2.0 connection
   */
  static async updateAuthProviderSecret(
    authProviderId: string,
    data: { accessTokenSecret: string }
  ): Promise<AuthProvider | null> {
    try {
      const provider = await prisma.authProvider.update({
        where: { id: authProviderId },
        data: {
          accessTokenSecret: data.accessTokenSecret,
          updatedAt: new Date()
        }
      });

      logger.info("Provider OAuth 1.0a secret updated", {
        authProviderId,
        provider: provider.provider,
        hasAccessToken: !!provider.accessToken,
        hasAccessSecret: !!provider.accessTokenSecret,
        hasRefreshToken: !!provider.refreshToken
      });

      return provider;
    } catch (error) {
      logger.error("Failed to update provider secret", {
        authProviderId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Update OAuth 1.0a tokens WITHOUT overwriting OAuth 2.0 Bearer token
   * Used in unified flow to ADD OAuth 1.0a support alongside existing OAuth 2.0
   */
  static async updateAuthProviderOAuth1Tokens(
    authProviderId: string,
    data: { accessToken: string; accessTokenSecret: string }
  ): Promise<AuthProvider | null> {
    try {
      const provider = await prisma.authProvider.update({
        where: { id: authProviderId },
        data: {
          oauth1AccessToken: data.accessToken, // Store OAuth 1.0a token in separate field
          accessTokenSecret: data.accessTokenSecret, // OAuth 1.0a access secret
          // DO NOT touch accessToken (OAuth 2.0 Bearer token) - it's needed for Twitter API v2
          // DO NOT touch expiresAt - OAuth 2.0 expiration still applies
          updatedAt: new Date()
        }
      });

      logger.info("Provider OAuth 1.0a tokens updated (preserving OAuth 2.0)", {
        authProviderId,
        provider: provider.provider,
        oauth1AccessToken: provider.oauth1AccessToken?.substring(0, 20) + '...',
        oauth1TokenLength: provider.oauth1AccessToken?.length,
        hasAccessSecret: !!provider.accessTokenSecret,
        accessSecretLength: provider.accessTokenSecret?.length,
        hasOAuth2Token: !!provider.accessToken,
        hasRefreshToken: !!provider.refreshToken
      });

      return provider;
    } catch (error) {
      logger.error("Failed to update provider OAuth 1.0a tokens", {
        authProviderId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
}
