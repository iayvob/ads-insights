import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/config/middleware/middleware"
import { logger } from "@/config/logger"
import { DashboardService } from "@/services/dashboard";
import { ServerSessionService } from "@/services/session-server";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

async function handler(request: NextRequest): Promise<NextResponse> {
  const session = await ServerSessionService.getSession(request)

  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const dashboardData = await DashboardService.getDashboardData(session.userId)

    logger.info("Dashboard data fetched successfully", {
      userId: session.userId,
      platforms: dashboardData.connectedPlatforms,
      totalFollowers: dashboardData.overview.totalFollowers,
    })

    return NextResponse.json(dashboardData)
  } catch (error) {
    logger.error("Failed to fetch dashboard data", {
      error,
      userId: session.userId,
    })

    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}

export const GET = withAuth(handler)
