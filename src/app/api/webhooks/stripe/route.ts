import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/config/database/prisma"
import { logger } from "@/config/logger"
import { env } from "@/validations/env"
import Stripe from "stripe"

export const dynamic = "force-dynamic"

// POST endpoint for Stripe webhooks
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    logger.error("Missing Stripe signature")
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    logger.error("Webhook signature verification failed", { error })
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      default:
        logger.info("Unhandled webhook event type", { type: event.type })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error("Webhook handler error", { error, eventType: event.type })
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const planId = session.metadata?.planId

  if (!userId || !planId) {
    logger.error("Missing metadata in checkout session", { sessionId: session.id })
    return
  }

  try {
    // Get plan mapping
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
        logger.error("Invalid plan ID in checkout", { planId, sessionId: session.id })
        return
    }

    // Check if user exists and current plan is different before updating
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true }
    })

    if (!currentUser) {
      logger.error("User not found for checkout session", { userId, sessionId: session.id })
      return
    }

    // Only update if plan has actually changed
    if (currentUser.plan !== subscriptionPlan) {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: subscriptionPlan },
      })

      logger.info("User plan updated from checkout", { 
        userId, 
        planId, 
        oldPlan: currentUser.plan,
        newPlan: subscriptionPlan,
        sessionId: session.id 
      })
    } else {
      logger.info("User plan already up to date", { 
        userId, 
        plan: subscriptionPlan,
        sessionId: session.id 
      })
    }
  } catch (error) {
    logger.error("Error updating user plan from checkout", { 
      error, 
      userId, 
      planId,
      sessionId: session.id 
    })
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  const planId = subscription.metadata?.planId

  if (!userId) {
    logger.error("Missing userId in subscription metadata", { subscriptionId: subscription.id })
    return
  }

  try {
    // Map plan ID to subscription plan
    let subscriptionPlan: "FREEMIUM" | "PREMIUM_MONTHLY" | "PREMIUM_YEARLY"
    switch (planId) {
      case "monthly":
        subscriptionPlan = "PREMIUM_MONTHLY"
        break
      case "yearly":
        subscriptionPlan = "PREMIUM_YEARLY"
        break
      default:
        subscriptionPlan = "FREEMIUM"
    }

    // Check if subscription already exists
    const existingSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id }
    })

    if (existingSubscription) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: subscription.status.toUpperCase() as any,
          plan: subscriptionPlan,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        },
      })
    } else {
      // Create new subscription
      await prisma.subscription.create({
        data: {
          userId: userId,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price.id,
          plan: subscriptionPlan,
          status: subscription.status.toUpperCase() as any,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        },
      })
    }

    // Update user plan if it's different
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true }
    })

    if (currentUser && currentUser.plan !== subscriptionPlan) {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: subscriptionPlan },
      })
    }

    logger.info("Subscription created/updated", { 
      userId, 
      subscriptionId: subscription.id,
      plan: subscriptionPlan 
    })
  } catch (error) {
    logger.error("Error handling subscription creation", { 
      error, 
      subscriptionId: subscription.id 
    })
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Find the subscription to update
    const existingSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id }
    })

    if (!existingSubscription) {
      logger.warn("Subscription not found for update", { subscriptionId: subscription.id })
      return
    }

    // Only update if data has actually changed
    const newData = {
      status: subscription.status.toUpperCase() as any,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
    }

    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: newData,
    })

    logger.info("Subscription updated", { subscriptionId: subscription.id })
  } catch (error) {
    logger.error("Error updating subscription", { error, subscriptionId: subscription.id })
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId

  try {
    // Find the subscription to update
    const existingSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id }
    })

    if (existingSubscription) {
      // Update subscription status
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "CANCELED",
          cancelAtPeriodEnd: true,
        },
      })
    }

    // Downgrade user to freemium if userId is available
    if (userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true }
      })

      // Only update if user is not already on freemium
      if (currentUser && currentUser.plan !== "FREEMIUM") {
        await prisma.user.update({
          where: { id: userId },
          data: { plan: "FREEMIUM" },
        })
      }
    }

    logger.info("Subscription canceled", { subscriptionId: subscription.id, userId })
  } catch (error) {
    logger.error("Error handling subscription deletion", { 
      error, 
      subscriptionId: subscription.id 
    })
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!(invoice as any).subscription) return

  try {
    // Get userId from subscription metadata
    let userId = invoice.metadata?.userId

    // If no userId in invoice metadata, get it from subscription
    if (!userId && (invoice as any).subscription) {
      const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string)
      userId = subscription.metadata?.userId
    }

    if (!userId) {
      logger.error("Cannot find userId for invoice", { invoiceId: invoice.id })
      return
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { stripeInvoiceId: invoice.id || '' }
    })

    if (existingInvoice) {
      logger.info("Invoice already exists", { invoiceId: invoice.id })
      return
    }

    // Create invoice record only if it doesn't exist
    await prisma.invoice.create({
      data: {
        userId: userId,
        stripeInvoiceId: invoice.id || '',
        amount: invoice.amount_paid || 0,
        currency: invoice.currency || 'usd',
        status: "ACTIVE", // Payment succeeded
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      },
    })

    logger.info("Invoice payment succeeded", { invoiceId: invoice.id, userId })
  } catch (error) {
    logger.error("Error handling invoice payment success", { 
      error, 
      invoiceId: invoice.id 
    })
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    // Update subscription status if needed
    if ((invoice as any).subscription) {
      const existingSubscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: (invoice as any).subscription as string }
      })

      if (existingSubscription) {
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: { status: "PAST_DUE" },
        })
      }
    }

    logger.info("Invoice payment failed", { invoiceId: invoice.id })
  } catch (error) {
    logger.error("Error handling invoice payment failure", { 
      error, 
      invoiceId: invoice.id 
    })
  }
}
