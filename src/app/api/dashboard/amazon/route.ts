import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { getUserSubscription } from "@/services/subscription"
import { withAuth } from "@/config/middleware/middleware"
import { logger } from "@/config/logger"
import { z } from "zod"
import { AmazonApiClient } from "@/services/api-clients/amazon-client"
import { SubscriptionPlan } from "@prisma/client"
import { ServerSessionService } from "@/services/session-server"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

const requestSchema = z.object({
  includeProducts: z.boolean().optional().default(true),
  includeReports: z.boolean().optional().default(true),
  productsLimit: z.number().min(1).max(100).optional().default(20),
  reportsLimit: z.number().min(1).max(50).optional().default(10),
  analyticsType: z.enum(['posts', 'ads', 'both']).optional().default('both'),
})

interface DashboardOptions {
  includeProducts: boolean
  includeReports: boolean
  productsLimit: number
  reportsLimit: number
  analyticsType: 'posts' | 'ads' | 'both'
}

const handler = async (request: NextRequest) => {
  let userId: string | undefined
  
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = session.userId

    const body = request.method === "POST" ? await request.json() : {}
    const { searchParams } = new URL(request.url)
    
    // Parse and validate request options
    const rawOptions = {
      includeProducts: body.includeProducts ?? searchParams.get("includeProducts") === "true",
      includeReports: body.includeReports ?? searchParams.get("includeReports") === "true",
      productsLimit: Number(body.productsLimit || searchParams.get("productsLimit")) || 20,
      reportsLimit: Number(body.reportsLimit || searchParams.get("reportsLimit")) || 10,
      analyticsType: body.analyticsType || searchParams.get("analyticsType") || 'both',
    }

    const validationResult = requestSchema.safeParse(rawOptions)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: "Invalid parameters", 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const options: DashboardOptions = validationResult.data

    // Get user subscription to determine access level
    let hasAdsAccess = false
    let userPlanType: 'freemium' | 'premium' = 'freemium'

    try {
      const userSubscriptionResult = await getUserSubscription(session.userId)
      if (userSubscriptionResult.success && userSubscriptionResult.subscription) {
        const subscription = userSubscriptionResult.subscription
        // Use planId to determine if it's premium (not 'basic')
        hasAdsAccess = Boolean(subscription.planId && 
                              subscription.planId !== "basic" && 
                              subscription.status === "ACTIVE")
        
        // Determine user plan type
        if (subscription.planId && subscription.planId !== "basic") {
          userPlanType = 'premium'
        }
      }
    } catch (error) {
      logger.warn("Could not verify subscription status", { userId: session.userId, error })
    }
    
    // Determine analytics access based on subscription
    // const hasAdsAccess = userPlan !== SubscriptionPlan.FREEMIUM
    
    // Validate analytics type request against subscription
    if (options.analyticsType === 'ads' && !hasAdsAccess) {
      logger.warn("Freemium user attempted to access ads analytics", { 
        userId: session.userId,
        requestedType: options.analyticsType,
        userPlanType 
      })
      
      // Gracefully fallback to posts analytics for freemium users
      options.analyticsType = 'posts'
    }

    logger.info("Amazon analytics request", { 
      userId: session.userId, 
      hasAdsAccess,
      analyticsType: options.analyticsType,
      userPlanType
    })

    // Get user's Amazon auth provider
    const activeProviders = await UserService.getActiveProviders(session.userId)
    const amazonProvider = activeProviders.find((p) => p.provider === "amazon")

    if (!amazonProvider) {
      return NextResponse.json({ error: "Amazon account not connected" }, { status: 404 })
    }

    // Check if token is expired
    if (UserService.isTokenExpired(amazonProvider)) {
      return NextResponse.json({ error: "Amazon token expired" }, { status: 401 })
    }

    if (!amazonProvider.accessToken) {
      return NextResponse.json({ error: "Amazon access token missing" }, { status: 401 })
    }

    let amazonData: any = {}
    let useMockData = false

    try {
      // Fetch real data from Amazon API
      const profileResult = await AmazonApiClient.getProfile(amazonProvider.accessToken, amazonProvider.providerId)

      const [campaigns, products, reports] = await Promise.allSettled([
        AmazonApiClient.getCampaigns(amazonProvider.accessToken, profileResult.profileId),
        options.includeProducts
          ? AmazonApiClient.getProductPerformance(amazonProvider.accessToken, profileResult.profileId)
          : Promise.resolve([]),
        options.includeReports
          ? AmazonApiClient.getProductPerformance(amazonProvider.accessToken, profileResult.profileId)
          : Promise.resolve([]),
      ])

      // Process results and handle failures gracefully
      amazonData = {
        profileData: profileResult,
        campaigns: campaigns.status === "fulfilled" ? campaigns.value : [],
        products: products.status === "fulfilled" ? products.value : [],
        reports: reports.status === "fulfilled" ? reports.value : [],
        lastUpdated: new Date().toISOString(),
        dataSource: "api",
      }

      // If critical data failed to load, use mock data
      if (!amazonData.profileData) {
        logger.warn("Critical Amazon data failed to load, using mock data", {
          userId: session.userId,
          profileFailed: !amazonData.profileData,
        })
        useMockData = true
      }
    } catch (error) {
      logger.error("Amazon API request failed", { error, userId: session.userId })
      useMockData = true
    }

    // Use mock data as fallback
    if (useMockData) {
      const userPlan = userPlanType === 'premium' ? SubscriptionPlan.PREMIUM_MONTHLY : SubscriptionPlan.FREEMIUM
      const mockData = AmazonApiClient.generateMockData(userPlan, {
        userId: session.userId,
        hasAdsAccess,
        analyticsType: options.analyticsType
      })
      amazonData = {
        ...mockData,
        lastUpdated: new Date().toISOString(),
        dataSource: "mock",
      }

      logger.info("Using Amazon mock data", { userId: session.userId })
    }

    // Calculate additional metrics
    if (amazonData.products && amazonData.profileData) {
      const totalOrders = amazonData.products.reduce(
        (sum: number, product: any) => sum + (product.orders || 0),
        0,
      )
      const totalRevenue = amazonData.products.reduce(
        (sum: number, product: any) => sum + (product.sales || 0),
        0,
      )
      const totalClicks = amazonData.products.reduce(
        (sum: number, product: any) => sum + (product.clicks || 0),
        0,
      )
      const totalImpressions = amazonData.products.reduce(
        (sum: number, product: any) => sum + (product.impressions || 0),
        0,
      )

      amazonData.metrics = {
        avgOrdersPerProduct: amazonData.products.length > 0 ? totalOrders / amazonData.products.length : 0,
        avgRevenuePerProduct: amazonData.products.length > 0 ? totalRevenue / amazonData.products.length : 0,
        avgClicksPerProduct: amazonData.products.length > 0 ? totalClicks / amazonData.products.length : 0,
        avgImpressionsPerProduct: amazonData.products.length > 0 ? totalImpressions / amazonData.products.length : 0,
        salesMetrics: {
          orders: totalOrders,
          revenue: totalRevenue,
          clicks: totalClicks,
          impressions: totalImpressions,
        },
        conversionRate: totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0,
      }

      // Get top performing products
      amazonData.topProducts = amazonData.products
        .sort((a: any, b: any) => {
          const aPerformance = (a.orders || 0) * (a.sales || 0)
          const bPerformance = (b.orders || 0) * (b.sales || 0)
          return bPerformance - aPerformance
        })
        .slice(0, 5)

      // Analyze sales timing
      const salesByDate = amazonData.products.reduce((acc: any, product: any) => {
        const date = product.date || new Date().toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { orders: 0, revenue: 0 }
        }
        acc[date].orders += product.orders || 0
        acc[date].revenue += product.sales || 0
        return acc
      }, {})

      amazonData.salesTrend = Object.entries(salesByDate).map(([date, metrics]: [string, any]) => ({
        date,
        orders: metrics.orders,
        revenue: metrics.revenue
      }))
    }

    logger.info("Amazon data fetched successfully", {
      userId: session.userId,
      dataSource: amazonData.dataSource,
      profileId: amazonData.profileData?.profileId,
      campaignsCount: amazonData.campaigns?.length || 0,
      productsCount: amazonData.products?.length || 0,
    })

    return NextResponse.json(amazonData)
  } catch (error) {
    logger.error("Failed to fetch Amazon dashboard data", {
      error,
      userId,
    })

    // Return mock data as final fallback
    const mockData = AmazonApiClient.generateMockData(SubscriptionPlan.FREEMIUM, {
      userId: userId || '',
      hasAdsAccess: false,
      analyticsType: 'posts'
    })
    return NextResponse.json({
      ...mockData,
      lastUpdated: new Date().toISOString(),
      dataSource: "mock",
      error: "Failed to fetch real data, showing sample data",
    })
  }
}

export const GET = withAuth(handler)
export const POST = withAuth(handler)
