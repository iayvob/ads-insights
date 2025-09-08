"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MetricCard } from "./metric-card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import { Users, Eye, Heart, Camera, ExternalLink, AlertTriangle, TrendingUp, MessageCircle } from "lucide-react"
import { motion } from "framer-motion"
import { InstagramAnalytics } from "@/validations/analytics-types"

interface InstagramInsightsProps {
  data?: InstagramAnalytics
  error?: {
    type: 'no_business_account' | 'connection_failed' | 'api_error' | 'token_expired'
    message: string
    details?: any
  }
  canAccessAds?: boolean;
}

// Instagram Business Account Connection Component
function InstagramConnectionPrompt({ error }: { error: InstagramInsightsProps['error'] }) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <CardTitle className="text-amber-800">Instagram Business Account Required</CardTitle>
        <CardDescription className="text-amber-600">
          {error?.message || "To view Instagram insights, you need to connect an Instagram Business account."}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="space-y-2 text-sm text-gray-600">
          <p>To get started:</p>
          <ol className="text-left space-y-1 max-w-md mx-auto">
            <li>1. Convert your Instagram account to a Business account</li>
            <li>2. Connect it to a Facebook page</li>
            <li>3. Re-authenticate with our app</li>
          </ol>
        </div>
        <div className="flex gap-3 justify-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('https://help.instagram.com/502981923235522', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Instagram Help
          </Button>
          <Button 
            size="sm"
            onClick={() => window.location.href = '/profile'}
          >
            Reconnect Account
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function InstagramInsights({ canAccessAds, data, error }: InstagramInsightsProps) {
  // Show connection prompt if there's a business account error
  if (error?.type === 'no_business_account' || (!data && error)) {
    return <InstagramConnectionPrompt error={error} />
  }

  if (!data) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <div className="text-gray-500">No Instagram data available</div>
        </CardContent>
      </Card>
    )
  }

  const { posts, ads, profile, lastUpdated } = data

  // Calculate engagement rate
  const engagementRate = profile?.followers_count ? 
    Math.round((posts.avgEngagement / profile.followers_count) * 100 * 100) / 100 : 0

  // Prepare content performance data for chart
  const contentPerformanceData = posts.contentPerformance.map(item => ({
    name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
    count: item.count,
    avgEngagement: item.avgEngagement,
    color: getContentTypeColor(item.type)
  }))

  // Prepare engagement trend data for chart
  const engagementTrendData = posts.engagementTrend.slice(-7).map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    engagement: item.engagement,
    reach: item.reach,
    impressions: item.impressions
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Data Source Indicator */}
      <div className="text-sm text-gray-500 mb-4">
        Instagram Business Account • Updated: {new Date(lastUpdated).toLocaleString()}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        <MetricCard
          title="Followers"
          value={profile?.followers_count?.toLocaleString() || '0'}
          icon={Users}
          trend={5}
          description="Total followers"
        />
        <MetricCard
          title="Avg. Engagement"
          value={Math.round(posts.avgEngagement).toLocaleString()}
          icon={Heart}
          trend={posts.avgEngagement > 0 ? 8 : 0}
          description="Per post"
        />
        <MetricCard
          title="Avg. Reach"
          value={Math.round(posts.avgReach).toLocaleString()}
          icon={Eye}
          trend={posts.avgReach > 0 ? 12 : 0}
          description="Per post"
        />
        <MetricCard
          title="Total Posts"
          value={posts.totalPosts.toLocaleString()}
          icon={Camera}
          trend={3}
          description="Published content"
        />
      </div>

      {/* Additional Metrics Row */}
      <div className="grid gap-6 md:grid-cols-4">
        <MetricCard
          title="Engagement Rate"
          value={`${engagementRate}%`}
          icon={TrendingUp}
          trend={engagementRate > 2 ? 10 : 0}
          description="Followers engaged"
        />
        <MetricCard
          title="Avg. Impressions"
          value={Math.round(posts.avgImpressions).toLocaleString()}
          icon={Eye}
          trend={posts.avgImpressions > 0 ? 7 : 0}
          description="Per post"
        />
        <MetricCard
          title="Media Count"
          value={profile?.media_count?.toLocaleString() || '0'}
          icon={Camera}
          trend={2}
          description="Total uploads"
        />
        {posts.topPost && (
          <MetricCard
            title="Top Post"
            value={Math.round(posts.topPost.engagement).toLocaleString()}
            icon={Heart}
            trend={15}
            description="Best engagement"
          />
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Content Performance */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Content Performance</CardTitle>
            <CardDescription>Engagement by content type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                engagement: {
                  label: "Avg Engagement",
                  color: "#e91e63"
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contentPerformanceData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgEngagement" fill="#e91e63" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Engagement Trend */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Engagement Trend</CardTitle>
            <CardDescription>Last 7 days performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                engagement: {
                  label: "Engagement",
                  color: "#e91e63"
                },
                reach: {
                  label: "Reach", 
                  color: "#9c27b0"
                }
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagementTrendData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="#e91e63" 
                    strokeWidth={2}
                    dot={{ fill: "#e91e63", strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="reach" 
                    stroke="#9c27b0" 
                    strokeWidth={2}
                    dot={{ fill: "#9c27b0", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Post Performance */}
      {posts.topPost && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Top Performing Post</CardTitle>
            <CardDescription>Your best post from recent activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
              <div className="flex-1 space-y-2">
                <p className="font-medium text-gray-900 line-clamp-3">
                  {posts.topPost.content || `${posts.topPost.mediaType || 'Post'} content`}
                </p>
                <p className="text-sm text-gray-500">
                  Posted on {new Date(posts.topPost.date).toLocaleDateString()}
                </p>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1 text-pink-600">
                    <Heart className="w-4 h-4" />
                    {Math.round(posts.topPost.engagement).toLocaleString()} engagements
                  </span>
                  <span className="flex items-center gap-1 text-blue-600">
                    <Eye className="w-4 h-4" />
                    {Math.round(posts.topPost.reach).toLocaleString()} reach
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    {Math.round(posts.topPost.impressions).toLocaleString()} impressions
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ads Analytics - Premium Feature */}
      {canAccessAds && ads && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Ads Performance
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                Premium
              </Badge>
            </CardTitle>
            <CardDescription>Your Instagram advertising metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">${ads.totalSpend.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Spend</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{ads.totalClicks.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Clicks</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">${ads.cpc.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Cost Per Click</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{ads.ctr.toFixed(2)}%</div>
                <div className="text-sm text-gray-600">Click-Through Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

// Helper function to get colors for content types
function getContentTypeColor(type: string): string {
  const colors = {
    image: "#e91e63",
    video: "#9c27b0", 
    carousel: "#673ab7",
    text: "#3f51b5"
  }
  return colors[type as keyof typeof colors] || "#6b7280"
}
