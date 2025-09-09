import { NextRequest, NextResponse } from "next/server"
import { postingHealthMonitor } from "@/services/posting-health-monitor"
import { ServerSessionService } from "@/services/session-server"

export async function GET(request: NextRequest) {
    try {
        // Only allow admins to access health data
        const session = await ServerSessionService.getSession(request)
        if (!session?.userId) {
            return NextResponse.json(
                { success: false, error: "Authentication required" },
                { status: 401 }
            )
        }

        // In a real application, you would check if the user is an admin
        // For now, we'll allow any authenticated user to see this data

        const health = postingHealthMonitor.getOverallHealth()

        return NextResponse.json({
            success: true,
            data: health
        })
    } catch (error) {
        console.error("Health monitoring error:", error)
        return NextResponse.json(
            {
                success: false,
                error: "INTERNAL_SERVER_ERROR",
                message: "Failed to retrieve posting health metrics"
            },
            { status: 500 }
        )
    }
}

// Platform-specific health metrics
export async function POST(request: NextRequest) {
    try {
        // Only allow admins to access health data
        const session = await ServerSessionService.getSession(request)
        if (!session?.userId) {
            return NextResponse.json(
                { success: false, error: "Authentication required" },
                { status: 401 }
            )
        }

        // Get platform from request body
        const body = await request.json()
        const { platform } = body

        if (!platform || !['facebook', 'instagram', 'twitter'].includes(platform)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "INVALID_REQUEST",
                    message: "Invalid platform specified"
                },
                { status: 400 }
            )
        }

        const platformHealth = postingHealthMonitor.getPlatformHealth(platform)
        const successRate = postingHealthMonitor.getPlatformSuccessRate(platform)

        return NextResponse.json({
            success: true,
            data: {
                platform,
                metrics: platformHealth,
                successRate
            }
        })
    } catch (error) {
        console.error("Platform health monitoring error:", error)
        return NextResponse.json(
            {
                success: false,
                error: "INTERNAL_SERVER_ERROR",
                message: "Failed to retrieve platform health metrics"
            },
            { status: 500 }
        )
    }
}
