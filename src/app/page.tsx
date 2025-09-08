"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Loader2 } from "lucide-react"
import { SignInForm } from "@/components/authentication/sign-in-form"
import { SignUpForm } from "@/components/authentication/sign-up-form"
import { useSession } from "@/hooks/session-context"

// Component that uses useSearchParams - needs to be wrapped in Suspense
function AuthenticationTabs() {
  const searchParams = useSearchParams()
  
  // Get tab from URL params, default to 'signin'
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<string>(
    tabFromUrl === 'signup' || tabFromUrl === 'signin' ? tabFromUrl : 'signin'
  )

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('tab', value)
    window.history.replaceState({}, '', newUrl.toString())
  }

  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'signup' || tab === 'signin') {
      setActiveTab(tab)
    }
  }, [searchParams])

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-gray-100/50 rounded-lg shadow-sm p-0">
        <TabsTrigger
          value="signin"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:rounded-l-lg"
        >
          Sign In
        </TabsTrigger>
        <TabsTrigger
          value="signup"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:rounded-r-lg"
        >
          Sign Up
        </TabsTrigger>
      </TabsList>

      <TabsContent value="signin" className="mt-6">
        <div className="space-y-2 mb-6">
          <CardTitle className="text-xl text-gray-900">Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </div>
        <SignInForm />
      </TabsContent>

      <TabsContent value="signup" className="mt-6"> 
        <div className="space-y-2 mb-6">
          <CardTitle className="text-xl text-gray-900">Create account</CardTitle>
          <CardDescription>Get started with your free account today</CardDescription>
        </div>
        <SignUpForm />
      </TabsContent>
    </Tabs>
  )
}

export default function Page() {
  const router = useRouter()
  const { data: session, status, isLoading } = useSession()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (status === "loading" || isLoading) return

    if (status === "authenticated" && session?.authenticated) {
      setIsRedirecting(true)
      
      // Check user plan and redirect accordingly
      if (session.user?.plan) {
        const plan = session.user.plan
        
        if (plan === "FREEMIUM") {
          // Redirect freemium users to subscription page
          router.push("/subscription")
        } else if (plan === "PREMIUM_MONTHLY" || plan === "PREMIUM_YEARLY") {
          // Redirect premium users to profile page
          router.push("/profile")
        } else {
          // Default fallback for unknown plans
          router.push("/dashboard")
        }
        return
      } else {
        // If authenticated but no plan info, go to dashboard
        router.push("/dashboard")
        return
      }
    }
  }, [session, status, isLoading, router])

  // Show loading spinner while checking authentication
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Show loading spinner while redirecting authenticated users
  if (isRedirecting || (status === "authenticated" && session?.authenticated)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Redirecting...</span>
        </div>
      </div>
    )
  }

  // Show login form for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Social Media Analytics Hub
          </h1>
          <p className="text-gray-600 mt-2">Connect your accounts and analyse your performance</p>
        </div>

        {/* Auth Tabs */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <Suspense fallback={
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            }>
              <AuthenticationTabs />
            </Suspense>
          </CardHeader>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            By continuing, you agree to our{" "}
            <a href="/terms-of-service" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}