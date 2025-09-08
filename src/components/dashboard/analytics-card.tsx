"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, BarChart3, DollarSign } from "lucide-react"
import { PremiumContentWrapper } from "./premium-content-wrapper"

interface MetricItemProps {
  label: string
  value: string | number
  icon: ReactNode
  trend?: number
  format?: 'number' | 'currency' | 'percentage'
  className?: string
}

interface AnalyticsCardProps {
  title: string
  description?: string
  type: 'posts' | 'ads'
  platform: string
  metrics: MetricItemProps[]
  children?: ReactNode
  isLocked?: boolean
  className?: string
}

function MetricItem({ label, value, icon, trend, format = 'number', className = "" }: MetricItemProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(val)
      case 'percentage':
        return `${val.toFixed(1)}%`
      default:
        return new Intl.NumberFormat('en-US').format(val)
    }
  }

  const getTrendIcon = () => {
    if (trend === undefined) return null
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-green-500" />
    if (trend < 0) return <TrendingDown className="h-3 w-3 text-red-500" />
    return <Minus className="h-3 w-3 text-gray-400" />
  }

  const getTrendColor = () => {
    if (trend === undefined) return ''
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-lg font-bold text-gray-900">{formatValue(value)}</p>
        </div>
      </div>
      
      {trend !== undefined && (
        <div className={`flex items-center gap-1 ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="text-xs font-medium">
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}

export function AnalyticsCard({
  title,
  description,
  type,
  platform,
  metrics,
  children,
  isLocked,
  className = ""
}: AnalyticsCardProps) {
  const cardContent = (
    <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              type === 'ads' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            }`}>
              {type === 'ads' ? (
                <DollarSign className="h-5 w-5 text-white" />
              ) : (
                <BarChart3 className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">{title}</CardTitle>
              {description && (
                <CardDescription className="text-sm text-gray-600">{description}</CardDescription>
              )}
            </div>
          </div>
          
          <Badge 
            variant="secondary" 
            className={`capitalize ${
              type === 'ads' 
                ? 'bg-purple-100 text-purple-700 border-purple-200' 
                : 'bg-blue-100 text-blue-700 border-blue-200'
            }`}
          >
            {type} Analytics
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid gap-2">
          {metrics.map((metric, index) => (
            <MetricItem key={index} {...metric} />
          ))}
        </div>
        
        {/* Additional Content */}
        {children && (
          <div className="pt-4 border-t border-gray-100">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Wrap ads analytics in premium content wrapper for free users
  if (type === 'ads') {
    return (
      <PremiumContentWrapper
        title="Ads Analytics"
        description="Get detailed insights into your advertising performance and ROI"
        feature="advanced ads analytics"
        isLocked={isLocked}
        className={className}
      >
        {cardContent}
      </PremiumContentWrapper>
    )
  }

  return cardContent
}

export default AnalyticsCard
