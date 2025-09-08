import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { updateUserPlan } from "@/services/subscription"

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Session ID required" }, { status: 400 })
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === "paid") {
      const userId = session.metadata?.userId
      const planId = session.metadata?.planId

      if (userId && planId) {
        // Update user plan
        const result = await updateUserPlan(userId, planId)

        if (result.success) {
          return NextResponse.json({
            success: true,
            session: {
              id: session.id,
              customer: session.customer,
              planId,
              amount: session.amount_total,
              currency: session.currency,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: false, error: "Payment not completed" }, { status: 400 })
  } catch (error) {
    console.error("Error verifying session:", error)
    return NextResponse.json({ success: false, error: "Failed to verify session" }, { status: 500 })
  }
}
