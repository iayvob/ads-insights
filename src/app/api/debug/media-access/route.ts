import { NextRequest, NextResponse } from 'next/server'
import { ServerSessionService } from '@/services/session-server'
import { validatePremiumAccess } from '@/lib/subscription-access'

export async function GET(request: NextRequest) {
    try {
        const session = await ServerSessionService.getSession(request)
        if (!session?.userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Check premium access for media upload
        const premiumAccess = await validatePremiumAccess(session.userId, "posting")

        return NextResponse.json({
            success: true,
            data: {
                userId: session.userId,
                plan: session.plan,
                premiumAccess,
                sessionData: {
                    hasConnectedPlatforms: !!session.connectedPlatforms,
                    connectedPlatformsKeys: session.connectedPlatforms ? Object.keys(session.connectedPlatforms) : []
                }
            }
        })
    } catch (error) {
        console.error('Debug media access error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}