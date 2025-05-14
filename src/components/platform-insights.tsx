"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { BarChart } from "@/components/charts/bar-chart"
import { LineChart } from "@/components/charts/line-chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils"
import type { InsightsData } from "@/types/ads"
import { ArrowUpRight, TrendingUp, MousePointerClick, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchWithErrorHandling } from "@/lib/api-utils"
import { useToast } from "@/components/ui/use-toast"

export function PlatformInsights({ platform }: { platform: string }) {
  const { toast } = useToast()
  const [data, setData] = useState<InsightsData & { loading: boolean }>({
    impressions: [],
    clicks: [],
    ctr: [],
    spend: [],
    dates: [],
    loading: true,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true }))
        setError(null)

        const response = await fetchWithErrorHandling<{ data?: InsightsData; error?: string }>(
          `/api/insights/${platform}`,
        )

        if (response.error) {
          throw new Error(response.error)
        }

        if (!response.data) {
          throw new Error("No data received from API")
        }

        setData({
          ...response.data,
          loading: false,
        })
      } catch (error) {
        console.error("Error fetching insights:", error)
        setError(error instanceof Error ? error.message : "Failed to load insights data")
        setData((prev) => ({ ...prev, loading: false }))

        toast({
          title: "Error",
          description: "Failed to load platform insights. Please try again later.",
          variant: "destructive",
        })
      }
    }

    fetchInsights()
  }, [platform, toast])

  if (data.loading) {
    return <InsightsSkeleton />
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="mb-4 text-red-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto h-12 w-12"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-lg font-medium">Failed to load insights</h3>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Retry
        </button>
      </div>
    )
  }

  const platformColors = {
    facebook: "#1877F2",
    instagram: "#C13584",
    twitter: "#1DA1F2",
  }

  const currentColor = platformColors[platform as keyof typeof platformColors] || "#3b82f6"

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Impressions"
          value={data.impressions.length > 0 ? formatNumber(data.impressions[data.impressions.length - 1]) : "0"}
          change="+20.1%"
          icon={<TrendingUp className="h-4 w-4" />}
          chartData={data.impressions}
          chartLabels={data.dates}
          chartColor={currentColor}
        />

        <StatsCard
          title="Clicks"
          value={data.clicks.length > 0 ? formatNumber(data.clicks[data.clicks.length - 1]) : "0"}
          change="+10.5%"
          icon={<MousePointerClick className="h-4 w-4" />}
          chartData={data.clicks}
          chartLabels={data.dates}
          chartColor={currentColor}
        />

        <StatsCard
          title="CTR"
          value={data.ctr.length > 0 ? formatPercentage(data.ctr[data.ctr.length - 1]) : "0%"}
          change="+2.5%"
          icon={<ArrowUpRight className="h-4 w-4" />}
          chartData={data.ctr}
          chartLabels={data.dates}
          chartColor={currentColor}
        />

        <StatsCard
          title="Ad Spend"
          value={data.spend.length > 0 ? formatCurrency(data.spend[data.spend.length - 1]) : "$0.00"}
          change="+12.3%"
          icon={<DollarSign className="h-4 w-4" />}
          chartData={data.spend}
          chartLabels={data.dates}
          chartColor={currentColor}
        />
      </div>

      <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h3 className="text-lg font-medium">Performance Overview</h3>
          <p className="text-sm text-muted-foreground">
            Detailed metrics for your {platform.charAt(0).toUpperCase() + platform.slice(1)} ads
          </p>
        </div>

        <div className="p-6">
          <Tabs defaultValue="impressions">
            <TabsList className="mb-4 bg-muted/30">
              <TabsTrigger value="impressions">Impressions</TabsTrigger>
              <TabsTrigger value="clicks">Clicks</TabsTrigger>
              <TabsTrigger value="ctr">CTR</TabsTrigger>
              <TabsTrigger value="spend">Spend</TabsTrigger>
            </TabsList>
            <TabsContent value="impressions" className="h-[350px] mt-0">
              <BarChart
                data={data.impressions}
                labels={data.dates}
                color={currentColor}
                title="Impressions Over Time"
              />
            </TabsContent>
            <TabsContent value="clicks" className="h-[350px] mt-0">
              <BarChart data={data.clicks} labels={data.dates} color={currentColor} title="Clicks Over Time" />
            </TabsContent>
            <TabsContent value="ctr" className="h-[350px] mt-0">
              <BarChart data={data.ctr} labels={data.dates} color={currentColor} title="CTR Over Time (%)" />
            </TabsContent>
            <TabsContent value="spend" className="h-[350px] mt-0">
              <BarChart data={data.spend} labels={data.dates} color={currentColor} title="Ad Spend Over Time ($)" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// StatsCard and InsightsSkeleton components remain the same
interface StatsCardProps {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  chartData: number[]
  chartLabels: string[]
  chartColor: string
}

function StatsCard({ title, value, change, icon, chartData, chartLabels, chartColor }: StatsCardProps) {
  const isPositive = change.startsWith("+")

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className={cn("flex h-7 w-7 items-center justify-center rounded-full", `bg-${chartColor}/10`)}
          style={{ backgroundColor: `${chartColor}20` }}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={cn("text-xs", isPositive ? "text-green-500" : "text-red-500")}>{change} from last month</p>
        <div className="h-[80px] mt-2">
          <LineChart data={chartData} labels={chartLabels} color={chartColor} />
        </div>
      </CardContent>
    </Card>
  )
}

function InsightsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-2" />
              <Skeleton className="h-3 w-[120px] mb-4" />
              <Skeleton className="h-[80px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <Skeleton className="h-6 w-[200px] mb-2" />
          <Skeleton className="h-4 w-[300px]" />
        </div>

        <div className="p-6">
          <Skeleton className="h-10 w-[300px] mb-4 rounded-md" />
          <Skeleton className="h-[350px] w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}
