import Stripe from "stripe"
import { env } from "@/validations/env"

if (!env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
})

export const getStripePublishableKey = () => {
  if (!env.STRIPE_PUBLISHABLE_KEY) {
    throw new Error("STRIPE_PUBLISHABLE_KEY is not set")
  }
  return env.STRIPE_PUBLISHABLE_KEY
}
