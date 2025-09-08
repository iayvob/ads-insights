"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, Eye, Heart, BarChart3, Activity } from "lucide-react"
import { MetricCard } from "./metric-card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { motion } from "framer-motion"

interface OverviewMetricsProps {
  data: {
    overview: {
      totalReach: number
      totalEngagement: number
      totalFollowers: number
      engagementRate: number
      totalImpressions: number
      totalPosts: number
    }
    facebook?: any
    instagram?: any
    twitter?: any
    connectedPlatforms: string[]
  }
}

export function OverviewMetrics({ data }: OverviewMetricsProps) {
  const { overview } = data

  // Platform comparison data
  const platformData = data.connectedPlatforms.map((platform) => {
    const platformInfo = data[platform as keyof typeof data]
    let followers = 0
    let engagement = 0

    if (platformInfo && typeof platformInfo === "object" && !Array.isArray(platformInfo)) {
      switch (platform) {
        case "facebook":
          followers = platformInfo.pageData?.fan_count || 0
          engagement = platformInfo.insights?.engagement || 0
          break
        case "instagram":
          followers = platformInfo.profile?.followers_count || 0
          engagement =
            platformInfo.media?.reduce(
              (sum: number, item: any) => sum + (item.like_count || 0) + (item.comments_count || 0),
              0,
            ) || 0
          break
        case "twitter":
          followers = platformInfo.profile?.followers_count || 0
          engagement = platformInfo.analytics?.engagements || 0
          break
      }
    }

    return {
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      followers,
      engagement,
    }
  })

  // Mock trend data for demonstration
  const engagementTrend = [
    { date: "Mon", engagement: Math.floor(overview.totalEngagement * 0.8) },
    { date: "Tue", engagement: Math.floor(overview.totalEngagement * 0.9) },
    { date: "Wed", engagement: Math.floor(overview.totalEngagement * 0.85) },
    { date: "Thu", engagement: Math.floor(overview.totalEngagement * 1.1) },
    { date: "Fri", engagement: Math.floor(overview.totalEngagement * 1.2) },
    { date: "Sat", engagement: Math.floor(overview.totalEngagement * 1.15) },
    { date: "Sun", engagement: overview.totalEngagement },
  ]

  const audienceData = [
    { name: "18-24", value: 25, color: "#3b82f6" },
    { name: "25-34", value: 35, color: "#8b5cf6" },
    { name: "35-44", value: 25, color: "#06b6d4" },
    { name: "45+", value: 15, color: "#10b981" },
  ]

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid gap-6 md:grid-cols-4"
      >
        <MetricCard
          title="Total Reach"
          value={overview.totalReach.toLocaleString()}
          icon={Eye}
          trend={8}
          description="Across all platforms"
        />
        <MetricCard
          title="Total Engagement"
          value={overview.totalEngagement.toLocaleString()}
          icon={Heart}
          trend={12}
          description="Likes, comments, shares"
        />
        <MetricCard
          title="Total Followers"
          value={overview.totalFollowers.toLocaleString()}
          icon={Users}
          trend={5}
          description="Combined followers"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${overview.engagementRate.toFixed(1)}%`}
          icon={TrendingUp}
          trend={overview.engagementRate > 3 ? 2 : -1}
          description="Average across platforms"
        />
      </motion.div>

      {/* Additional Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-6 md:grid-cols-2"
      >
        <MetricCard
          title="Total Impressions"
          value={overview.totalImpressions.toLocaleString()}
          icon={Activity}
          trend={15}
          description="Content views"
        />
        <MetricCard
          title="Total Posts"
          value={overview.totalPosts.toLocaleString()}
          icon={BarChart3}
          trend={3}
          description="Published content"
        />
      </motion.div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Platform Comparison */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Platform Comparison</CardTitle>
            <CardDescription>Followers across connected platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                followers: {
                  label: "Followers",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData}>
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="followers" fill="var(--color-followers)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Engagement Trend */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Weekly Engagement Trend</CardTitle>
            <CardDescription>Engagement over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                engagement: {
                  label: "Engagement",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagementTrend}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    stroke="var(--color-engagement)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-engagement)", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Audience Demographics */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Audience Demographics</CardTitle>
            <CardDescription>Age distribution of your audience</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                audience: {
                  label: "Audience",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={audienceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {audienceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Platform Performance Summary */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>Key metrics by platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {platformData.map((platform, index) => (
              <div
                key={platform.platform}
                className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-white to-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="font-medium">{platform.platform}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{platform.followers.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">followers</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
