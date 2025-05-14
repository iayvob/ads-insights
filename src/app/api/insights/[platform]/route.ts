import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { handleApiError } from "@/lib/api-utils"
import type { InsightsData } from "@/types/ads"
import type { ApiResponse } from "@/types/api"

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } },
): Promise<NextResponse<ApiResponse<InsightsData>>> {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const platform = params.platform

    // Validate platform
    if (!["facebook", "instagram", "twitter"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
    }

    // Generate mock data for the last 30 days
    const dates = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return date.toISOString().split("T")[0]
    })

    // Generate random data with an upward trend
    const impressions = generateTrendingData(5000, 50000, 30)
    const clicks = generateTrendingData(100, 2000, 30)
    const ctr = clicks.map((click, i) => (click / impressions[i]) * 100)
    const spend = generateTrendingData(50, 500, 30)

    return NextResponse.json({
      data: {
        impressions,
        clicks,
        ctr,
        spend,
        dates,
      },
    })
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

// Helper function to generate random data with an upward trend
function generateTrendingData(min: number, max: number, count: number): number[] {
  const range = max - min
  return Array.from({ length: count }, (_, i) => {
    // Base value increases with index to create upward trend
    const baseValue = min + ((range * i) / (count - 1)) * 0.7
    // Add some randomness
    const randomFactor = 1 + (Math.random() * 0.4 - 0.2)
    return Math.round(baseValue * randomFactor)
  })
}
