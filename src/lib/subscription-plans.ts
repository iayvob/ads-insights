import { env } from "@/validations/env"

export interface PlanFeature {
  name: string
  included: boolean
  description?: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  interval: "month" | "year" | null
  stripePriceId: string
  features: PlanFeature[]
  popular?: boolean
  savings?: string
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    description: "Perfect for getting started with social media analytics",
    price: 0,
    interval: null,
    stripePriceId: "", // No Stripe price for free plan
    features: [
      { name: "Post Analytics", included: true, description: "Track engagement and performance" },
      { name: "Twitter & Instagram", included: true, description: "Access to Twitter/X and Instagram analytics" },
      { name: "Basic Dashboard", included: true, description: "Essential metrics and insights" },
      { name: "Ads Analytics", included: false, description: "Premium only feature" },
      { name: "AI Insights", included: false },
      { name: "Post Scheduling", included: false },
      { name: "AI Hashtag Suggestions", included: false },
      { name: "Additional Platforms", included: false, description: "Facebook, TikTok, Amazon" },
      { name: "Advanced Reports", included: false },
      { name: "Priority Support", included: false },
    ],
  },
  {
    id: "monthly",
    name: "Premium Monthly",
    description: "Full access to all features with monthly billing",
    price: 29,
    interval: "month",
    stripePriceId: env.STRIPE_MONTHLY_PRICE_ID || "price_monthly",
    features: [
      { name: "Post Analytics", included: true, description: "Advanced engagement tracking" },
      { name: "Unlimited Social Accounts", included: true, description: "Connect all your platforms" },
      { name: "Ads Analytics", included: true, description: "Track ad performance and ROI" },
      { name: "AI Insights", included: true, description: "Smart recommendations and trends" },
      { name: "Post Scheduling", included: true, description: "Schedule posts across platforms" },
      { name: "AI Hashtag Suggestions", included: true, description: "Dynamic hashtag optimization" },
      { name: "Advanced Dashboard", included: true, description: "Comprehensive analytics suite" },
      { name: "Advanced Reports", included: true, description: "Detailed performance reports" },
      { name: "Priority Support", included: true, description: "24/7 premium support" },
      { name: "API Access", included: true, description: "Integrate with your tools" },
    ],
  },
  {
    id: "yearly",
    name: "Premium Yearly",
    description: "Best value with annual billing and exclusive features",
    price: 290,
    interval: "year",
    stripePriceId: env.STRIPE_YEARLY_PRICE_ID || "price_yearly",
    popular: true,
    savings: "Save $58/year",
    features: [
      { name: "Post Analytics", included: true, description: "Advanced engagement tracking" },
      { name: "Unlimited Social Accounts", included: true, description: "Connect all your platforms" },
      { name: "Ads Analytics", included: true, description: "Track ad performance and ROI" },
      { name: "AI Insights", included: true, description: "Smart recommendations and trends" },
      { name: "Post Scheduling", included: true, description: "Schedule posts across platforms" },
      { name: "AI Hashtag Suggestions", included: true, description: "Dynamic hashtag optimization" },
      { name: "Advanced Dashboard", included: true, description: "Comprehensive analytics suite" },
      { name: "Advanced Reports", included: true, description: "Detailed performance reports" },
      { name: "Priority Support", included: true, description: "24/7 premium support" },
      { name: "API Access", included: true, description: "Integrate with your tools" },
      { name: "White-label Reports", included: true, description: "Branded reports for clients" },
      { name: "Custom Integrations", included: true, description: "Tailored solutions" },
    ],
  },
]

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId)
}

export function formatPrice(price: number, interval?: string | null): string {
  if (price === 0) return "Free"

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(price)

  if (interval) {
    return `${formatted}/${interval === "year" ? "year" : "month"}`
  }

  return formatted
}