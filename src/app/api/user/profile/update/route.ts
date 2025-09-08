import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/services/user"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders, createSuccessResponse } from "@/controllers/api-response"
import { UpdateUserInput } from "@/validations/types"
import { ServerSessionService } from "@/services/session-server"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export const PUT = withErrorHandling(async (request: NextRequest) => {
  try {
    // Get current session and validate user
    const session = await ServerSessionService.getSession(request);
    if (!session?.userId) {
      return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }        // Parse the request body safely
        let requestBody;
        try {
            requestBody = await request.json();
        } catch (parseError) {
            console.error("JSON parse error:", parseError);
            return addSecurityHeaders(NextResponse.json({
                error: "Invalid request body",
                message: "Could not parse request body as JSON"
            }, { status: 400 }));
        }

        const { userId, updates } = requestBody;

        // Validate required fields
        if (!userId) {
            return addSecurityHeaders(NextResponse.json({
                error: "Missing userId",
                message: "Request body must contain a userId"
            }, { status: 400 }));
        }

        if (!updates || typeof updates !== 'object') {
            return addSecurityHeaders(NextResponse.json({
                error: "Missing updates",
                message: "Request body must contain an updates object"
            }, { status: 400 }));
        }

        // Ensure the user can only update their own profile unless they're an admin
        if (userId !== session.userId) {
            // TODO: Add admin check here if needed
            return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
        }

        // Validate the updates object (basic validation)
        const validUpdates: UpdateUserInput = {};

        if (typeof updates.username === 'string' && updates.username.trim()) {
            validUpdates.username = updates.username.trim();
        }

        if (typeof updates.email === 'string' && updates.email.includes('@')) {
            validUpdates.email = updates.email.trim().toLowerCase();
        }

        // If no valid updates, return early
        if (Object.keys(validUpdates).length === 0) {
            return addSecurityHeaders(NextResponse.json({
                error: "No valid updates provided",
                message: "At least one valid field (username, email) must be provided"
            }, { status: 400 }));
        }

        try {
            // Update the user profile
            const updatedUser = await UserService.updateUser(userId, validUpdates);

            if (!updatedUser) {
                return addSecurityHeaders(NextResponse.json({ error: "Failed to update user" }, { status: 500 }));
            }

            // Get complete updated user data to return
            const userData = await UserService.getUserWithProviders(userId);

            if (!userData) {
                return addSecurityHeaders(NextResponse.json({ error: "User not found after update" }, { status: 404 }));
            }

            return addSecurityHeaders(createSuccessResponse({
                user: {
                    id: userData.id,
                    email: userData.email || '',
                    username: userData.username || '',
                    image: userData.image || null,
                    plan: userData.plan || 'free',
                    createdAt: userData.createdAt || new Date(),
                    updatedAt: userData.updatedAt || new Date(),
                    lastLogin: userData.lastLogin || null,
                    authProviders: Array.isArray(userData.authProviders)
                        ? userData.authProviders.map((provider) => ({
                            provider: provider.provider || 'unknown',
                            username: provider.username || '',
                            email: provider.email || '',
                            createdAt: provider.createdAt || new Date(),
                            expiresAt: provider.expiresAt || null,
                        }))
                        : [],
                },
            }, "Profile updated successfully"));
        } catch (dbError) {
            console.error(`Database error updating profile for user ${userId}:`, dbError);
            return addSecurityHeaders(NextResponse.json({
                error: "Database error",
                message: dbError instanceof Error ? dbError.message : "Unknown database error"
            }, { status: 500 }));
        }
    } catch (error) {
        console.error("Profile update API error:", error);
        return addSecurityHeaders(NextResponse.json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 }));
    }
});