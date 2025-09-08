import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders, createSuccessResponse, createErrorResponse } from "@/controllers/api-response"
import { logger } from "@/config/logger"
import { ServerSessionService } from "@/services/session-server"

export const dynamic = "force-dynamic";

// POST endpoint to verify Stripe payment
export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    // Get current session and validate user
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      logger.warn("Unauthorized payment verification attempt")
      return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    let requestBody
    try {
      requestBody = await request.json()
    } catch (parseError) {
      logger.error("JSON parse error in payment verification", { parseError })
      return addSecurityHeaders(createErrorResponse(
        "Invalid request body format",
        400,
        "Could not parse request body as JSON"
      ))
    }

    const { sessionId } = requestBody

    if (!sessionId) {
      return addSecurityHeaders(createErrorResponse(
        "Missing session ID",
        400,
        "Stripe session ID is required"
      ))
    }

    try {
      // Retrieve the checkout session from Stripe
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'line_items'],
      })

      if (checkoutSession.payment_status !== 'paid') {
        return addSecurityHeaders(createErrorResponse(
          "Payment not completed",
          400,
          "Payment has not been completed successfully"
        ))
      }

      // Get plan details
      const planId = checkoutSession.metadata?.planId
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)

      if (!plan) {
        return addSecurityHeaders(createErrorResponse(
          "Plan not found",
          404,
          "Associated plan could not be found"
        ))
      }

      // Format payment details for response
      const paymentDetails = {
        sessionId: checkoutSession.id,
        planId: plan.id,
        planName: plan.name,
        amount: `$${(checkoutSession.amount_total || 0) / 100}`,
        interval: plan.interval ? `per ${plan.interval}` : 'one-time',
        currency: checkoutSession.currency?.toUpperCase() || 'USD',
        paymentStatus: checkoutSession.payment_status,
        customerEmail: checkoutSession.customer_details?.email,
      }

      logger.info("Payment verification successful", { 
        userId: session.userId, 
        sessionId,
        planId 
      })

      return addSecurityHeaders(createSuccessResponse({
        payment: paymentDetails,
      }, "Payment verified successfully"))

    } catch (stripeError) {
      logger.error("Stripe verification error", { 
        error: stripeError, 
        sessionId,
        errorMessage: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
      })
      
      return addSecurityHeaders(createErrorResponse(
        "Payment verification failed",
        500,
        stripeError instanceof Error ? stripeError.message : "Unknown payment verification error"
      ))
    }

  } catch (error) {
    logger.error("Payment verification API error", { 
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
