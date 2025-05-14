"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { BarChart, PieChart } from "@/components/ui/charts"
import { Skeleton } from "@/components/ui/skeleton"

interface OverviewData {
  platforms: {
    facebook: {
      impressions: number
      clicks: number
      ctr: number
      spend: number
    }
    instagram: {
      impressions: number
      clicks: number
      ctr: number
      spend: number
    }
    twitter: {
      impressions: number
      clicks: number
      ctr: number
      spend: number
    }
  }
  totalImpressions: number
  totalClicks: number
  totalSpend: number
  averageCtr: number
  loading: boolean
}

export function OverviewMetrics() {
  const [data, setData] = useState<OverviewData>({
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

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await fetch("/api/insights/overview")
        const data = await response.json()
        setData({
          ...data,
          loading: false,
        })
      } catch (error) {
        console.error("Error fetching overview:", error)
        setData((prev) => ({ ...prev, loading: false }))
      }
    }

    fetchOverview()
  }, [])

  if (data.loading) {
    return <OverviewSkeleton />
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

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+15.8% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12.3% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageCtr.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">+1.5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ad Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalSpend.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">+8.2% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Platform Comparison</CardTitle>
            <CardDescription>Compare performance metrics across all connected platforms</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Tabs defaultValue="impressions">
              <TabsList>
                <TabsTrigger value="impressions">Impressions</TabsTrigger>
                <TabsTrigger value="clicks">Clicks</TabsTrigger>
                <TabsTrigger value="ctr">CTR</TabsTrigger>
                <TabsTrigger value="spend">Spend</TabsTrigger>
              </TabsList>
              <TabsContent value="impressions" className="h-[300px]">
                <BarChart
                  data={platformData.impressions}
                  labels={platformLabels}
                  color="blue"
                  title="Impressions by Platform"
                />
              </TabsContent>
              <TabsContent value="clicks" className="h-[300px]">
                <BarChart data={platformData.clicks} labels={platformLabels} color="green" title="Clicks by Platform" />
              </TabsContent>
              <TabsContent value="ctr" className="h-[300px]">
                <BarChart data={platformData.ctr} labels={platformLabels} color="purple" title="CTR by Platform (%)" />
              </TabsContent>
              <TabsContent value="spend" className="h-[300px]">
                <BarChart
                  data={platformData.spend}
                  labels={platformLabels}
                  color="orange"
                  title="Ad Spend by Platform ($)"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Budget Distribution</CardTitle>
            <CardDescription>How your ad spend is distributed across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <PieChart data={platformData.spend} labels={platformLabels} colors={["#1877F2", "#C13584", "#1DA1F2"]} />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function OverviewSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[120px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[80px] mb-2" />
              <Skeleton className="h-3 w-[140px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <Skeleton className="h-6 w-[180px] mb-2" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <Skeleton className="h-6 w-[180px] mb-2" />
            <Skeleton className="h-4 w-[250px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
