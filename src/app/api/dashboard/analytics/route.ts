import { NextRequest, NextResponse } from "next/server"
import { AnalyticsDashboardService } from "@/services/analytics-dashboard"
import { logger } from "@/config/logger"
import { ServerSessionService } from "@/services/session-server"

export async function GET(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      )
    }

    // Debug logging
    logger.info("Analytics API called", { 
      userId: session.userId, 
      hasInstagramSession: !!session?.connectedPlatforms?.instagram
    })

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') as 'facebook' | 'instagram' | 'twitter' | null
    
    if (platform) {
      // Get specific platform analytics
      const platformAnalytics = await AnalyticsDashboardService.getPlatformAnalytics(
        session.userId, 
        platform
      )
      
      return NextResponse.json({
        platform,
        analytics: platformAnalytics,
        timestamp: new Date().toISOString()
      })
    } else {
      // Get full dashboard analytics
      const dashboardData = await AnalyticsDashboardService.getAnalyticsDashboardData(session.userId)
      
      return NextResponse.json(dashboardData)
    }
    
  } catch (error: any) {
    logger.error("Analytics dashboard API error", { 
      error: error.message,
      stack: error.stack,
      type: error.type,
      status: error.status
    })
    
    if (error.message.includes("not connected")) {
      return NextResponse.json(
        { error: error.message }, 
        { status: 404 }
      )
    }
    
    if (error.message.includes("token expired") || error.type === 'auth_error') {
      return NextResponse.json(
        { error: error.message || "Authentication token expired. Please reconnect your account." }, 
        { status: 401 }
      )
    }

    if (error.type === 'rate_limit') {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded. Please try again later.",
          details: {
            type: 'rate_limit',
            retryAfter: error.details?.retryAfter,
            resetTime: error.details?.resetTime
          }
        }, 
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to fetch analytics data" }, 
      { status: 500 }
    )
  }
}
