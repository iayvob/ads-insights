"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { BarChart } from "@/components/charts/bar-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils"
import type { OverviewData } from "@/types/ads"
import { ArrowUpRight, TrendingUp, MousePointerClick, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchWithErrorHandling } from "@/lib/api-utils"
import { useToast } from "@/components/ui/use-toast"

export function OverviewMetrics() {
  const { toast } = useToast()
  const [data, setData] = useState<OverviewData & { loading: boolean }>({
    platforms: {
      facebook: { impressions: 0, clicks: 0, ctr: 0, spend: 0 },
      instagram: { impressions: 0, clicks: 0, ctr: 0, spend: 0 },
      twitter: { impressions: 0, clicks: 0, ctr: 0, spend: 0 },
    },
    totalImpressions: 0,
    totalClicks: 0,
    totalSpend: 0,
    averageCtr: 0,
    loading: true,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true }))
        setError(null)

        const response = await fetchWithErrorHandling<{ data?: OverviewData; error?: string }>("/api/insights/overview")

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
        console.error("Error fetching overview:", error)
        setError(error instanceof Error ? error.message : "Failed to load overview data")
        setData((prev) => ({ ...prev, loading: false }))

        toast({
          title: "Error",
          description: "Failed to load overview data. Please try again later.",
          variant: "destructive",
        })
      }
    }

    fetchOverview()
  }, [toast])

  if (data.loading) {
    return <OverviewSkeleton />
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
        <h3 className="text-lg font-medium">Failed to load overview</h3>
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

  const platformData = {
    impressions: [
      data.platforms.facebook.impressions,
      data.platforms.instagram.impressions,
      data.platforms.twitter.impressions,
    ],
    clicks: [data.platforms.facebook.clicks, data.platforms.instagram.clicks, data.platforms.twitter.clicks],
    ctr: [data.platforms.facebook.ctr, data.platforms.instagram.ctr, data.platforms.twitter.ctr],
    spend: [data.platforms.facebook.spend, data.platforms.instagram.spend, data.platforms.twitter.spend],
  }

  const platformLabels = ["Facebook", "Instagram", "X (Twitter)"]
  const platformColors = ["#1877F2", "#C13584", "#1DA1F2"]

  return (
    <div className="p-6 space-y-6">
      {/* Rest of the component remains the same */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Impressions"
          value={formatNumber(data.totalImpressions)}
          change="+15.8%"
          icon={<TrendingUp className="h-4 w-4" />}
          color="#3b82f6"
        />

        <StatsCard
          title="Total Clicks"
          value={formatNumber(data.totalClicks)}
          change="+12.3%"
          icon={<MousePointerClick className="h-4 w-4" />}
          color="#22c55e"
        />

        <StatsCard
          title="Average CTR"
          value={formatPercentage(data.averageCtr)}
          change="+1.5%"
          icon={<ArrowUpRight className="h-4 w-4" />}
          color="#a855f7"
        />

        <StatsCard
          title="Total Ad Spend"
          value={formatCurrency(data.totalSpend)}
          change="+8.2%"
          icon={<DollarSign className="h-4 w-4" />}
          color="#f97316"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Platform Comparison</CardTitle>
            <CardDescription>Compare performance metrics across all connected platforms</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Tabs defaultValue="impressions">
              <TabsList className="mb-4 bg-muted/30">
                <TabsTrigger value="impressions">Impressions</TabsTrigger>
                <TabsTrigger value="clicks">Clicks</TabsTrigger>
                <TabsTrigger value="ctr">CTR</TabsTrigger>
                <TabsTrigger value="spend">Spend</TabsTrigger>
              </TabsList>
              <TabsContent value="impressions" className="h-[300px] mt-0">
                <BarChart
                  data={platformData.impressions}
                  labels={platformLabels}
                  color="#3b82f6"
                  title="Impressions by Platform"
                />
              </TabsContent>
              <TabsContent value="clicks" className="h-[300px] mt-0">
                <BarChart
                  data={platformData.clicks}
                  labels={platformLabels}
                  color="#22c55e"
                  title="Clicks by Platform"
                />
              </TabsContent>
              <TabsContent value="ctr" className="h-[300px] mt-0">
                <BarChart data={platformData.ctr} labels={platformLabels} color="#a855f7" title="CTR by Platform (%)" />
              </TabsContent>
              <TabsContent value="spend" className="h-[300px] mt-0">
                <BarChart
                  data={platformData.spend}
                  labels={platformLabels}
                  color="#f97316"
                  title="Ad Spend by Platform ($)"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Budget Distribution</CardTitle>
            <CardDescription>How your ad spend is distributed across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <PieChart data={platformData.spend} labels={platformLabels} colors={platformColors} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Platform Performance Summary</CardTitle>
          <CardDescription>Quick overview of key metrics across all platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 font-medium">Platform</th>
                  <th className="text-right py-3 px-4 font-medium">Impressions</th>
                  <th className="text-right py-3 px-4 font-medium">Clicks</th>
                  <th className="text-right py-3 px-4 font-medium">CTR</th>
                  <th className="text-right py-3 px-4 font-medium">Spend</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/30">
                  <td className="py-3 px-4 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#1877F2]"></div>
                    Facebook
                  </td>
                  <td className="text-right py-3 px-4">{formatNumber(data.platforms.facebook.impressions)}</td>
                  <td className="text-right py-3 px-4">{formatNumber(data.platforms.facebook.clicks)}</td>
                  <td className="text-right py-3 px-4">{formatPercentage(data.platforms.facebook.ctr)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(data.platforms.facebook.spend)}</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 px-4 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#C13584]"></div>
                    Instagram
                  </td>
                  <td className="text-right py-3 px-4">{formatNumber(data.platforms.instagram.impressions)}</td>
                  <td className="text-right py-3 px-4">{formatNumber(data.platforms.instagram.clicks)}</td>
                  <td className="text-right py-3 px-4">{formatPercentage(data.platforms.instagram.ctr)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(data.platforms.instagram.spend)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#1DA1F2]"></div>X (Twitter)
                  </td>
                  <td className="text-right py-3 px-4">{formatNumber(data.platforms.twitter.impressions)}</td>
                  <td className="text-right py-3 px-4">{formatNumber(data.platforms.twitter.clicks)}</td>
                  <td className="text-right py-3 px-4">{formatPercentage(data.platforms.twitter.ctr)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(data.platforms.twitter.spend)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t border-border/50 font-medium">
                  <td className="py-3 px-4">Total</td>
                  <td className="text-right py-3 px-4">{formatNumber(data.totalImpressions)}</td>
                  <td className="text-right py-3 px-4">{formatNumber(data.totalClicks)}</td>
                  <td className="text-right py-3 px-4">{formatPercentage(data.averageCtr)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(data.totalSpend)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// StatsCard and OverviewSkeleton components remain the same
interface StatsCardProps {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  color: string
}

function StatsCard({ title, value, change, icon, color }: StatsCardProps) {
  const isPositive = change.startsWith("+")

  return (
    <Card className="border-border/50 shadow-sm hover:shadow transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className={cn("flex h-7 w-7 items-center justify-center rounded-full")}
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={cn("text-xs", isPositive ? "text-green-500" : "text-red-500")}>{change} from last month</p>
      </CardContent>
    </Card>
  )
}

function OverviewSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[80px] mb-2" />
              <Skeleton className="h-3 w-[140px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-[180px] mb-2" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card className="md:col-span-3 border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-[180px] mb-2" />
            <Skeleton className="h-4 w-[250px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-[220px] mb-2" />
          <Skeleton className="h-4 w-[280px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
