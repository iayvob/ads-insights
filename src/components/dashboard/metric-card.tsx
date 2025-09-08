"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number
  description?: string
  className?: string
}

export function MetricCard({ title, value, icon: Icon, trend, description, className }: MetricCardProps) {
  const isPositiveTrend = trend && trend > 0
  const isNegativeTrend = trend && trend < 0

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="flex items-center justify-between">
          {description && <p className="text-xs text-gray-500">{description}</p>}
          {trend !== undefined && (
            <Badge
              variant={isPositiveTrend ? "default" : isNegativeTrend ? "destructive" : "secondary"}
              className="text-xs"
            >
              {isPositiveTrend ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : isNegativeTrend ? (
                <TrendingDown className="h-3 w-3 mr-1" />
              ) : null}
              {Math.abs(trend)}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
