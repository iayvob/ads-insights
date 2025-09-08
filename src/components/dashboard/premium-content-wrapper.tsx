"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, Crown, ArrowRight, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "@/hooks/session-context"

interface PremiumContentWrapperProps {
  children: ReactNode
  title: string
  description?: string
  feature: string
  className?: string
  isLocked?: boolean
}

export function PremiumContentWrapper({
  children,
  title,
  description,
  feature,
  className = "",
  isLocked
}: PremiumContentWrapperProps) {
  const router = useRouter()
  const { data: session } = useSession()
  
  // Check if user has premium plan
  const userPlan = session?.user?.plan || "basic"
  const isPremium = userPlan !== "basic"
  
  // Override with manual lock if provided
  const shouldLock = isLocked !== undefined ? isLocked : !isPremium

  if (!shouldLock) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={`relative ${className}`}>
      {/* Blurred Content */}
      <div className="relative">
        <div className="filter blur-sm pointer-events-none select-none">
          {children}
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/80 to-white/60 backdrop-blur-sm" />
        
        {/* Premium Upgrade Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center p-4"
        >
          <Card className="max-w-md w-full bg-white/95 backdrop-blur-sm border-2 border-purple-200 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-4 mx-auto">
                <Crown className="h-8 w-8 text-white" />
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-purple-600" />
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  Premium Feature
                </Badge>
              </div>
              
              <CardTitle className="text-xl font-bold text-gray-900">
                {title}
              </CardTitle>
              
              {description && (
                <p className="text-sm text-gray-600 mt-2">
                  {description}
                </p>
              )}
            </CardHeader>
            
            <CardContent className="text-center space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>Unlock {feature}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    Advanced metrics
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    Detailed insights
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    Trend analysis
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    ROI tracking
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => router.push('/subscription')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
              >
                Upgrade to Premium
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              
              <p className="text-xs text-gray-500">
                Starting at $29/month • Cancel anytime
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
