import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { PlatformPostingService } from "@/services/platform-posting"

export async function GET(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get all connected platforms from session
    const connections = PlatformPostingService.getConnectedPlatforms(session)
    
    // Filter out invalid/expired connections
    const validConnections = connections.filter(conn => 
      PlatformPostingService.isConnectionValid(conn)
    )

    const connectedPlatforms = validConnections.map(conn => ({
      platform: conn.platform,
      username: conn.username,
      accountName: conn.accountName,
      connected: conn.connected,
      expiresAt: conn.expiresAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: {
        platforms: validConnections.map(conn => conn.platform),
        connections: connectedPlatforms,
        count: validConnections.length
      }
    })

  } catch (error) {
    console.error("Error fetching connected platforms:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch connected platforms" },
      { status: 500 }
    )
  }
}
