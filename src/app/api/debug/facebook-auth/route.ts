import { NextRequest, NextResponse } from 'next/server'
import { ServerSessionService } from '@/services/session-server'
import { prisma } from '@/config/database/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await ServerSessionService.getSession(request)
        if (!session?.userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Get Facebook auth provider from database
        const authProvider = await prisma.authProvider.findFirst({
            where: {
                userId: session.userId,
                provider: 'facebook'
            }
        })

        if (!authProvider) {
            return NextResponse.json({ error: 'Facebook not connected' }, { status: 404 })
        }

        let businessData = null
        if (authProvider.businessAccounts) {
            try {
                businessData = JSON.parse(authProvider.businessAccounts)
            } catch (e) {
                businessData = { error: 'Failed to parse business accounts', raw: authProvider.businessAccounts }
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                provider: authProvider.provider,
                providerId: authProvider.providerId,
                username: authProvider.username,
                displayName: authProvider.displayName,
                email: authProvider.email,
                advertisingAccountId: authProvider.advertisingAccountId,
                canPublishContent: authProvider.canPublishContent,
                canManageAds: authProvider.canManageAds,
                hasAccessToken: !!authProvider.accessToken,
                tokenExpiry: authProvider.expiresAt,
                businessAccounts: businessData,
                rawBusinessAccounts: authProvider.businessAccounts?.substring(0, 200) + '...' // Preview
            }
        })
    } catch (error) {
        console.error('Debug Facebook auth error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}