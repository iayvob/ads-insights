import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { headers } from "next/headers"
import { prisma } from "@/config/database/prisma"
import { env } from "@/validations/env"

const webhookSecret = env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")!

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object)
        break

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object)
        break

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object)
        break

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object)
        break

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  try {
    const userId = session.metadata?.userId
    const planId = session.metadata?.planId

    if (!userId || !planId) {
      console.error("Missing metadata in checkout session")
      return
    }

    let subscriptionPlan: "FREEMIUM" | "PREMIUM_MONTHLY" | "PREMIUM_YEARLY"

    switch (planId) {
      case "monthly":
        subscriptionPlan = "PREMIUM_MONTHLY"
        break
      case "yearly":
        subscriptionPlan = "PREMIUM_YEARLY"
        break
      default:
        console.error("Invalid plan ID in checkout session")
        return
    }

    // Update or create user subscription
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true },
    })

    if (!existingUser) {
      console.error("User not found")
      return
    }

    if (existingUser.subscriptions.length > 0) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { id: existingUser.subscriptions[0].id },
        data: {
          stripeSubscriptionId: session.subscription,
          stripePriceId: session.display_items?.[0]?.price?.id,
          status: "ACTIVE",
          plan: subscriptionPlan,
          currentPeriodStart: new Date(session.subscription_details?.current_period_start * 1000),
          currentPeriodEnd: new Date(session.subscription_details?.current_period_end * 1000),
        },
      })
    } else {
      // Create new subscription
      await prisma.subscription.create({
        data: {
          userId: userId,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          stripePriceId: session.display_items?.[0]?.price?.id,
          status: "ACTIVE",
          plan: subscriptionPlan,
          currentPeriodStart: new Date(session.subscription_details?.current_period_start * 1000),
          currentPeriodEnd: new Date(session.subscription_details?.current_period_end * 1000),
        },
      })
    }

    console.log(`Subscription activated for user ${userId}`)
  } catch (error) {
    console.error("Error handling checkout session completed:", error)
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer)

    if ("deleted" in customer) {
      console.error("Customer was deleted")
      return
    }

    const userId = customer.metadata?.userId

    if (!userId) {
      console.error("No userId found in customer metadata")
      return
    }

    // Update or create user subscription
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true },
    })

    if (!existingUser) {
      console.error("User not found")
      return
    }

    const subscriptionPlan = subscription.items.data[0].price.recurring?.interval === "year" 
      ? "PREMIUM_YEARLY" 
      : "PREMIUM_MONTHLY"

    if (existingUser.subscriptions.length > 0) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { id: existingUser.subscriptions[0].id },
        data: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          status: "ACTIVE",
          plan: subscriptionPlan,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
    } else {
      // Create new subscription
      await prisma.subscription.create({
        data: {
          userId: userId,
          stripeCustomerId: subscription.customer,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          status: "ACTIVE",
          plan: subscriptionPlan,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
    }

    console.log(`Subscription created for user ${userId}`)
  } catch (error) {
    console.error("Error handling subscription created:", error)
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer)

    if ("deleted" in customer) {
      console.error("Customer was deleted")
      return
    }

    const userId = customer.metadata?.userId

    if (!userId) {
      console.error("No userId found in customer metadata")
      return
    }

    let status: "ACTIVE" | "CANCELED" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "PAST_DUE" | "TRIALING" | "UNPAID"

    switch (subscription.status) {
      case "active":
        status = "ACTIVE"
        break
      case "canceled":
        status = "CANCELED"
        break
      case "incomplete":
        status = "INCOMPLETE"
        break
      case "incomplete_expired":
        status = "INCOMPLETE_EXPIRED"
        break
      case "past_due":
        status = "PAST_DUE"
        break
      case "trialing":
        status = "TRIALING"
        break
      case "unpaid":
        status = "UNPAID"
        break
      default:
        status = "ACTIVE"
    }

    await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      data: {
        status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    })

    console.log(`Subscription updated for user ${userId}`)
  } catch (error) {
    console.error("Error handling subscription updated:", error)
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer)

    if ("deleted" in customer) {
      console.error("Customer was deleted")
      return
    }

    const userId = customer.metadata?.userId

    if (!userId) {
      console.error("No userId found in customer metadata")
      return
    }

    await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      data: {
        status: "CANCELED",
        plan: "FREEMIUM",
      },
    })

    console.log(`Subscription canceled for user ${userId}`)
  } catch (error) {
    console.error("Error handling subscription deleted:", error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    const customer = await stripe.customers.retrieve(invoice.customer)

    if ("deleted" in customer) {
      console.error("Customer was deleted")
      return
    }

    const userId = customer.metadata?.userId

    if (!userId) {
      console.error("No userId found in customer metadata")
      return
    }

    // Create invoice record
    await prisma.invoice.create({
      data: {
        userId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: "ACTIVE", // Using a valid SubscriptionStatus value
        paymentIntentId: invoice.payment_intent,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      },
    })

    console.log(`Invoice payment succeeded for user ${userId}`)
  } catch (error) {
    console.error("Error handling invoice payment succeeded:", error)
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  try {
    const customer = await stripe.customers.retrieve(invoice.customer)

    if ("deleted" in customer) {
      console.error("Customer was deleted")
      return
    }

    const userId = customer.metadata?.userId

    if (!userId) {
      console.error("No userId found in customer metadata")
      return
    }

    // Update subscription status
    await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: invoice.subscription,
      },
      data: {
        status: "PAST_DUE",
      },
    })

    console.log(`Invoice payment failed for user ${userId}`)
  } catch (error) {
    console.error("Error handling invoice payment failed:", error)
  }
}
