"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, X, Sparkles, Crown, Zap, BarChart3, Calendar, Hash, Users, AlertCircle, Loader2 } from "lucide-react"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { createCheckoutSession, updateUserPlan } from "@/services/subscription"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10,
    },
  },
}

const cardHoverVariants = {
  hover: {
    scale: 1.02,
    y: -8,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
}

export default function SubscriptionPlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>("monthly")
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  // Mock user ID - replace with actual user context
  const userId = "user_123"

  const handlePlanSelect = async (planId: string) => {
    if (planId === "basic") {
      // Handle free plan selection
      setIsLoading(planId)
      try {
        const result = await updateUserPlan(userId, planId)
        if (result.success) {
          toast({
            title: "Plan Updated",
            description: "You're now on the Basic plan!",
          })
          router.push("/dashboard")
        } else {
          setError(result.error || "Failed to update plan")
        }
      } catch (error) {
        setError("An unexpected error occurred")
      } finally {
        setIsLoading(null)
      }
      return
    }

    // Handle premium plan selection
    setIsLoading(planId)
    setError("")

    try {
      const result = await createCheckoutSession(userId, planId)

      if (result.success && 'url' in result && result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url
      } else {
        setError('error' in result ? (result.error || "Failed to create checkout session") : "Failed to create checkout session")
      }
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(null)
    }
  }

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "basic":
        return <BarChart3 className="h-6 w-6" />
      case "monthly":
        return <Zap className="h-6 w-6" />
      case "yearly":
        return <Crown className="h-6 w-6" />
      default:
        return <Sparkles className="h-6 w-6" />
    }
  }

  const getPlanGradient = (planId: string) => {
    switch (planId) {
      case "basic":
        return "from-gray-500 to-gray-600"
      case "monthly":
        return "from-blue-500 to-purple-600"
      case "yearly":
        return "from-purple-500 to-pink-600"
      default:
        return "from-blue-500 to-purple-600"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan to unlock powerful social media analytics and grow your online presence
          </p>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div variants={itemVariants} className="mb-8">
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Plans Grid */}
        <motion.div variants={itemVariants} className="grid gap-8 lg:grid-cols-3 mb-12">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <motion.div key={plan.id} variants={cardHoverVariants} whileHover="hover" className="relative">
              <Card
                className={`relative overflow-hidden bg-white/80 backdrop-blur-sm border-2 transition-all duration-300 ${
                  plan.popular
                    ? "border-purple-500 shadow-2xl shadow-purple-500/20"
                    : selectedPlan === plan.id
                      ? "border-blue-500 shadow-xl shadow-blue-500/20"
                      : "border-gray-200 shadow-lg hover:border-gray-300"
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 text-sm font-semibold">
                      <Crown className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${getPlanGradient(plan.id)} opacity-5`} />

                <CardHeader className="relative text-center pb-4">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${getPlanGradient(plan.id)} rounded-xl mb-4`}
                  >
                    <div className="text-white">{getPlanIcon(plan.id)}</div>
                  </div>

                  <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>

                  <CardDescription className="text-gray-600 mt-2">{plan.description}</CardDescription>

                  {/* Price */}
                  <div className="mt-6">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {plan.price === 0 ? "Free" : `$${plan.price}`}
                      </span>
                      {plan.interval && (
                        <span className="text-gray-600">/{plan.interval === "year" ? "year" : "month"}</span>
                      )}
                    </div>
                    {plan.savings && (
                      <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800 border-green-200">
                        {plan.savings}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="relative space-y-6">
                  {/* Features List */}
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                            feature.included ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {feature.included ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${feature.included ? "text-gray-900" : "text-gray-500"}`}>
                            {feature.name}
                          </p>
                          {feature.description && <p className="text-xs text-gray-500 mt-1">{feature.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* CTA Button */}
                  <Button
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={isLoading === plan.id}
                    className={`w-full h-12 font-semibold text-lg transition-all duration-200 ${
                      plan.popular
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl"
                        : plan.price === 0
                          ? "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white"
                          : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
                    }`}
                  >
                    {isLoading === plan.id ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {plan.price === 0 ? "Activating..." : "Processing..."}
                      </>
                    ) : (
                      <>
                        {plan.price === 0 ? "Get Started Free" : "Upgrade Now"}
                        <Sparkles className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  {plan.price > 0 && (
                    <p className="text-xs text-gray-500 text-center">Cancel anytime • Secure payment via Stripe</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature Comparison */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Feature Comparison</CardTitle>
              <CardDescription>See what's included in each plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
                    title: "Post Analytics",
                    basic: "Basic metrics",
                    premium: "Advanced insights",
                  },
                  {
                    icon: <Users className="h-6 w-6 text-purple-600" />,
                    title: "Social Accounts",
                    basic: "1 account",
                    premium: "Unlimited",
                  },
                  {
                    icon: <Calendar className="h-6 w-6 text-green-600" />,
                    title: "Post Scheduling",
                    basic: "Not included",
                    premium: "Full scheduling",
                  },
                  {
                    icon: <Hash className="h-6 w-6 text-pink-600" />,
                    title: "AI Hashtags",
                    basic: "Not included",
                    premium: "Smart suggestions",
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="text-center p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100"
                  >
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm mb-3">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">Basic: {feature.basic}</p>
                      <p className="text-gray-900 font-medium">Premium: {feature.premium}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ Section */}
        <motion.div variants={itemVariants} className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions about our plans?</h2>
          <p className="text-gray-600 mb-6">We're here to help you choose the right plan for your needs.</p>
          <Button variant="outline" className="bg-white/80 backdrop-blur-sm">
            Contact Support
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
