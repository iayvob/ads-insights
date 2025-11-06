import { OAUTH_SCOPES } from "@/config/data/consts";
import { logger } from "@/config/logger";
import { AuthError } from "@/lib/errors";
import { env } from "@/validations/env";
import { FacebookBusinessData, FacebookUserData, InstagramBusinessData, InstagramUserData, TwitterUserData, TikTokUserData, AmazonUserData } from "@/validations/types";

export class OAuthService {
  static async normalizeUrl(url: string): Promise<string> {
    return url.replace(/([^:]\/)\/+/g, '$1')
  }
  /**
   * Exchanges a short-lived token for a long-lived token (60-day expiration)
   * @param shortLivedToken The short-lived token from initial OAuth flow
   * @returns Long-lived token data with extended expiration
   */
  static async getLongLivedFacebookToken(shortLivedToken: string) {
    try {
      logger.info("Exchanging for long-lived Facebook token");

      const response = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: env.FACEBOOK_APP_ID,
          client_secret: env.FACEBOOK_APP_SECRET,
          fb_exchange_token: shortLivedToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Failed to exchange for long-lived Facebook token", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new AuthError(`Failed to exchange for long-lived Facebook token: ${errorData}`);
      }

      const longLivedTokenData = await response.json();

      logger.info("Successfully obtained long-lived Facebook token", {
        hasToken: !!longLivedTokenData.access_token,
        expiresIn: longLivedTokenData.expires_in || '60 days (default)',
      });

      // Default to 60 days (in seconds) if no expires_in is provided
      if (!longLivedTokenData.expires_in) {
        longLivedTokenData.expires_in = 60 * 24 * 60 * 60; // 60 days in seconds
      }

      return longLivedTokenData;
    } catch (error) {
      logger.error("Error getting long-lived Facebook token", {
        error: error instanceof Error ? error.message : String(error)
      });
      // Return null instead of throwing to allow fallback to short-lived token
      return null;
    }
  }

  static async exchangeFacebookCode(code: string, redirectUri: string) {
    try {
      const body = new URLSearchParams({
        client_id: env.FACEBOOK_APP_ID,
        client_secret: env.FACEBOOK_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code
      });

      // Log the redirect URI for debugging
      logger.info("Facebook token exchange attempt", {
        redirectUri,
        codeLength: code.length,
        codePrefix: code.substring(0, 10)
      });

      // Enhanced fetch with retry logic and better error handling
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`Facebook token exchange attempt ${attempt}/${maxRetries}`);

          const response = await fetch("https://graph.facebook.com/v19.0/oauth/access_token", {
            method: "POST",
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'AdInsights-App/1.0',
            },
            body: body.toString(),
            // Add timeout and retry configuration
            signal: AbortSignal.timeout(15000), // 15 second timeout
          });

          logger.info("Facebook API response status", {
            attempt,
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
          });

          if (!response.ok) {
            const errorData = await response.text()
            logger.error("Facebook token exchange failed", {
              attempt,
              status: response.status,
              statusText: response.statusText,
              error: errorData
            })

            // If it's a 4xx error, don't retry
            if (response.status >= 400 && response.status < 500) {
              throw new AuthError(`Failed to authenticate with Facebook: ${errorData}`)
            }

            // For 5xx errors, retry
            if (attempt === maxRetries) {
              throw new AuthError(`Failed to authenticate with Facebook after ${maxRetries} attempts: ${errorData}`)
            }
            continue;
          }

          const tokenData = await response.json()
          logger.info("Facebook token exchange successful", {
            attempt,
            hasAccessToken: !!tokenData.access_token,
            expiresIn: tokenData.expires_in,
            tokenType: tokenData.token_type
          });

          return tokenData;

        } catch (fetchError) {
          lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
          logger.warn(`Facebook token exchange attempt ${attempt} failed`, {
            error: lastError.message,
            name: lastError.name
          });

          if (attempt === maxRetries) {
            break;
          }

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      throw lastError || new Error("All retry attempts failed");

    } catch (error) {
      logger.error("Facebook OAuth error", {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      })
      throw new AuthError("Facebook authentication failed")
    }
  }

  static async getFacebookUserData(accessToken: string): Promise<FacebookUserData> {
    try {
      logger.info("Fetching Facebook user data for analytics");

      // Get comprehensive user profile data
      const userResponse = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.width(200).height(200),accounts{id,name,access_token,category,tasks,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}}&access_token=${accessToken}`,
        {
          headers: {
            'User-Agent': 'AdInsights-App/1.0',
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        logger.error("Failed to fetch Facebook user data", {
          status: userResponse.status,
          error: errorText
        });
        throw new AuthError(`Failed to fetch Facebook user data: ${errorText}`);
      }

      const userData = await userResponse.json();
      logger.info("Facebook user data fetched successfully", {
        hasId: !!userData.id,
        hasName: !!userData.name,
        hasEmail: !!userData.email,
        pagesCount: userData.accounts?.data?.length || 0
      });

      // Structure data for analytics collection
      const structuredData: any = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        picture: userData.picture?.data?.url,
        accounts: userData.accounts?.data || [],
        // Additional fields for analytics
        instagramAccounts: [] as any[],
        facebookPages: [] as any[],
      };

      // Process pages and Instagram accounts for analytics
      if (userData.accounts?.data) {
        for (const account of userData.accounts.data) {
          // Add Facebook page info
          structuredData.facebookPages.push({
            id: account.id,
            name: account.name,
            category: account.category,
            access_token: account.access_token,
            tasks: account.tasks || []
          });

          // Add Instagram business account if available
          if (account.instagram_business_account) {
            structuredData.instagramAccounts.push({
              id: account.instagram_business_account.id,
              username: account.instagram_business_account.username,
              name: account.instagram_business_account.name,
              profile_picture_url: account.instagram_business_account.profile_picture_url,
              followers_count: account.instagram_business_account.followers_count || 0,
              media_count: account.instagram_business_account.media_count || 0,
              connected_facebook_page: account.id
            });
          }
        }
      }

      logger.info("Facebook account analysis", {
        facebookPagesCount: structuredData.facebookPages.length,
        instagramAccountsCount: structuredData.instagramAccounts.length
      });

      return structuredData;

    } catch (error) {
      logger.error("Failed to get Facebook user data", {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      throw new AuthError("Failed to retrieve user information")
    }
  }

  static async getFacebookBusinessData(accessToken: string): Promise<FacebookBusinessData> {
    try {
      logger.info("Fetching Facebook business data for ads analytics");

      // Get comprehensive business and ads data
      const [businessResponse, adAccountsResponse, pagesResponse] = await Promise.all([
        fetch(
          `https://graph.facebook.com/v19.0/me/businesses?access_token=${accessToken}&fields=id,name,verification_status,created_time,update_time`,
          {
            headers: { 'User-Agent': 'AdInsights-App/1.0' },
            signal: AbortSignal.timeout(15000),
          }
        ),
        fetch(
          `https://graph.facebook.com/v19.0/me/adaccounts?access_token=${accessToken}&fields=id,name,account_status,business,currency,timezone_name,amount_spent,spend_cap,account_id,created_time,funding_source_details`,
          {
            headers: { 'User-Agent': 'AdInsights-App/1.0' },
            signal: AbortSignal.timeout(15000),
          }
        ),
        fetch(
          `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}&fields=id,name,category,fan_count,talking_about_count,access_token,tasks,instagram_business_account{id,username,followers_count,media_count}`,
          {
            headers: { 'User-Agent': 'AdInsights-App/1.0' },
            signal: AbortSignal.timeout(15000),
          }
        ),
      ]);

      const businessData = businessResponse.ok ? await businessResponse.json() : { data: [] };
      const adAccountsData = adAccountsResponse.ok ? await adAccountsResponse.json() : { data: [] };
      const pagesData = pagesResponse.ok ? await pagesResponse.json() : { data: [] };

      logger.info("Facebook business data fetched", {
        businessCount: businessData.data?.length || 0,
        adAccountsCount: adAccountsData.data?.length || 0,
        pagesCount: pagesData.data?.length || 0
      });

      // Find primary ad account (active account with highest spend)
      const primaryAdAccountId = adAccountsData.data?.find(
        (account: any) => account.account_status === 1 || account.account_status === "ACTIVE",
      )?.id;

      // Process ad accounts for enhanced analytics
      const processedAdAccounts = (adAccountsData.data || []).map((account: any) => ({
        id: account.id,
        account_id: account.account_id,
        name: account.name,
        account_status: account.account_status,
        business: account.business,
        currency: account.currency,
        timezone_name: account.timezone_name,
        amount_spent: account.amount_spent || "0",
        spend_cap: account.spend_cap,
        created_time: account.created_time,
        funding_source_details: account.funding_source_details,
        // Additional fields for analytics tracking
        is_primary: account.id === primaryAdAccountId,
        has_spend: parseFloat(account.amount_spent || "0") > 0
      }));

      // Process pages for content analytics
      const processedPages = (pagesData.data || []).map((page: any) => ({
        id: page.id,
        name: page.name,
        category: page.category,
        fan_count: page.fan_count || 0,
        talking_about_count: page.talking_about_count || 0,
        access_token: page.access_token,
        tasks: page.tasks || [], // Include tasks for permission checking
        instagram_business_account: page.instagram_business_account,
        // Analytics flags
        has_instagram: !!page.instagram_business_account,
        has_create_content: page.tasks && page.tasks.includes('CREATE_CONTENT'),
        engagement_potential: (page.fan_count || 0) + (page.talking_about_count || 0)
      }));

      const result: any = {
        businesses: businessData.data || [],
        adAccounts: processedAdAccounts,
        pages: processedPages,
        primaryAdAccountId,
        // Analytics summary
        analytics_summary: {
          total_businesses: businessData.data?.length || 0,
          total_ad_accounts: processedAdAccounts.length,
          active_ad_accounts: processedAdAccounts.filter((acc: any) => acc.account_status === 1).length,
          total_pages: processedPages.length,
          instagram_connected_pages: processedPages.filter((page: any) => page.has_instagram).length,
          total_spend: processedAdAccounts.reduce((sum: number, acc: any) => sum + parseFloat(acc.amount_spent), 0),
          has_advertising_access: processedAdAccounts.length > 0,
          has_content_access: processedPages.length > 0
        }
      };

      logger.info("Facebook business analytics summary", result.analytics_summary);

      return result;

    } catch (error) {
      logger.warn("Failed to get Facebook business data", {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      return {
        businesses: [],
        adAccounts: [],
        analytics_summary: {
          total_businesses: 0,
          total_ad_accounts: 0,
          active_ad_accounts: 0,
          total_pages: 0,
          instagram_connected_pages: 0,
          total_spend: 0,
          has_advertising_access: false,
          has_content_access: false
        }
      } as any;
    }
  }

  static async exchangeInstagramCode(code: string, redirectUri: string) {
    try {
      const body = new URLSearchParams({
        client_id: env.FACEBOOK_APP_ID,
        client_secret: env.FACEBOOK_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code
      });

      // Log the redirect URI for debugging
      logger.info("Instagram token exchange attempt", {
        redirectUri,
        codeLength: code.length,
        codePrefix: code.substring(0, 10)
      });

      const response = await fetch("https://graph.facebook.com/v19.0/oauth/access_token", {
        method: "POST",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString()
      });

      logger.info("Instagram API response status", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.text()
        logger.error("Instagram token exchange failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new AuthError(`Failed to authenticate with Instagram: ${errorData}`)
      }

      const tokenData = await response.json()
      console.log(tokenData);
      logger.info("Instagram token exchange successful", { hasAccessToken: !!tokenData.access_token });



      return tokenData
    } catch (error) {
      logger.error("Instagram OAuth error", {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      })
      throw new AuthError("Instagram authentication failed")
    }
  }

  static async getLongLivedInstagramToken(shortLivedToken: string) {
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: env.FACEBOOK_APP_ID,
          client_secret: env.FACEBOOK_APP_SECRET,
          fb_exchange_token: shortLivedToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Failed to exchange Instagram token", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new AuthError(`Failed to exchange Instagram token: ${errorData}`);
      }

      const tokenData = await response.json();
      logger.info("Successfully exchanged Instagram token", {
        hasAccessToken: !!tokenData.access_token,
      });

      return tokenData;
    } catch (error) {
      logger.error("Instagram OAuth error", {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      throw new AuthError("Instagram authentication failed");
    }
  }

  static async getInstagramUserData(accessToken: string): Promise<InstagramUserData> {
    try {
      logger.info("Fetching Instagram user data");

      // First get the Facebook pages (potential Instagram business accounts)
      const pagesResponse = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);

      if (!pagesResponse.ok) {
        const errorText = await pagesResponse.text();
        logger.error("Failed to fetch Facebook pages", {
          status: pagesResponse.status,
          error: errorText
        });
        throw new AuthError(`Failed to fetch Facebook pages: ${errorText}`);
      }

      const pagesData = await pagesResponse.json();

      console.log(pagesData.data);

      if (!pagesData.data || pagesData.data.length === 0) {
        logger.warn("No Facebook pages found for this user");
        throw new AuthError("No Facebook pages found. An Instagram Business account connected to a Facebook page is required");
      }

      logger.info(`Found ${pagesData.data.length} Facebook pages`);

      // For each page, try to get Instagram business account
      for (const page of pagesData.data) {
        try {
          const instagramResponse = await fetch(
            `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account{id,name,username,profile_picture_url}&access_token=${accessToken}`
          );

          if (!instagramResponse.ok) {
            logger.warn(`Failed to check Instagram business account for page ${page.id}`, {
              status: instagramResponse.status
            });
            continue;
          }

          const instagramData = await instagramResponse.json();

          if (instagramData.instagram_business_account) {
            const igAccount = instagramData.instagram_business_account;
            logger.info("Found Instagram business account", {
              pageId: page.id,
              pageName: page.name,
              instagramId: igAccount.id,
              instagramUsername: igAccount.username
            });

            return {
              id: igAccount.id,
              username: igAccount.username,
              name: igAccount.name,
              profilePictureUrl: igAccount.profile_picture_url,
              pageId: page.id,
              pageName: page.name,
              accessToken: page.access_token
            };
          }
        } catch (pageError) {
          logger.warn(`Error checking Instagram account for page ${page.id}`, {
            error: pageError instanceof Error ? pageError.message : String(pageError)
          });
        }
      }

      // If we got here, no Instagram business account was found
      logger.warn("No Instagram business accounts found across all pages");
      throw new AuthError("No Instagram business account found. Please connect your Instagram account to a Facebook page");

    } catch (error) {
      logger.error("Instagram user data fetch failed", {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });

      if (error instanceof AuthError) {
        throw error; // Re-throw specific auth errors
      }

      throw new AuthError("Failed to retrieve Instagram user information");
    }
  }

  static async getInstagramBusinessData(accessToken: string): Promise<InstagramBusinessData> {
    try {
      logger.info("Fetching Instagram business data for analytics and ads insights");

      // Get comprehensive Instagram business account data from Facebook pages
      const businessData = await this.getInstagramBusinessDetails(accessToken);

      return businessData;

    } catch (error) {
      logger.warn("Failed to get Instagram business data", {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Unknown'
        }
      });
      return {
        businessAccounts: [],
        adAccounts: [],
        analytics_summary: {
          total_instagram_accounts: 0,
          total_ad_accounts: 0,
          active_ad_accounts: 0,
          total_followers: 0,
          total_media: 0,
          has_advertising_access: false,
          has_content_access: false
        }
      } as any;
    }
  }

  /**
   * Enhanced function to get Instagram Business account details for analytics and ads insights
   */
  static async getInstagramBusinessDetails(accessToken: string) {
    try {
      logger.info("Fetching detailed Instagram business data");

      // First, get all Facebook pages with Instagram business accounts
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,category,fan_count,talking_about_count,instagram_business_account{id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url}&access_token=${accessToken}`,
        {
          headers: { 'User-Agent': 'AdInsights-App/1.0' },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!pagesResponse.ok) {
        const errorText = await pagesResponse.text();
        logger.error("Failed to fetch Facebook pages for Instagram", {
          status: pagesResponse.status,
          error: errorText
        });
        throw new Error(`Failed to fetch Facebook pages: ${errorText}`);
      }

      const pagesData = await pagesResponse.json();
      logger.info("Facebook pages fetched", {
        pagesCount: pagesData.data?.length || 0
      });

      // Process Instagram business accounts and collect analytics data
      const instagramBusinessAccounts = [];
      const instagramAdAccounts = [];
      let totalFollowers = 0;
      let totalMedia = 0;

      if (pagesData.data && pagesData.data.length > 0) {
        for (const page of pagesData.data) {
          if (page.instagram_business_account) {
            const igAccount = page.instagram_business_account;

            logger.info("Processing Instagram business account", {
              pageId: page.id,
              pageName: page.name,
              igAccountId: igAccount.id,
              igUsername: igAccount.username
            });

            // Get detailed Instagram account insights and permissions
            const [accountDetails, adAccountsData] = await Promise.all([
              this.getInstagramAccountDetails(igAccount.id, page.access_token),
              this.getInstagramAdAccounts(page.id, page.access_token)
            ]);

            const businessAccount = {
              // Instagram account info
              id: igAccount.id,
              username: igAccount.username,
              name: igAccount.name,
              biography: igAccount.biography,
              website: igAccount.website,
              followers_count: igAccount.followers_count || 0,
              follows_count: igAccount.follows_count || 0,
              media_count: igAccount.media_count || 0,
              profile_picture_url: igAccount.profile_picture_url,
              account_type: 'BUSINESS', // Instagram business accounts are always BUSINESS type

              // Connected Facebook page info
              connected_facebook_page: {
                id: page.id,
                name: page.name,
                access_token: page.access_token,
                category: page.category,
                fan_count: page.fan_count || 0,
                talking_about_count: page.talking_about_count || 0
              },

              // Enhanced analytics data
              analytics_permissions: accountDetails.permissions,
              content_publishing_limit: accountDetails.content_publishing_limit,
              insights_access: accountDetails.insights_access,

              // Flags for analytics capabilities
              can_access_insights: accountDetails.insights_access,
              can_publish_content: accountDetails.permissions.includes('instagram_manage_content'),
              can_manage_ads: adAccountsData.length > 0,

              // Connection metadata
              connected_at: new Date().toISOString(),
              last_updated: new Date().toISOString()
            };

            instagramBusinessAccounts.push(businessAccount);

            // Add ad accounts for this Instagram account
            if (adAccountsData.length > 0) {
              instagramAdAccounts.push(...adAccountsData.map((adAccount: any) => ({
                ...adAccount,
                connected_instagram_account: igAccount.id,
                connected_facebook_page: page.id
              })));
            }

            totalFollowers += igAccount.followers_count || 0;
            totalMedia += igAccount.media_count || 0;
          }
        }
      }

      // Check for additional ad accounts at the user level
      const userAdAccounts = await this.getUserInstagramAdAccounts(accessToken);
      instagramAdAccounts.push(...userAdAccounts);

      const result = {
        businessAccounts: instagramBusinessAccounts,
        adAccounts: instagramAdAccounts,
        pages: pagesData.data || [],

        // Analytics summary for Instagram
        analytics_summary: {
          total_instagram_accounts: instagramBusinessAccounts.length,
          total_ad_accounts: instagramAdAccounts.length,
          active_ad_accounts: instagramAdAccounts.filter((acc: any) => acc.account_status === 1).length,
          total_followers: totalFollowers,
          total_media: totalMedia,
          has_advertising_access: instagramAdAccounts.length > 0,
          has_content_access: instagramBusinessAccounts.some((acc: any) => acc.can_publish_content),
          accounts_with_insights: instagramBusinessAccounts.filter((acc: any) => acc.can_access_insights).length,
          avg_followers_per_account: instagramBusinessAccounts.length > 0 ? Math.round(totalFollowers / instagramBusinessAccounts.length) : 0
        }
      };

      logger.info("Instagram business analytics summary", result.analytics_summary);

      return result;

    } catch (error) {
      logger.error("Failed to get Instagram business details", {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });

      throw error;
    }
  }

  /**
   * Get detailed Instagram account analytics permissions and capabilities
   */
  static async getInstagramAccountDetails(instagramAccountId: string, pageAccessToken: string) {
    try {
      // Check Instagram account permissions and insights access
      const permissionsResponse = await fetch(
        `https://graph.facebook.com/v19.0/${instagramAccountId}?fields=id,username,account_type,media_count,followers_count&access_token=${pageAccessToken}`,
        {
          headers: { 'User-Agent': 'AdInsights-App/1.0' },
          signal: AbortSignal.timeout(10000),
        }
      );

      let permissions: string[] = [];
      let insights_access = false;
      let content_publishing_limit = null;

      if (permissionsResponse.ok) {
        const accountData = await permissionsResponse.json();

        // Check if we can access insights (requires business account)
        try {
          const insightsTestResponse = await fetch(
            `https://graph.facebook.com/v19.0/${instagramAccountId}/insights?metric=impressions,reach,profile_views&period=day&since=2024-01-01&until=2024-01-02&access_token=${pageAccessToken}`,
            {
              headers: { 'User-Agent': 'AdInsights-App/1.0' },
              signal: AbortSignal.timeout(5000),
            }
          );

          insights_access = insightsTestResponse.ok;

          if (insights_access) {
            permissions.push('instagram_basic', 'instagram_manage_insights');
          }
        } catch (insightsError) {
          logger.warn("Instagram insights access test failed", {
            instagramAccountId,
            error: insightsError instanceof Error ? insightsError.message : String(insightsError)
          });
        }

        // Check content publishing permissions
        try {
          const contentResponse = await fetch(
            `https://graph.facebook.com/v19.0/${instagramAccountId}?fields=username&access_token=${pageAccessToken}`,
            {
              method: 'GET',
              headers: { 'User-Agent': 'AdInsights-App/1.0' },
              signal: AbortSignal.timeout(5000),
            }
          );

          if (contentResponse.ok) {
            permissions.push('instagram_manage_content');
          }
        } catch (contentError) {
          logger.warn("Instagram content access test failed", {
            instagramAccountId,
            error: contentError instanceof Error ? contentError.message : String(contentError)
          });
        }
      }

      return {
        permissions,
        insights_access,
        content_publishing_limit
      };

    } catch (error) {
      logger.warn("Failed to get Instagram account details", {
        instagramAccountId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        permissions: [],
        insights_access: false,
        content_publishing_limit: null
      };
    }
  }

  /**
   * Get Instagram ad accounts associated with a Facebook page
   */
  static async getInstagramAdAccounts(facebookPageId: string, pageAccessToken: string) {
    try {
      // Get ad accounts that can promote Instagram content for this page
      const adAccountsResponse = await fetch(
        `https://graph.facebook.com/v19.0/${facebookPageId}/adaccounts?fields=id,name,account_status,currency,timezone_name,amount_spent,spend_cap,funding_source_details,can_use_reach_and_frequency&access_token=${pageAccessToken}`,
        {
          headers: { 'User-Agent': 'AdInsights-App/1.0' },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!adAccountsResponse.ok) {
        logger.warn("Failed to fetch Instagram ad accounts for page", {
          facebookPageId,
          status: adAccountsResponse.status
        });
        return [];
      }

      const adAccountsData = await adAccountsResponse.json();
      const adAccounts = adAccountsData.data || [];

      // Process ad accounts and add Instagram-specific metadata
      return adAccounts.map((account: any) => ({
        id: account.id,
        name: account.name,
        account_status: account.account_status,
        currency: account.currency,
        timezone_name: account.timezone_name,
        amount_spent: account.amount_spent || "0",
        spend_cap: account.spend_cap,
        funding_source_details: account.funding_source_details,
        can_use_reach_and_frequency: account.can_use_reach_and_frequency,

        // Instagram ads specific flags
        supports_instagram_ads: true,
        can_promote_instagram_posts: account.account_status === 1,
        instagram_ads_access_token: pageAccessToken,

        // Analytics flags
        is_active: account.account_status === 1,
        has_spend: parseFloat(account.amount_spent || "0") > 0,

        // Connection metadata
        connected_via: 'facebook_page',
        page_access_token: pageAccessToken
      }));

    } catch (error) {
      logger.warn("Failed to get Instagram ad accounts", {
        facebookPageId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Get Instagram ad accounts at the user level
   */
  static async getUserInstagramAdAccounts(accessToken: string) {
    try {
      // Get user's ad accounts that support Instagram
      const adAccountsResponse = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name,amount_spent,business,capabilities&access_token=${accessToken}`,
        {
          headers: { 'User-Agent': 'AdInsights-App/1.0' },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!adAccountsResponse.ok) {
        logger.warn("Failed to fetch user Instagram ad accounts", {
          status: adAccountsResponse.status
        });
        return [];
      }

      const adAccountsData = await adAccountsResponse.json();
      const adAccounts = adAccountsData.data || [];

      // Filter ad accounts that support Instagram and process them
      return adAccounts
        .filter((account: any) => {
          // Check if the ad account supports Instagram placements
          return account.capabilities &&
            account.capabilities.includes &&
            (account.capabilities.includes('instagram') ||
              account.capabilities.includes('instagram_stories'));
        })
        .map((account: any) => ({
          id: account.id,
          name: account.name,
          account_status: account.account_status,
          currency: account.currency,
          timezone_name: account.timezone_name,
          amount_spent: account.amount_spent || "0",
          business: account.business,
          capabilities: account.capabilities,

          // Instagram ads specific
          supports_instagram_ads: true,
          can_promote_instagram_posts: account.account_status === 1,
          instagram_ads_access_token: accessToken,

          // Analytics flags
          is_active: account.account_status === 1,
          has_spend: parseFloat(account.amount_spent || "0") > 0,

          // Connection metadata
          connected_via: 'user_level',
          user_access_token: accessToken
        }));

    } catch (error) {
      logger.warn("Failed to get user Instagram ad accounts", {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }



  /**
   * Refreshes a Twitter access token using a refresh token
   * This helps extend the lifetime of Twitter API access
   */
  static async refreshTwitterToken(refreshToken: string) {
    try {
      logger.info("Refreshing Twitter access token");

      if (!env.TWITTER_CLIENT_ID || !env.TWITTER_CLIENT_SECRET) {
        logger.error("Twitter OAuth credentials missing");
        throw new AuthError("Twitter OAuth credentials not configured");
      }

      const credentials = Buffer.from(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`).toString('base64');

      const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "AdInsights-App/1.0",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: env.TWITTER_CLIENT_ID
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Twitter token refresh failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        return null;
      }

      const tokenData = await response.json();
      logger.info("Twitter token refresh successful", {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in || 7200,
        scope: tokenData.scope
      });

      return tokenData;
    } catch (error) {
      logger.error("Twitter token refresh error", {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      return null;
    }
  }

  static async exchangeTwitterCode(code: string, redirectUri: string, codeVerifier?: string) {
    try {
      // Normalize the redirect URI for compatibility with Vercel deployments
      const normalizedRedirectUri = redirectUri.replace(/([^:]\/)\/+/g, '$1');

      if (!env.TWITTER_CLIENT_ID || !env.TWITTER_CLIENT_SECRET) {
        logger.error("Twitter OAuth credentials missing");
        throw new AuthError("Twitter OAuth credentials not configured");
      }

      logger.info("Twitter token exchange attempt", {
        redirectUri: normalizedRedirectUri,
        codeLength: code.length,
        codePrefix: code.substring(0, 10),
        hasCodeVerifier: !!codeVerifier
      });

      // Twitter/X OAuth 2.0 PKCE token exchange
      const credentials = Buffer.from(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`).toString('base64');
      const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "AdInsights-App/1.0",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: normalizedRedirectUri,
          code_verifier: codeVerifier!,
          client_id: env.TWITTER_CLIENT_ID,
        }),
        signal: AbortSignal.timeout(15000),
      });

      logger.info("Twitter API response status", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("Twitter token exchange failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new AuthError(`Failed to authenticate with Twitter: ${errorData}`);
      }

      const tokenData = await response.json();
      logger.info("Twitter token exchange successful", {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope
      });

      return tokenData;
    } catch (error) {
      logger.error("Twitter OAuth error", {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      throw new AuthError("Twitter authentication failed");
    }
  }

  static async getTwitterUserData(accessToken: string): Promise<TwitterUserData> {
    try {
      logger.info("Fetching Twitter user data for analytics");

      // Get comprehensive user profile with metrics for analytics
      const response = await fetch(
        "https://api.twitter.com/2/users/me?user.fields=public_metrics,verified,created_at,description,profile_image_url,location,url,entities,pinned_tweet_id",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "AdInsights-App/1.0",
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Failed to fetch Twitter user data", {
          status: response.status,
          error: errorText
        });
        throw new AuthError(`Failed to fetch Twitter user data: ${errorText}`);
      }

      const data = await response.json();
      const userData = data.data;

      logger.info("Twitter user data fetched successfully", {
        hasId: !!userData.id,
        hasUsername: !!userData.username,
        hasMetrics: !!userData.public_metrics,
        followersCount: userData.public_metrics?.followers_count || 0
      });

      // Structure data for analytics
      return {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        verified: userData.verified || false,
        created_at: userData.created_at,
        description: userData.description,
        profile_image_url: userData.profile_image_url,
        location: userData.location,
        url: userData.url,
        pinned_tweet_id: userData.pinned_tweet_id,
        public_metrics: {
          followers_count: userData.public_metrics?.followers_count || 0,
          following_count: userData.public_metrics?.following_count || 0,
          tweet_count: userData.public_metrics?.tweet_count || 0,
          listed_count: userData.public_metrics?.listed_count || 0,
        },
        entities: userData.entities,
        // Analytics flags
        analytics_eligible: userData.public_metrics?.followers_count >= 500, // Basic threshold
        content_creator: userData.public_metrics?.tweet_count >= 100,
        verified_account: userData.verified || false,
      };

    } catch (error) {
      logger.error("Failed to get Twitter user data", {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      throw new AuthError("Failed to retrieve user information");
    }
  }

  static buildFacebookAuthUrl(state: string, redirectUri: string): string {
    // Normalize the redirect URI for compatibility with Vercel deployments
    const normalizedRedirectUri = redirectUri.replace(/([^:]\/)\/+/g, '$1');

    // Build URL exactly as shown in your working example
    const params = new URLSearchParams();
    params.append('client_id', env.FACEBOOK_APP_ID);
    params.append('redirect_uri', redirectUri);
    params.append('response_type', 'code');
    params.append('scope', OAUTH_SCOPES.FACEBOOK);
    params.append('state', state);

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;

    return authUrl.toString()
  }

  static buildInstagramAuthUrl(state: string, redirectUri: string): string {
    // Instagram uses Facebook Business Login to access business accounts
    // We use Instagram-specific scopes that include instagram_manage_insights
    const params = new URLSearchParams();
    params.append('client_id', env.FACEBOOK_APP_ID);
    params.append('redirect_uri', redirectUri);
    params.append('response_type', 'code');
    params.append('scope', OAUTH_SCOPES.INSTAGRAM); // Use Instagram scopes with analytics permissions
    params.append('state', state);

    const fullUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;

    // Log both the redirect URI and the full auth URL for debugging
    logger.info("Instagram auth URL generated", {
      redirectUri,
      hasClientId: !!env.FACEBOOK_APP_ID,
      scope: OAUTH_SCOPES.INSTAGRAM,
      state: state
    });

    return fullUrl;
  }

  static async buildTwitterAuthUrl(
    state: string,
    redirectUri: string,
    codeChallenge: string
  ): Promise<string> {
    // Normalize the redirect URI for compatibility with Vercel deployments
    const normalizedRedirectUri = await OAuthService.normalizeUrl(redirectUri);

    // Define your params in a plain object
    const params: Record<string, string> = {
      client_id: env.TWITTER_CLIENT_ID,
      scope: OAUTH_SCOPES.TWITTER,
      response_type: 'code',
      redirect_uri: normalizedRedirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    };

    // Manually build the query string so that encodeURIComponent handles spaces as %20
    const queryString = Object.entries(params)
      .map(
        ([key, val]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(val)}`
      )
      .join('&');

    return `https://twitter.com/i/oauth2/authorize?${queryString}`;
  }

  static async exchangeTikTokCode(code: string, redirectUri: string) {
    try {
      // Normalize the redirect URI for compatibility with Vercel deployments
      const normalizedRedirectUri = redirectUri.replace(/([^:]\/)\/+/g, '$1');

      if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET) {
        throw new AuthError("TikTok OAuth credentials not configured")
      }

      const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache",
        },
        body: new URLSearchParams({
          client_key: env.TIKTOK_CLIENT_KEY,
          client_secret: env.TIKTOK_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: normalizedRedirectUri,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        logger.error("TikTok token exchange failed", { error: errorData })
        throw new AuthError("Failed to authenticate with TikTok")
      }

      return await response.json()
    } catch (error) {
      logger.error("TikTok OAuth error", { error })
      throw new AuthError("TikTok authentication failed")
    }
  }

  static async getTikTokUserData(accessToken: string): Promise<TikTokUserData> {
    try {
      const response = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.text()
        logger.error("TikTok user data fetch failed", { error: errorData })
        throw new AuthError("Failed to fetch TikTok user data")
      }

      const userData = await response.json()

      if (!userData.data?.user) {
        throw new AuthError("Invalid TikTok user data response")
      }

      const user = userData.data.user

      return {
        open_id: user.open_id,
        union_id: user.union_id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      }
    } catch (error) {
      logger.error("Failed to get TikTok user data", { error })
      throw new AuthError("Failed to retrieve user information")
    }
  }

  static buildTikTokAuthUrl(state: string, redirectUri: string): string {
    // Normalize the redirect URI for compatibility with Vercel deployments
    const normalizedRedirectUri = redirectUri.replace(/([^:]\/)\/+/g, '$1');

    if (!env.TIKTOK_CLIENT_KEY) {
      throw new AuthError("TikTok OAuth credentials not configured")
    }

    const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/")
    authUrl.searchParams.set("client_key", env.TIKTOK_CLIENT_KEY)
    authUrl.searchParams.set("redirect_uri", normalizedRedirectUri)
    authUrl.searchParams.set("scope", OAUTH_SCOPES.TIKTOK)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("state", state)

    return authUrl.toString()
  }

  static async exchangeAmazonCode(code: string, redirectUri: string) {
    try {
      if (!env.AMAZON_CLIENT_ID || !env.AMAZON_CLIENT_SECRET) {
        throw new AuthError("Amazon OAuth credentials not configured")
      }

      const response = await fetch("https://api.amazon.com/auth/o2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: env.AMAZON_CLIENT_ID,
          client_secret: env.AMAZON_CLIENT_SECRET,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        logger.error("Amazon token exchange failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new AuthError("Failed to authenticate with Amazon")
      }

      const tokenData = await response.json()

      if (!tokenData.access_token) {
        logger.error("Amazon OAuth: No access token in response", { tokenData })
        throw new AuthError("Invalid Amazon token response")
      }

      return tokenData
    } catch (error) {
      logger.error("Amazon OAuth error", { error })
      throw new AuthError("Amazon authentication failed")
    }
  }

  static async getAmazonUserData(accessToken: string): Promise<AmazonUserData> {
    try {
      const response = await fetch("https://api.amazon.com/user/profile", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Accept": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.text()
        logger.error("Amazon user data fetch failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new AuthError("Failed to fetch Amazon user data")
      }

      const userData = await response.json()

      if (!userData.user_id) {
        logger.error("Amazon OAuth: Invalid user data response", { userData })
        throw new AuthError("Invalid Amazon user data")
      }

      return {
        id: userData.user_id,
        user_id: userData.user_id,
        name: userData.name || `Amazon User ${userData.user_id}`,
        email: userData.email,
      }
    } catch (error) {
      logger.error("Failed to get Amazon user data", { error })
      throw new AuthError("Failed to retrieve user information")
    }
  }

  static buildAmazonAuthUrl(state: string, redirectUri: string): string {
    if (!env.AMAZON_CLIENT_ID) {
      throw new AuthError("Amazon OAuth credentials not configured")
    }

    const authUrl = new URL("https://www.amazon.com/ap/oa")
    authUrl.searchParams.set("client_id", env.AMAZON_CLIENT_ID)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("scope", OAUTH_SCOPES.AMAZON)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("state", state)

    return authUrl.toString()
  }
}