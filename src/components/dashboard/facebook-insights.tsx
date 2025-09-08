"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "./metric-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Eye,
  Heart,
  TrendingUp,
  DollarSign,
  MousePointer,
  Target,
  Lock,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  FacebookData,
  FacebookEnhancedData,
} from "@/services/api-clients/facebook-client";
import { PostAnalytics, AdsAnalytics } from "@/validations/analytics-types";

interface FacebookInsightsProps {
  data?: (FacebookData | FacebookEnhancedData) & {
    dataSource?: string;
    lastUpdated?: string;
    hasAdsAccess?: boolean;
    subscriptionLimited?: boolean;
  };
  canAccessAds?: boolean;
}

export function FacebookInsights({
  data,
  canAccessAds,
}: FacebookInsightsProps) {
  if (!data) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <div className="text-gray-500">No Facebook data available</div>
        </CardContent>
      </Card>
    );
  }

  // Check if this is enhanced data structure or legacy
  const isEnhancedData =
    "posts" in data &&
    typeof data.posts === "object" &&
    "totalPosts" in (data.posts || {});
  const isLegacyData =
    "insights" in data && "posts" in data && Array.isArray(data.posts);

  // Helper function to render premium upgrade prompt
  const renderPremiumPrompt = () => (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-6 text-center">
        <Lock className="mx-auto h-12 w-12 text-blue-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Premium Analytics Available
        </h3>
        <p className="text-gray-600 mb-4">
          Unlock detailed ads analytics, audience insights, and advanced metrics
          with a premium subscription.
        </p>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Upgrade to Premium
        </button>
      </CardContent>
    </Card>
  );

  if (isEnhancedData) {
    const enhancedData = data as FacebookEnhancedData & {
      dataSource?: string;
      lastUpdated?: string;
      hasAdsAccess?: boolean;
      subscriptionLimited?: boolean;
    };
    const { pageData, posts, ads } = enhancedData;
    const postsAnalytics = posts as PostAnalytics;
    const adsAnalytics = ads as AdsAnalytics | null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Data Source Indicator */}
        {enhancedData.dataSource && (
          <div className="text-sm text-gray-500 mb-4">
            Data source:{" "}
            {enhancedData.dataSource === "mock"
              ? "Sample data"
              : "Live Facebook API"}
            {enhancedData.lastUpdated &&
              ` • Updated: ${new Date(enhancedData.lastUpdated).toLocaleString()}`}
            {enhancedData.subscriptionLimited &&
              " • Some features require premium subscription"}
          </div>
        )}

        {/* Page Overview Metrics */}
        <div className="grid gap-6 md:grid-cols-4">
          <MetricCard
            title="Page Likes"
            value={pageData?.fan_count?.toLocaleString() || "0"}
            icon={Users}
            trend={5}
            description="Total page followers"
          />
          <MetricCard
            title="Total Posts"
            value={postsAnalytics?.totalPosts?.toString() || "0"}
            icon={Eye}
            trend={12}
            description="Posts published"
          />
          <MetricCard
            title="Avg Engagement"
            value={Math.round(
              postsAnalytics?.avgEngagement || 0
            ).toLocaleString()}
            icon={Heart}
            trend={8}
            description="Per post average"
          />
          <MetricCard
            title="Avg Reach"
            value={Math.round(postsAnalytics?.avgReach || 0).toLocaleString()}
            icon={TrendingUp}
            trend={15}
            description="Per post average"
          />
        </div>

        {/* Ads Analytics (Premium) */}
        {enhancedData.hasAdsAccess && adsAnalytics && (
          <div className="grid gap-6 md:grid-cols-4">
            <MetricCard
              title="Ad Spend"
              value={`$${adsAnalytics.totalSpend.toFixed(2)}`}
              icon={DollarSign}
              trend={-3}
              description="Total ad spend"
            />
            <MetricCard
              title="Ad Reach"
              value={adsAnalytics.totalReach.toLocaleString()}
              icon={Target}
              trend={18}
              description="People reached"
            />
            <MetricCard
              title="Ad Clicks"
              value={adsAnalytics.totalClicks.toLocaleString()}
              icon={MousePointer}
              trend={22}
              description="Link clicks"
            />
            <MetricCard
              title="CTR"
              value={`${adsAnalytics.ctr.toFixed(2)}%`}
              icon={TrendingUp}
              trend={5}
              description="Click-through rate"
            />
          </div>
        )}

        {/* Premium Upgrade Prompt */}
        {!enhancedData.hasAdsAccess &&
          enhancedData.subscriptionLimited &&
          renderPremiumPrompt()}

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Engagement Trend */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Engagement Trend</CardTitle>
              <CardDescription>Post engagement over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  engagement: {
                    label: "Engagement",
                    color: "hsl(var(--chart-1))",
                  },
                  reach: {
                    label: "Reach",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={postsAnalytics?.engagementTrend || []}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke="var(--color-engagement)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="reach"
                      stroke="var(--color-reach)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Content Performance */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
              <CardDescription>Performance by content type</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  avgEngagement: {
                    label: "Avg Engagement",
                    color: "hsl(var(--chart-3))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={postsAnalytics?.contentPerformance || []}>
                    <XAxis dataKey="type" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="avgEngagement"
                      fill="var(--color-avgEngagement)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Post */}
        {postsAnalytics?.topPost && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Top Performing Post</CardTitle>
              <CardDescription>Your best content recently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium line-clamp-2">
                    {postsAnalytics.topPost.content}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {postsAnalytics.topPost.date}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>
                      Reach: {postsAnalytics.topPost.reach.toLocaleString()}
                    </span>
                    <span>
                      Impressions:{" "}
                      {postsAnalytics.topPost.impressions.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-semibold text-blue-600 text-lg">
                    {postsAnalytics.topPost.engagement.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">engagements</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    );
  }

  // Legacy data structure fallback
  if (isLegacyData) {
    const legacyData = data as FacebookData & {
      dataSource?: string;
      lastUpdated?: string;
    };
    const { pageData, insights, posts } = legacyData;

    // Generate sample daily metrics for chart
    const dailyMetrics = [
      {
        date: "Mon",
        reach: Math.floor(insights.reach * 0.8),
        engagement: Math.floor(insights.engagement * 0.7),
      },
      {
        date: "Tue",
        reach: Math.floor(insights.reach * 0.9),
        engagement: Math.floor(insights.engagement * 0.8),
      },
      {
        date: "Wed",
        reach: Math.floor(insights.reach * 0.85),
        engagement: Math.floor(insights.engagement * 0.9),
      },
      {
        date: "Thu",
        reach: Math.floor(insights.reach * 1.1),
        engagement: Math.floor(insights.engagement * 1.1),
      },
      {
        date: "Fri",
        reach: Math.floor(insights.reach * 1.2),
        engagement: Math.floor(insights.engagement * 1.2),
      },
      {
        date: "Sat",
        reach: Math.floor(insights.reach * 1.15),
        engagement: Math.floor(insights.engagement * 1.0),
      },
      { date: "Sun", reach: insights.reach, engagement: insights.engagement },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Data Source Indicator */}
        {legacyData.dataSource && (
          <div className="text-sm text-gray-500 mb-4">
            Data source:{" "}
            {legacyData.dataSource === "mock"
              ? "Sample data"
              : "Live Facebook API"}
            {legacyData.lastUpdated &&
              ` • Updated: ${new Date(legacyData.lastUpdated).toLocaleString()}`}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-4">
          <MetricCard
            title="Page Likes"
            value={pageData.fan_count.toLocaleString()}
            icon={Users}
            trend={5}
            description="Total page followers"
          />
          <MetricCard
            title="Page Reach"
            value={insights.reach.toLocaleString()}
            icon={Eye}
            trend={12}
            description="Last 7 days"
          />
          <MetricCard
            title="Engagement"
            value={insights.engagement.toLocaleString()}
            icon={Heart}
            trend={8}
            description="Likes, comments, shares"
          />
          <MetricCard
            title="Page Views"
            value={insights.page_views.toLocaleString()}
            icon={TrendingUp}
            trend={15}
            description="Profile visits"
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Daily Performance */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
              <CardDescription>
                Reach and engagement over the past week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  reach: {
                    label: "Reach",
                    color: "hsl(var(--chart-1))",
                  },
                  engagement: {
                    label: "Engagement",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyMetrics}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="reach"
                      stroke="var(--color-reach)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke="var(--color-engagement)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Top Posts */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
              <CardDescription>Your best content this week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.isArray(posts) &&
                posts.slice(0, 4).map((post: any, index: number) => {
                  const totalEngagement =
                    post.likes + post.comments + post.shares;
                  return (
                    <div
                      key={post.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-2">
                          {post.message || "No message"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(post.created_time).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold text-blue-600">
                          {totalEngagement}
                        </div>
                        <div className="text-xs text-gray-500">engagements</div>
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  // Fallback for unknown data structure
  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardContent className="p-12 text-center">
        <div className="text-gray-500">
          Unable to display Facebook data - unknown format
        </div>
      </CardContent>
    </Card>
  );
}
