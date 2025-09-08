import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/config/database/prisma"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders, createSuccessResponse, createErrorResponse } from "@/controllers/api-response"
import { logger } from "@/config/logger"
import { ServerSessionService } from "@/services/session-server"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

// GET subscription data for authenticated user
export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    // Get current session and validate user
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      logger.warn("Unauthorized subscription access attempt")
      return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    const userId = session.userId

    try {
      // Get user's most recent subscription with all related data
      const subscription = await prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              plan: true,
            }
          }
        }
      })

      // Get user's invoices
      const invoices = await prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20, // Limit to last 20 invoices
      })

      // Transform data to match frontend interface
      const subscriptionData = subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        createdAt: subscription.createdAt.toISOString(),
        updatedAt: subscription.updatedAt.toISOString(),
        stripeCustomerId: subscription.stripeCustomerId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      } : null

      const invoiceData = invoices.map(invoice => ({
        id: invoice.id,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        hostedInvoiceUrl: invoice.hostedInvoiceUrl,
        invoicePdf: invoice.invoicePdf,
        createdAt: invoice.createdAt.toISOString(),
        stripeInvoiceId: invoice.stripeInvoiceId,
      }))

      logger.info("Subscription data retrieved successfully", { 
        userId, 
        hasSubscription: !!subscription,
        invoiceCount: invoices.length 
      })

      return addSecurityHeaders(createSuccessResponse({
        subscription: subscriptionData,
        invoices: invoiceData,
        totalInvoices: invoices.length,
      }, "Subscription data retrieved successfully"))

    } catch (dbError) {
      logger.error("Database error fetching subscription data", { 
        error: dbError, 
        userId,
        errorMessage: dbError instanceof Error ? dbError.message : 'Unknown database error'
      })
      
      return addSecurityHeaders(createErrorResponse(
        "Database error occurred while fetching subscription data",
        500,
        dbError instanceof Error ? dbError.message : "Unknown database error"
      ))
    }

  } catch (error) {
    logger.error("Subscription API error", { 
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return addSecurityHeaders(createErrorResponse(
      "Internal server error occurred",
      500,
      error instanceof Error ? error.message : "Unknown error"
    ))
  }
})

// POST endpoint to handle subscription updates/cancellations
export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    // Get current session and validate user
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    let requestBody
    try {
      requestBody = await request.json()
    } catch (parseError) {
      logger.error("JSON parse error in subscription API", { parseError })
      return addSecurityHeaders(createErrorResponse(
        "Invalid request body format",
        400,
        "Could not parse request body as JSON"
      ))
    }

    const { action, subscriptionId } = requestBody

    if (!action || !subscriptionId) {
      return addSecurityHeaders(createErrorResponse(
        "Missing required fields",
        400,
        "Both 'action' and 'subscriptionId' are required"
      ))
    }

    const userId = session.userId

    try {
      // Verify user owns this subscription
      const subscription = await prisma.subscription.findFirst({
        where: { 
          id: subscriptionId,
          userId: userId
        }
      })

      if (!subscription) {
        return addSecurityHeaders(createErrorResponse(
          "Subscription not found",
          404,
          "No subscription found for this user"
        ))
      }

      // Handle different actions
      let updatedSubscription
      switch (action) {
        case 'cancel':
          updatedSubscription = await prisma.subscription.update({
            where: { id: subscriptionId },
            data: { 
              cancelAtPeriodEnd: true,
              updatedAt: new Date()
            }
          })
          logger.info("Subscription marked for cancellation", { userId, subscriptionId })
          break

        case 'reactivate':
          updatedSubscription = await prisma.subscription.update({
            where: { id: subscriptionId },
            data: { 
              cancelAtPeriodEnd: false,
              updatedAt: new Date()
            }
          })
          logger.info("Subscription reactivated", { userId, subscriptionId })
          break

        default:
          return addSecurityHeaders(createErrorResponse(
            "Invalid action",
            400,
            "Action must be 'cancel' or 'reactivate'"
          ))
      }

      return addSecurityHeaders(createSuccessResponse({
        subscription: {
          id: updatedSubscription.id,
          plan: updatedSubscription.plan,
          status: updatedSubscription.status,
          cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
          updatedAt: updatedSubscription.updatedAt.toISOString(),
        }
      }, `Subscription ${action} successful`))

    } catch (dbError) {
      logger.error("Database error updating subscription", { 
        error: dbError, 
        userId,
        action,
        subscriptionId
      })
      
      return addSecurityHeaders(createErrorResponse(
        "Database error occurred while updating subscription",
        500,
        dbError instanceof Error ? dbError.message : "Unknown database error"
      ))
    }

  } catch (error) {
    logger.error("Subscription update API error", { error })
    
    return addSecurityHeaders(createErrorResponse(
      "Internal server error occurred",
      500,
      error instanceof Error ? error.message : "Unknown error"
    ))
  }
})
