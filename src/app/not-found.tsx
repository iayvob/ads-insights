"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Home, 
  ArrowLeft, 
  Search, 
  AlertTriangle, 
  Compass,
  BarChart3,
  Settings,
  User
} from "lucide-react"
import { useSession } from "@/hooks/session-context"

export default function NotFound() {
  const router = useRouter()
  const { data: session } = useSession()
  const [countdown, setCountdown] = useState(10)
  const [redirecting, setRedirecting] = useState(false)

  // Auto redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setRedirecting(true)
          // Redirect to dashboard if logged in, otherwise to home
          const redirectUrl = session ? "/dashboard" : "/"
          router.push(redirectUrl)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router, session])

  const handleGoHome = () => {
    setRedirecting(true)
    const redirectUrl = session ? "/dashboard" : "/"
    router.push(redirectUrl)
  }

  const handleGoBack = () => {
    setRedirecting(true)
    router.back()
  }

  const quickLinks = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
      description: "View your analytics and insights",
      requiresAuth: true
    },
    {
      name: "Profile",
      href: "/profile", 
      icon: User,
      description: "Manage your account settings",
      requiresAuth: true
    },
    {
      name: "Posting",
      href: "/posting",
      icon: Settings,
      description: "Create and schedule posts",
      requiresAuth: true
    },
    {
      name: "Home",
      href: "/",
      icon: Home,
      description: "Go back to the homepage",
      requiresAuth: false
    }
  ]

  // Filter links based on authentication status
  const availableLinks = quickLinks.filter(link => 
    !link.requiresAuth || (link.requiresAuth && session)
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto text-center space-y-8"
      >
        {/* Main 404 Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-24 h-24 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mb-4"
            >
              <AlertTriangle className="w-12 h-12 text-white" />
            </motion.div>
            
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              Page Not Found
            </CardTitle>
            
            <CardDescription className="text-lg text-gray-600 mt-2">
              Oops! The page you're looking for doesn't exist or has been moved.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Error Code Display */}
            <div className="text-center">
              <Badge variant="destructive" className="text-lg px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500">
                Error 404
              </Badge>
            </div>

            {/* Auto-redirect notice */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-center space-x-2 text-blue-700">
                <Compass className="w-5 h-5" />
                <span className="font-medium">
                  Auto-redirecting in {countdown} seconds...
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-1 text-center">
                Taking you to {session ? "your dashboard" : "the homepage"}
              </p>
            </motion.div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button 
                onClick={handleGoHome}
                disabled={redirecting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <Home className="w-4 h-4 mr-2" />
                {session ? "Go to Dashboard" : "Go Home"}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleGoBack}
                disabled={redirecting}
                className="border-gray-300 hover:bg-gray-50 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Or try these popular pages:
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableLinks.map((link, index) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-105 border-0 bg-white/60 backdrop-blur-sm"
                  onClick={() => {
                    setRedirecting(true)
                    router.push(link.href)
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                        <link.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-medium text-gray-900">{link.name}</h4>
                        <p className="text-sm text-gray-600">{link.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-gray-500 text-sm"
        >
          <p>
            If you believe this is an error, please{" "}
            <button 
              onClick={() => window.location.href = "mailto:support@adinsights.com"}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              contact support
            </button>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
