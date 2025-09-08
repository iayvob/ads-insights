import { logger } from "@/config/logger"
import { AuthError } from "../../lib/errors"

export class FacebookInsightsService {
  static async getInsights(accessToken: string) {
    try {
      const [pageData, pageInsights, adAccounts] = await Promise.all([
        this.getPageData(accessToken),
        this.getPageInsights(accessToken),
        this.getAdAccountData(accessToken),
      ])

      return {
        pageData,
        insights: pageInsights,
        adData: adAccounts,
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      logger.error("Failed to fetch Facebook insights", { error })
      throw new AuthError("Failed to fetch Facebook data")
    }
  }

  private static async getPageData(accessToken: string) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,fan_count,followers_count`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch page data")
      }

      return await response.json()
    } catch (error) {
      logger.warn("Failed to fetch Facebook page data", { error })
      return {}
    }
  }

  private static async getPageInsights(accessToken: string) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/me/insights?access_token=${accessToken}&metric=page_impressions,page_reach,page_engaged_users&period=week`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch page insights")
      }

      const data = await response.json()

      // Process insights data
      const insights = {
        reach: 0,
        impressions: 0,
        engagement: 0,
      }

      if (data.data) {
        data.data.forEach((metric: any) => {
          const latestValue = metric.values?.[metric.values.length - 1]?.value || 0

          switch (metric.name) {
            case "page_reach":
              insights.reach = latestValue
              break
            case "page_impressions":
              insights.impressions = latestValue
              break
            case "page_engaged_users":
              insights.engagement = latestValue
              break
          }
        })
      }

      return insights
    } catch (error) {
      logger.warn("Failed to fetch Facebook insights", { error })
      return { reach: 0, impressions: 0, engagement: 0 }
    }
  }

  private static async getAdAccountData(accessToken: string) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/me/adaccounts?access_token=${accessToken}&fields=id,name,account_status,spend`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch ad account data")
      }

      const data = await response.json()

      // Calculate total spend
      const totalSpend =
        data.data?.reduce((sum: number, account: any) => {
          return sum + (Number.parseFloat(account.spend) || 0)
        }, 0) || 0

      return {
        accounts: data.data || [],
        spend: totalSpend,
      }
    } catch (error) {
      logger.warn("Failed to fetch Facebook ad data", { error })
      return { accounts: [], spend: 0 }
    }
  }
}
