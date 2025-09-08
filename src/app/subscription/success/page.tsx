"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Crown, Loader2, AlertCircle } from "lucide-react";
import { useSession } from "@/hooks/session-context";
import { updateSessionAfterPayment } from "@/lib/session-utils";
import axios from "axios";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
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

function SubscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [redirectTimer, setRedirectTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    
    if (!sessionId) {
      setError("No payment session found");
      setLoading(false);
      return;
    }

    // Prevent multiple verification attempts
    if (verificationComplete) {
      return;
    }

    // Check if we already verified this session (stored in sessionStorage)
    const verifiedSessions = JSON.parse(sessionStorage.getItem('verifiedSessions') || '[]');
    if (verifiedSessions.includes(sessionId)) {
      setVerificationComplete(true);
      setLoading(false);
      setPaymentDetails({ planName: "Premium", amount: "Verified", interval: "Active" });
      
      // Redirect after 2 seconds
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      setRedirectTimer(timer as NodeJS.Timeout);
      return;
    }

    const verifyPayment = async () => {
      try {
        console.log('Starting payment verification for session:', sessionId);
        
        // Verify the payment with your backend
        const response = await axios.post("/api/payments/verify-payment", {
          sessionId,
        });

        if (response.data.success) {
          setPaymentDetails(response.data.payment);
          setVerificationComplete(true);
          
          // Store this session as verified
          const verifiedSessions = JSON.parse(sessionStorage.getItem('verifiedSessions') || '[]');
          verifiedSessions.push(sessionId);
          sessionStorage.setItem('verifiedSessions', JSON.stringify(verifiedSessions));
          
          // Update user's plan in session cookies
          try {
            const updateResult = await updateSessionAfterPayment(response.data.payment?.planId || 'monthly');
            
            if (updateResult.success) {
              console.log('Session updated with new plan:', updateResult.plan);
            } else {
              console.warn('Failed to update session:', updateResult.error);
            }
          } catch (sessionError) {
            console.error('Error updating session:', sessionError);
            // Don't fail the entire process if session update fails
          }
          
          // After verification, redirect to dashboard after a short delay
          const timer = setTimeout(() => {
            router.push("/dashboard");
          }, 3000);
          setRedirectTimer(timer as NodeJS.Timeout);
        } else {
          setError(response.data.error || "Payment verification failed");
        }
      } catch (error: any) {
        console.error("Payment verification error:", error);
        setError("Failed to verify payment");
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, verificationComplete, router]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [redirectTimer]);

  const handleContinue = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-800">Payment Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/subscription")} variant="outline">
              Back to Subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 relative overflow-hidden">
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
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-xl opacity-30 bg-green-200"
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
          className="absolute top-3/4 right-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-xl opacity-30 bg-blue-200"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 pt-[8rem]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-2xl mx-auto text-center"
        >
          {/* Success Icon */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          </motion.div>

          {/* Success Message */}
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
              Payment Successful!
            </h1>
            <p className="text-xl text-gray-600">
              Welcome to AdInsights Premium! Your subscription is now active.
            </p>
          </motion.div>

          {/* Payment Details */}
          {paymentDetails && (
            <motion.div variants={itemVariants} className="mb-8">
              <Card className="bg-white/70 backdrop-blur-sm border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center text-green-800">
                    <Crown className="h-5 w-5 mr-2" />
                    Subscription Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-600">Plan</p>
                      <p className="text-green-800">{paymentDetails.planName}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Amount</p>
                      <p className="text-green-800">{paymentDetails.amount}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Billing</p>
                      <p className="text-green-800">{paymentDetails.interval}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Status</p>
                      <p className="text-green-800">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Premium Features Alert */}
          <motion.div variants={itemVariants} className="mb-8">
            <Alert className="border-yellow-200 bg-yellow-50">
              <Crown className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>You now have access to:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• All social media platforms (including Amazon)</li>
                  <li>• Post analytics + Ads analytics</li>
                  <li>• Advanced insights and reporting</li>
                  <li>• Unlimited data history</li>
                  <li>• Priority support</li>
                </ul>
              </AlertDescription>
            </Alert>
          </motion.div>

          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="space-y-4">
            <Button
              onClick={handleContinue}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8"
            >
              Start Using Premium Features
            </Button>
            
            <div className="space-x-4">
              <Button
                onClick={() => router.push("/profile?tab=subscription")}
                variant="outline"
                size="sm"
              >
                Manage Subscription
              </Button>
              <Button
                onClick={() => router.push("/profile?tab=connections")}
                variant="outline"
                size="sm"
              >
                Connect More Platforms
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function SubscriptionSuccessLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading payment confirmation...</p>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<SubscriptionSuccessLoading />}>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
