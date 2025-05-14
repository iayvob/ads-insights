"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Facebook, Instagram, Twitter } from "lucide-react"
import { Logo } from "@/components/logo"
import { signIn, useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Check for error in URL
  const error = searchParams.get("error")
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "Authentication Error",
        description: "Failed to sign in. Please try again.",
        variant: "destructive",
      })
    }
  }, [error, toast])

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl)
    }
  }, [status, router, callbackUrl])

  const handleSignIn = (provider: string) => {
    signIn(provider, { callbackUrl })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 shadow-lg bg-card/60 backdrop-blur-sm">
          <CardHeader className="space-y-1 flex flex-col items-center pb-6">
            <div className="w-20 h-20 mb-4 relative">
              <Logo size="lg" showText={false} />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Welcome to Ads Insights</CardTitle>
            <CardDescription className="text-center max-w-xs mx-auto">
              Connect your social media accounts to view and analyze your advertising performance
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <Button
                className="w-full bg-[#1877F2] hover:bg-[#0E65D9] text-white flex items-center justify-center h-11"
                onClick={() => handleSignIn("facebook")}
              >
                <Facebook className="mr-2 h-5 w-5" />
                Continue with Facebook
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Button
                className="w-full bg-gradient-to-r from-[#833AB4] via-[#C13584] to-[#E1306C] hover:opacity-90 text-white flex items-center justify-center h-11"
                onClick={() => handleSignIn("instagram")}
              >
                <Instagram className="mr-2 h-5 w-5" />
                Continue with Instagram
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Button
                className="w-full bg-[#1DA1F2] hover:bg-[#0C85D0] text-white flex items-center justify-center h-11"
                onClick={() => handleSignIn("twitter")}
              >
                <Twitter className="mr-2 h-5 w-5" />
                Continue with X (Twitter)
              </Button>
            </motion.div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2 pb-6 opacity-80">
            <div className="text-sm text-muted-foreground text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
