"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { BarChart, LineChart } from "@/components/ui/charts"
import { Skeleton } from "@/components/ui/skeleton"

interface InsightsData {
  impressions: number[]
  clicks: number[]
  ctr: number[]
  spend: number[]
  dates: string[]
  loading: boolean
}

export function PlatformInsights({ platform }: { platform: string }) {
  const [data, setData] = useState<InsightsData>({
    impressions: [],
    clicks: [],
    ctr: [],
    spend: [],
    dates: [],
    loading: true,
  })

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await fetch(`/api/insights/${platform}`)
        const data = await response.json()
        setData({
          ...data,
          loading: false,
        })
      } catch (error) {
        console.error("Error fetching insights:", error)
        setData((prev) => ({ ...prev, loading: false }))
      }
    }

    fetchInsights()
  }, [platform])

  if (data.loading) {
    return <InsightsSkeleton />
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Impressions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.impressions.length > 0 ? data.impressions[data.impressions.length - 1].toLocaleString() : "0"}
          </div>
          <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          <div className="h-[80px]">
            <LineChart data={data.impressions} labels={data.dates} color="blue" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clicks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.clicks.length > 0 ? data.clicks[data.clicks.length - 1].toLocaleString() : "0"}
          </div>
          <p className="text-xs text-muted-foreground">+10.5% from last month</p>
          <div className="h-[80px]">
            <LineChart data={data.clicks} labels={data.dates} color="green" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CTR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.ctr.length > 0 ? `${data.ctr[data.ctr.length - 1].toFixed(2)}%` : "0%"}
          </div>
          <p className="text-xs text-muted-foreground">+2.5% from last month</p>
          <div className="h-[80px]">
            <LineChart data={data.ctr} labels={data.dates} color="purple" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ad Spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.spend.length > 0 ? `$${data.spend[data.spend.length - 1].toFixed(2)}` : "$0.00"}
          </div>
          <p className="text-xs text-muted-foreground">+12.3% from last month</p>
          <div className="h-[80px]">
            <LineChart data={data.spend} labels={data.dates} color="orange" />
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>
            Detailed metrics for your {platform.charAt(0).toUpperCase() + platform.slice(1)} ads
          </CardDescription>
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
              <BarChart data={data.impressions} labels={data.dates} color="blue" title="Impressions Over Time" />
            </TabsContent>
            <TabsContent value="clicks" className="h-[300px]">
              <BarChart data={data.clicks} labels={data.dates} color="green" title="Clicks Over Time" />
            </TabsContent>
            <TabsContent value="ctr" className="h-[300px]">
              <BarChart data={data.ctr} labels={data.dates} color="purple" title="CTR Over Time (%)" />
            </TabsContent>
            <TabsContent value="spend" className="h-[300px]">
              <BarChart data={data.spend} labels={data.dates} color="orange" title="Ad Spend Over Time ($)" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-[100px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-[60px] mb-2" />
            <Skeleton className="h-3 w-[120px] mb-4" />
            <Skeleton className="h-[80px] w-full" />
          </CardContent>
        </Card>
      ))}
      <Card className="col-span-4">
        <CardHeader>
          <Skeleton className="h-6 w-[200px] mb-2" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
