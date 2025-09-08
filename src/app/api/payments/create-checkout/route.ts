import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/config/database/prisma"
import { stripe } from "@/lib/stripe"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { withErrorHandling } from "@/config/middleware/middleware"
import { addSecurityHeaders, createSuccessResponse, createErrorResponse } from "@/controllers/api-response"
import { logger } from "@/config/logger"
import { env } from "@/validations/env"
import { ServerSessionService } from "@/services/session-server"

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

// POST endpoint to create Stripe checkout session
export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    // Get current session and validate user
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      logger.warn("Unauthorized checkout attempt")
      return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    let requestBody
    try {
      requestBody = await request.json()
    } catch (parseError) {
      logger.error("JSON parse error in checkout API", { parseError })
      return addSecurityHeaders(createErrorResponse(
        "Invalid request body format",
        400,
        "Could not parse request body as JSON"
      ))
    }

    const { planId, userId } = requestBody

    if (!planId || !userId || userId !== session.userId) {
      return addSecurityHeaders(createErrorResponse(
        "Missing or invalid required fields",
        400,
        "planId and userId are required and must match session"
      ))
    }

    // Get plan details
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)
    if (!plan || plan.price === 0) {
      return addSecurityHeaders(createErrorResponse(
        "Invalid plan selected",
        400,
        "Plan not found or is free plan"
      ))
    }

    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscriptions: true },
      })

      if (!user) {
        return addSecurityHeaders(createErrorResponse(
          "User not found",
          404,
          "User does not exist"
        ))
      }

      // Get or create Stripe customer
      let stripeCustomerId = user.subscriptions[0]?.stripeCustomerId
      
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        })
        stripeCustomerId = customer.id
        
        // Create initial subscription record
        await prisma.subscription.create({
          data: {
            userId: user.id,
            stripeCustomerId: stripeCustomerId,
            status: "INCOMPLETE",
            plan: "FREEMIUM",
          },
        })
      }

      // Create Stripe checkout session
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.APP_URL}/subscription`,
        metadata: {
          userId: user.id,
          planId: plan.id,
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            planId: plan.id,
          },
        },
      })

      logger.info("Stripe checkout session created", { 
        userId, 
        planId, 
        sessionId: checkoutSession.id 
      })

      return addSecurityHeaders(createSuccessResponse({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      }, "Checkout session created successfully"))

    } catch (stripeError) {
      logger.error("Stripe API error", { 
        error: stripeError, 
        userId,
        planId,
        errorMessage: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
      })
      
      return addSecurityHeaders(createErrorResponse(
        "Payment processing error",
        500,
        stripeError instanceof Error ? stripeError.message : "Unknown payment error"
      ))
    }

  } catch (error) {
    logger.error("Checkout API error", { 
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
