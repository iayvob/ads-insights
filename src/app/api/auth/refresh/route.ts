import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/config/logger"
import { TokenRefreshService } from "@/services/token-refresh"
import { withAuth } from "@/config/middleware/middleware"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

/**
 * API endpoint to refresh tokens for a user's connected providers
 * POST /api/auth/refresh
 */
async function handler(request: NextRequest): Promise<NextResponse> {
  const session = await request.json();
  
  // Require a valid session with user ID
  if (!session?.userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Attempt to refresh all tokens for the user
    const refreshResult = await TokenRefreshService.refreshAllUserTokens(session.userId);
    
    logger.info("Token refresh API called", { 
      userId: session.userId,
      success: refreshResult.success,
      results: refreshResult.results
    });
    
    return NextResponse.json({
      success: true,
      data: refreshResult
    });
    
  } catch (error) {
    logger.error("Error in token refresh API", { 
      userId: session.userId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { success: false, error: "Failed to refresh tokens" }, 
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);
