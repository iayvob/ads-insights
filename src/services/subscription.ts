"use server"

import { prisma } from "@/config/database/prisma"
import { stripe } from "@/lib/stripe"
import { getPlanById } from "@/lib/subscription-plans"
import { cookies } from "next/headers"
import { env } from "@/validations/env"

export async function createStripeCustomer(userId: string, email: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    })

    // Update user with Stripe customer ID - create new subscription
    await prisma.subscription.create({
      data: {
        userId: userId,
        stripeCustomerId: customer.id,
        status: "ACTIVE",
        plan: "FREEMIUM",
      },
    })

    return { success: true, customerId: customer.id }
  } catch (error) {
    console.error("Error creating Stripe customer:", error)
    return { success: false, error: "Failed to create customer" }
  }
}

export async function createCheckoutSession(userId: string, planId: string) {
  try {
    const plan = getPlanById(planId)
    if (!plan || plan.price === 0) {
      return { success: false, error: "Invalid plan selected" }
    }

    // Get user with subscriptions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true },
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Get the most recent subscription or null
    const currentSubscription = user.subscriptions.length > 0 
      ? user.subscriptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      : null

    let customerId = currentSubscription?.stripeCustomerId

    // Create customer if doesn't exist
    if (!customerId) {
      const customerResult = await createStripeCustomer(userId, user.email || "")
      if (!customerResult.success) {
        return customerResult
      }
      customerId = customerResult.customerId
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
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
        userId,
        planId,
      },
    })

    return { success: true, sessionId: session.id, url: session.url }
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return { success: false, error: "Failed to create checkout session" }
  }
}

export async function updateUserPlan(userId: string, planId: string) {
  try {
    const plan = getPlanById(planId)
    if (!plan) {
      return { success: false, error: "Invalid plan" }
    }

    let subscriptionPlan: "FREEMIUM" | "PREMIUM_MONTHLY" | "PREMIUM_YEARLY"

    switch (planId) {
      case "basic":
        subscriptionPlan = "FREEMIUM"
        break
      case "monthly":
        subscriptionPlan = "PREMIUM_MONTHLY"
        break
      case "yearly":
        subscriptionPlan = "PREMIUM_YEARLY"
        break
      default:
        return { success: false, error: "Invalid plan ID" }
    }

    // Update user subscription in database
    // First try to find existing subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    })

    if (existingSubscription) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          plan: subscriptionPlan,
          status: "ACTIVE",
        },
      })
    } else {
      // Create new subscription
      await prisma.subscription.create({
        data: {
          userId: userId,
          plan: subscriptionPlan,
          status: "ACTIVE",
        },
      })
    }

    // Update user plan in cookies
    const cookieStore = await cookies()
    const existingCookie = cookieStore.get("user-plan")

    cookieStore.set(
      "user-plan",
      JSON.stringify({
        planId,
        planName: plan.name,
        updatedAt: new Date().toISOString(),
      }),
      {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    )

    return { success: true }
  } catch (error) {
    console.error("Error updating user plan:", error)
    return { success: false, error: "Failed to update plan" }
  }
}

export async function getUserSubscription(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true },
    })

    if (!user || user.subscriptions.length === 0) {
      return { success: false, error: "Subscription not found" }
    }

    // Get the most recent subscription
    const currentSubscription = user.subscriptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

    let planId: string
    switch (currentSubscription.plan) {
      case "FREEMIUM":
        planId = "basic"
        break
      case "PREMIUM_MONTHLY":
        planId = "monthly"
        break
      case "PREMIUM_YEARLY":
        planId = "yearly"
        break
      default:
        planId = "basic"
    }

    const plan = getPlanById(planId)

    return {
      success: true,
      subscription: {
        ...currentSubscription,
        plan: plan,
        planId,
      },
    }
  } catch (error) {
    console.error("Error getting user subscription:", error)
    return { success: false, error: "Failed to get subscription" }
  }
}