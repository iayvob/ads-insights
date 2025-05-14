import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { handleApiError } from "@/lib/api-utils"
import type { OverviewData } from "@/types/ads"
import type { ApiResponse } from "@/types/api"

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<OverviewData>>> {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate mock data for each platform
    const facebook = {
      impressions: Math.floor(Math.random() * 100000) + 50000,
      clicks: Math.floor(Math.random() * 5000) + 1000,
      ctr: Math.random() * 5 + 1,
      spend: Math.random() * 1000 + 500,
    }

    const instagram = {
      impressions: Math.floor(Math.random() * 80000) + 40000,
      clicks: Math.floor(Math.random() * 4000) + 800,
      ctr: Math.random() * 4 + 1.5,
      spend: Math.random() * 800 + 400,
    }

    const twitter = {
      impressions: Math.floor(Math.random() * 60000) + 30000,
      clicks: Math.floor(Math.random() * 3000) + 600,
      ctr: Math.random() * 3 + 2,
      spend: Math.random() * 600 + 300,
    }

    // Calculate totals
    const totalImpressions = facebook.impressions + instagram.impressions + twitter.impressions
    const totalClicks = facebook.clicks + instagram.clicks + twitter.clicks
    const totalSpend = facebook.spend + instagram.spend + twitter.spend
    const averageCtr = (facebook.ctr + instagram.ctr + twitter.ctr) / 3

    return NextResponse.json({
      data: {
        platforms: {
          facebook,
          instagram,
          twitter,
        },
        totalImpressions,
        totalClicks,
        totalSpend,
        averageCtr,
      },
    })
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
