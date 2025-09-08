import { NextRequest, NextResponse } from "next/server";
import { ServerSessionService } from "@/services/session-server";
import { UserService } from "@/services/user";
import { logger } from "@/config/logger";
import { createErrorResponse, createSuccessResponse } from "@/controllers/api-response";

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await ServerSessionService.getSession(request);
    
    if (!session?.userId) {
      logger.warn("Update session attempt without authentication");
      return createErrorResponse("Authentication required", 401);
    }

    const body = await request.json();
    const { plan } = body;

    // Validate the plan parameter
    if (!plan || !["FREEMIUM", "PREMIUM_MONTHLY", "PREMIUM_YEARLY"].includes(plan)) {
      return createErrorResponse("Invalid plan specified", 400);
    }

    logger.info("Updating user plan in session", { 
      userId: session.userId, 
      oldPlan: session.plan,
      newPlan: plan 
    });

    try {
      // Update user plan in database
      await UserService.updateUser(session.userId, { plan });
      logger.info("User plan updated in database", { userId: session.userId, plan });
    } catch (dbError) {
      logger.error("Failed to update user plan in database", { 
        userId: session.userId, 
        plan, 
        error: dbError 
      });
      // Continue with session update even if DB update fails
      // This ensures the session is at least updated for immediate use
    }

    // Create updated session with new plan
    const updatedSession = {
      ...session,
      plan,
      user: session.user ? {
        ...session.user,
        plan
      } : undefined,
    };

    // Create response
    const response = NextResponse.json(createSuccessResponse({
      message: "Session updated successfully",
      plan,
      userId: session.userId,
    }));

    // Set updated session cookie
    await ServerSessionService.setSession(request, updatedSession, response);

    logger.info("Session updated successfully", { 
      userId: session.userId, 
      newPlan: plan 
    });

    return response;

  } catch (error) {
    logger.error("Session update error", { error });
    return createErrorResponse(
      error instanceof Error ? error.message : "Failed to update session",
      500
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
