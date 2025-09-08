"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Check,
  Crown,
  Sparkles,
  Zap,
  Star,
  Loader2,
  X,
  CreditCard,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Bot,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/session-context";
import { useToast } from "@/hooks/use-toast";
import { SUBSCRIPTION_PLANS, formatPrice } from "@/lib/subscription-plans";
import axios from "axios";
import { env } from "@/validations/env"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

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
};

// Enhanced plans with feature restrictions
const plans = [
  {
    id: "basic",
    name: "Freemium",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    stripePriceId: "",
    features: [
      "Post analytics only (Facebook, Instagram, Twitter)",
      "Basic metrics and insights",
      "30-day data history",
      "Standard reporting",
      "Email support",
    ],
    limitations: [
      "No Amazon platform support",
      "No ads analytics",
      "No AI-powered posting assistant",
      "Limited to post insights",
      "Basic metrics only",
      "No advanced insights",
      "No export capabilities",
    ],
  },
  {
    id: "monthly",
    name: "Premium Monthly",
    price: "$29.99",
    period: "month",
    description: "Full power for growing businesses",
    popular: true,
    stripePriceId:
      env.STRIPE_MONTHLY_PRICE_ID || "price_monthly",
    features: [
      "ALL platforms (Facebook, Instagram, Twitter, Amazon)",
      "Post analytics + Ads analytics",
      "AI-powered posting assistant",
      "Unlimited data history",
      "Advanced insights & trends",
      "Custom reporting",
      "Priority support",
      "Export to CSV/PDF",
      "Competitor analysis",
      "Real-time monitoring",
      "API access",
    ],
  },
  {
    id: "yearly",
    name: "Premium Yearly",
    price: "$299.99",
    period: "year",
    description: "Best value for serious marketers",
    savings: "Save $60/year",
    popular: false,
    stripePriceId:
      env.STRIPE_YEARLY_PRICE_ID || "price_yearly",
    features: [
      "Everything in Monthly",
      "2 months FREE",
      "Enhanced AI posting assistant",
      "Advanced AI insights",
      "White-label reports",
      "Dedicated account manager",
      "Custom integrations",
      "Priority feature requests",
    ],
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const { data: session, status, isLoading } = useSession();
  const { profile, isPremium } = useProfile();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const getCurrentPlanId = () => {
    if (!profile?.plan) return "basic";

    switch (profile.plan) {
      case "FREEMIUM":
        return "basic";
      case "PREMIUM_MONTHLY":
        return "monthly";
      case "PREMIUM_YEARLY":
        return "yearly";
      default:
        return "basic";
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "Please ensure your profile is loaded before upgrading",
        variant: "destructive",
      });
      return;
    }

    if (planId === "basic") {
      // Freemium plan - no payment needed
      router.push("/dashboard");
      return;
    }

    setLoadingPlan(planId);

    try {
      // Create Stripe checkout session
      const response = await axios.post("/api/payments/create-checkout", {
        planId,
        userId: profile.id,
      });
      
      if (response.data.success && response.data.data.url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.data.url;
      } else {
        throw new Error(
          response.data.error || "Failed to create checkout session"
        );
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description:
          error.response?.data?.error ||
          error.message ||
          "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleContinueToApp = () => {
    router.push("/dashboard");
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.authenticated) {
    return null; // Will redirect via useEffect above
  }

  const currentPlan = profile?.plan || "FREEMIUM";
  const currentPlanId = getCurrentPlanId();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-xl opacity-30 bg-blue-200"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="absolute top-3/4 right-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-xl opacity-30 bg-purple-200"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 pt-[4rem]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Unlock the full potential of your social media analytics with our
              premium features
            </p>

            {currentPlan === "FREEMIUM" && (
              <motion.div
                variants={itemVariants}
                className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto"
              >
                <p className="text-blue-800 font-medium flex items-center justify-center">
                  <Sparkles className="h-4 w-4 mr-2" />
                  You're currently on the Freemium plan
                </p>
              </motion.div>
            )}

            {currentPlan !== "FREEMIUM" && (
              <motion.div
                variants={itemVariants}
                className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto"
              >
                <p className="text-yellow-800 font-medium flex items-center justify-center">
                  <Crown className="h-4 w-4 mr-2" />
                  You're on a Premium plan
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Pricing Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
          >
            {plans.map((plan, index) => {
              const isCurrentPlan = plan.id === currentPlanId;

              return (
                <Card
                  key={plan.name}
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                    plan.popular
                      ? "ring-2 ring-blue-500 shadow-lg scale-105"
                      : "hover:shadow-lg"
                  } ${isCurrentPlan ? "bg-blue-50 border-blue-200" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                  )}

                  <CardHeader className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      {plan.popular && (
                        <Badge className="ml-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                          Popular
                        </Badge>
                      )}
                      {isCurrentPlan && (
                        <Badge className="ml-2 bg-blue-500 text-white">
                          Current
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-baseline justify-center">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-gray-500 ml-1">/{plan.period}</span>
                    </div>

                    <div>
                      {plan.savings && (
                        <Badge variant="secondary" className="mt-2 w-auto">
                          {plan.savings}
                        </Badge>
                      )}
                    </div>

                    <CardDescription className="mt-2">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, featureIndex) => {
                        const isAIFeature =
                          feature.toLowerCase().includes("ai") ||
                          feature.toLowerCase().includes("posting assistant");
                        return (
                          <li key={featureIndex} className="flex items-start">
                            {isAIFeature ? (
                              <div className="flex items-center">
                                <Bot className="h-5 w-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                                <Sparkles className="h-3 w-3 text-amber-400 -ml-2 -mt-1" />
                              </div>
                            ) : (
                              <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                            )}
                            <span
                              className={`text-sm ${isAIFeature ? "font-medium text-purple-700" : ""}`}
                            >
                              {feature}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    {plan.limitations && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs text-red-600 font-medium mb-2">
                          Limitations:
                        </p>
                        <ul className="space-y-2">
                          {plan.limitations.map((limitation, limitIndex) => {
                            const isAILimitation =
                              limitation.toLowerCase().includes("ai") ||
                              limitation
                                .toLowerCase()
                                .includes("posting assistant");
                            return (
                              <li
                                key={limitIndex}
                                className="flex items-start text-red-500"
                              >
                                {isAILimitation ? (
                                  <div className="flex items-center">
                                    <Bot className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0 text-red-400" />
                                    <X className="h-2 w-2 text-red-500 -ml-1 -mt-1" />
                                  </div>
                                ) : (
                                  <X className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                                )}
                                <span
                                  className={`text-xs ${isAILimitation ? "font-medium" : ""}`}
                                >
                                  {limitation}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="pt-4">
                      {isCurrentPlan ? (
                        <Button
                          onClick={() => router.push("/dashboard")}
                          className="w-full"
                          variant="outline"
                        >
                          Go to Dashboard
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={loadingPlan === plan.id}
                          className={`w-full ${
                            plan.popular
                              ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                              : ""
                          }`}
                        >
                          {loadingPlan === plan.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : plan.id === "basic" ? (
                            "Select Free Plan"
                          ) : (
                            `Upgrade to ${plan.name}`
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>

          {/* Features Comparison */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  Why Upgrade to Premium?
                </CardTitle>
                <CardDescription>
                  Unlock advanced features to supercharge your social media
                  strategy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-2">
                      Multi-Platform Analytics
                    </h3>
                    <p className="text-sm text-gray-600">
                      Connect and analyze Facebook, Instagram, and Twitter all
                      in one place
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Star className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-2">Advanced Insights</h3>
                    <p className="text-sm text-gray-600">
                      Get deep analytics, trend analysis, and actionable
                      recommendations
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-2">Priority Support</h3>
                    <p className="text-sm text-gray-600">
                      Get fast, personalized support when you need it most
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA Section */}
          <motion.div variants={itemVariants} className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Questions about our plans? Contact our support team
            </p>
            <Button variant="outline" onClick={() => router.push("/profile")}>
              Contact Support
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
