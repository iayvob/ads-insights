'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { MetricCard } from './metric-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
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
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  Users,
  Eye,
  Heart,
  TrendingUp,
  DollarSign,
  MousePointer,
  Target,
  Lock,
  Calendar,
  ArrowRight,
  ExternalLink,
  ExternalLink as ExternalLinkIcon,
  Percent,
  BarChart2,
  Filter,
  MoreHorizontal,
  ChevronDown,
  Share2,
  MessageSquare,
  ThumbsUp,
  Info,
  HelpCircle,
  UserCheck,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FacebookData,
  FacebookEnhancedData,
} from '@/services/api-clients/facebook-client';
import { PostAnalytics, AdsAnalytics } from '@/validations/analytics-types';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SubscriptionPlan } from '@prisma/client';
import { useSession } from '@/hooks/session-context';
import { getFeatureAccess } from '@/lib/subscription-access';

interface FacebookInsightsProps {
  data?: (FacebookData | FacebookEnhancedData) & {
    dataSource?: string;
    lastUpdated?: string;
    hasAdsAccess?: boolean;
    subscriptionLimited?: boolean;
    error?: {
      type: string;
      message: string;
      details?: any;
    };
  };
  canAccessAds?: boolean;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
}

// Format numbers for display
const formatNumber = (num: number): string => {
  if (num === undefined || num === null) return '0';

  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

// Format currency
const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null) return '$0';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format percentage
const formatPercentage = (value: number): string => {
  if (value === undefined || value === null) return '0%';
  return value.toFixed(2) + '%';
};

// Platform colors
const facebookColors = {
  primary: '#1877F2',
  secondary: '#4267B2',
  gradient: 'from-blue-600 to-blue-800',
  light: '#E7F0FF',
  charts: [
    '#1877F2', // Primary blue
    '#4267B2', // Secondary blue
    '#37AEF3', // Light blue
    '#0D56A6', // Dark blue
    '#B8D1F3', // Pale blue
    '#64A2F6', // Medium blue
  ],
};

// Custom tooltip formatter
const customTooltipFormatter = (value: any, name: string) => {
  if (name === 'spend' || name === 'budget') {
    return formatCurrency(value);
  }
  if (name === 'ctr' || name === 'conversionRate' || name === 'engagement') {
    return value + '%';
  }
  return formatNumber(value);
};

export function FacebookInsights({
  data,
  canAccessAds,
  error: externalError,
}: FacebookInsightsProps) {
  const [dateRange, setDateRange] = useState('30days');
  const [contentFilter, setContentFilter] = useState('all');
  const [insightsTab, setInsightsTab] = useState('overview');
  const { data: session } = useSession();

  // Get user plan from session
  const userPlan = session?.user?.plan || 'FREEMIUM';

  // Get feature access based on plan
  const featureAccess = getFeatureAccess(userPlan as SubscriptionPlan);

  // Determine if user can access ads analytics
  const hasAdsAccess = featureAccess.adsAnalytics || false;

  useEffect(() => {
    // Reset to overview tab when data changes
    setInsightsTab('overview');
  }, [data]);

  if (!data) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-gray-100 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <div className="text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div>
              <CardTitle className="text-xl">Facebook Insights</CardTitle>
              <CardDescription>
                Connect your Facebook account to view insights
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center py-10">
            <div className="mb-4 p-4 rounded-full bg-blue-50">
              <ExternalLink className="h-10 w-10 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No Facebook Data Available
            </h3>
            <p className="text-gray-500 mb-6 text-center">
              Connect your Facebook account to view analytics and insights
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect Facebook Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error || externalError) {
    const error = data.error || externalError;
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-gray-100 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <div className="text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div>
              <CardTitle className="text-xl">Facebook Insights</CardTitle>
              <CardDescription>Error retrieving data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message ||
                'An error occurred while fetching Facebook data.'}
            </AlertDescription>
          </Alert>
          <Button className="mt-2" variant="outline">
            <ArrowRight className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (data && 'enhancedData' in data) {
    const enhancedData: {
      pageData: any;
      posts: PostAnalytics;
      ads?: AdsAnalytics;
      subscriptionLimited?: boolean;
    } = (data as any).enhancedData;
    const { pageData, posts, ads } = enhancedData;
    const postsAnalytics = posts as PostAnalytics;
    const adsAnalytics = ads as AdsAnalytics | null;

    // Create combined performance data for posts and ads
    const combinedPerformanceTrend = postsAnalytics?.engagementTrend?.map(
      (postData, index) => {
        return {
          date: postData.date,
          engagement: postData.engagement,
          reach: postData.reach,
          impressions: postData.impressions,
          // Add ad data if available
          adSpend: adsAnalytics?.spendTrend?.[index]?.spend || 0,
          adClicks: adsAnalytics?.spendTrend?.[index]?.clicks || 0,
        };
      }
    );

    // Format dates for display
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    };

    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div>
                <CardTitle className="text-xl">Facebook Insights</CardTitle>
                <CardDescription>
                  {data.dataSource === 'mock'
                    ? 'Sample data for demonstration'
                    : 'Live data from Facebook'}
                  {data.lastUpdated &&
                    ` • Updated ${new Date(data.lastUpdated).toLocaleDateString()}`}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-36 bg-white border border-gray-200 text-xs">
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={contentFilter} onValueChange={setContentFilter}>
                <SelectTrigger className="w-36 bg-white border border-gray-200 text-xs">
                  <SelectValue placeholder="Content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="text">Text Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4">
          <Tabs
            value={insightsTab}
            onValueChange={setInsightsTab}
            className="space-y-4"
          >
            <TabsList className="grid grid-cols-4 w-full bg-gray-100/50">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="audience" className="text-xs sm:text-sm">
                Audience
              </TabsTrigger>
              <TabsTrigger value="content" className="text-xs sm:text-sm">
                Content
              </TabsTrigger>
              <TabsTrigger value="ads" className="text-xs sm:text-sm">
                Ads Performance
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Page Fans"
                  value={formatNumber(pageData?.fan_count || 0)}
                  icon={UserCheck}
                  description="Total followers"
                  trend={2.5}
                />
                <MetricCard
                  title="Posts Reach"
                  value={formatNumber(
                    postsAnalytics.avgReach * postsAnalytics.totalPosts
                  )}
                  icon={Eye}
                  description="Total organic reach"
                  trend={1.8}
                />
                <MetricCard
                  title="Engagement Rate"
                  value={formatPercentage(
                    (postsAnalytics.engagementTrend?.[0]?.engagement /
                      postsAnalytics.engagementTrend?.[0]?.reach) *
                      100 || 0
                  )}
                  icon={Heart}
                  description="Avg. engagement"
                  trend={0.5}
                />
                <MetricCard
                  title="Page Growth"
                  value={formatPercentage(3.2)}
                  icon={TrendingUp}
                  description="30-day growth"
                  trend={3.2}
                />
              </div>

              {/* Performance Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Audience Engagement
                    </CardTitle>
                    <CardDescription>Page engagement over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={postsAnalytics.engagementTrend}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorEngagement"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor={facebookColors.primary}
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor={facebookColors.primary}
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={{ fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis hide />
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 3"
                            opacity={0.2}
                          />
                          <Tooltip
                            formatter={customTooltipFormatter}
                            labelFormatter={(label) =>
                              formatDate(label as string)
                            }
                            contentStyle={{
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              border: '1px solid #f0f0f0',
                              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="engagement"
                            stroke={facebookColors.primary}
                            fillOpacity={1}
                            fill="url(#colorEngagement)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Content Performance
                    </CardTitle>
                    <CardDescription>
                      Reach and impressions by post
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={postsAnalytics.contentPerformance.slice(0, 5)}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                          barGap={8}
                        >
                          <XAxis
                            dataKey="postType"
                            tickFormatter={(value) =>
                              value.charAt(0).toUpperCase() + value.slice(1)
                            }
                            tick={{ fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis hide />
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 3"
                            opacity={0.2}
                          />
                          <Tooltip
                            formatter={customTooltipFormatter}
                            contentStyle={{
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              border: '1px solid #f0f0f0',
                              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="reach"
                            name="Reach"
                            fill={facebookColors.primary}
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="impressions"
                            name="Impressions"
                            fill={facebookColors.charts[2]}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Combined Charts for Premium Users */}
              {hasAdsAccess && adsAnalytics && (
                <div className="pt-4">
                  <h3 className="text-base font-medium mb-4 flex items-center gap-2">
                    Combined Performance Analytics
                    <Badge
                      variant="outline"
                      className="ml-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0"
                    >
                      <Zap className="h-3 w-3 mr-1" /> Premium
                    </Badge>
                  </h3>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Organic vs. Paid Performance
                      </CardTitle>
                      <CardDescription>
                        Compare organic and paid reach across your content
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={combinedPerformanceTrend}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                          >
                            <XAxis
                              dataKey="date"
                              tickFormatter={formatDate}
                              tick={{ fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis yAxisId="left" hide />
                            <YAxis yAxisId="right" orientation="right" hide />
                            <CartesianGrid
                              vertical={false}
                              strokeDasharray="3 3"
                              opacity={0.2}
                            />
                            <Tooltip
                              formatter={customTooltipFormatter}
                              labelFormatter={(label) =>
                                formatDate(label as string)
                              }
                              contentStyle={{
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                border: '1px solid #f0f0f0',
                                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                              }}
                            />
                            <Legend />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="reach"
                              name="Organic Reach"
                              stroke={facebookColors.primary}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 6, fill: facebookColors.primary }}
                            />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="impressions"
                              name="Impressions"
                              stroke={facebookColors.charts[2]}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{
                                r: 6,
                                fill: facebookColors.charts[2],
                              }}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="adClicks"
                              name="Ad Clicks"
                              stroke={facebookColors.charts[3]}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{
                                r: 6,
                                fill: facebookColors.charts[3],
                              }}
                              strokeDasharray="5 5"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Audience Tab */}
            <TabsContent value="audience" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Followers"
                  value={formatNumber(pageData?.fan_count || 0)}
                  icon={UserCheck}
                  description="All page fans"
                  trend={2.5}
                />
                <MetricCard
                  title="New Followers"
                  value={formatNumber(pageData?.new_fans || 0)}
                  icon={Users}
                  description="Last 30 days"
                  trend={3.2}
                />
                <MetricCard
                  title="Average Reach"
                  value={formatNumber(postsAnalytics.avgReach)}
                  icon={Eye}
                  description="Per post"
                  trend={0.7}
                />
                <MetricCard
                  title="Engagement Rate"
                  value={formatPercentage(
                    (postsAnalytics.engagementTrend?.[0]?.engagement /
                      postsAnalytics.engagementTrend?.[0]?.reach) *
                      100 || 0
                  )}
                  icon={Heart}
                  description="Avg. per post"
                  trend={0.5}
                />
              </div>

              {/* Audience Demographics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Demographic Breakdown
                    </CardTitle>
                    <CardDescription>
                      Age and gender distribution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={pageData?.demographics?.age_gender || []}
                          margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
                          barGap={8}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="age_range"
                            type="category"
                            tick={{ fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <CartesianGrid
                            horizontal={false}
                            strokeDasharray="3 3"
                            opacity={0.2}
                          />
                          <Tooltip
                            formatter={customTooltipFormatter}
                            contentStyle={{
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              border: '1px solid #f0f0f0',
                              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="male"
                            name="Male"
                            fill={facebookColors.primary}
                            radius={[0, 4, 4, 0]}
                          />
                          <Bar
                            dataKey="female"
                            name="Female"
                            fill={facebookColors.charts[2]}
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Location Insights
                    </CardTitle>
                    <CardDescription>Top audience locations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pageData?.demographics?.location || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="country"
                            label={({ country, percent }) =>
                              `${country}: ${(percent * 100).toFixed(1)}%`
                            }
                            labelLine={false}
                          >
                            {pageData?.demographics?.location?.map(
                              (_: any, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    facebookColors.charts[
                                      index % facebookColors.charts.length
                                    ]
                                  }
                                />
                              )
                            )}
                          </Pie>
                          <Tooltip
                            formatter={(value, name, props) => {
                              return [
                                formatNumber(value as number),
                                props.payload.country,
                              ];
                            }}
                            contentStyle={{
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              border: '1px solid #f0f0f0',
                              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Premium Audience Insights */}
              {hasAdsAccess && adsAnalytics?.audienceInsights && (
                <div className="pt-4">
                  <h3 className="text-base font-medium mb-4 flex items-center gap-2">
                    Advanced Audience Analytics
                    <Badge
                      variant="outline"
                      className="ml-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0"
                    >
                      <Zap className="h-3 w-3 mr-1" /> Premium
                    </Badge>
                  </h3>

                  {/* Age Group Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Age Distribution
                        </CardTitle>
                        <CardDescription>
                          Audience breakdown by age groups
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={adsAnalytics.audienceInsights.ageGroups}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="percentage"
                                nameKey="range"
                                label={({ range, percentage }) =>
                                  `${range}: ${percentage}%`
                                }
                                labelLine={false}
                              >
                                {adsAnalytics.audienceInsights.ageGroups.map(
                                  (_: any, index: number) => (
                                    <Cell
                                      key={`age-cell-${index}`}
                                      fill={
                                        facebookColors.charts[
                                          index % facebookColors.charts.length
                                        ]
                                      }
                                    />
                                  )
                                )}
                              </Pie>
                              <Tooltip
                                formatter={(value, name, props) => {
                                  return [
                                    formatPercentage(value as number),
                                    props.payload.range,
                                  ];
                                }}
                                contentStyle={{
                                  backgroundColor: 'white',
                                  borderRadius: '8px',
                                  border: '1px solid #f0f0f0',
                                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Gender Distribution */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Gender Distribution
                        </CardTitle>
                        <CardDescription>
                          Audience breakdown by gender
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={adsAnalytics.audienceInsights.genders}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="percentage"
                                nameKey="gender"
                                label={({ gender, percentage }) =>
                                  `${gender}: ${percentage}%`
                                }
                                labelLine={false}
                              >
                                {adsAnalytics.audienceInsights.genders.map(
                                  (_: any, index: number) => (
                                    <Cell
                                      key={`gender-cell-${index}`}
                                      fill={
                                        facebookColors.charts[
                                          index % facebookColors.charts.length
                                        ]
                                      }
                                    />
                                  )
                                )}
                              </Pie>
                              <Tooltip
                                formatter={(value, name, props) => {
                                  return [
                                    formatPercentage(value as number),
                                    props.payload.gender,
                                  ];
                                }}
                                contentStyle={{
                                  backgroundColor: 'white',
                                  borderRadius: '8px',
                                  border: '1px solid #f0f0f0',
                                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Locations */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Top Locations
                        </CardTitle>
                        <CardDescription>
                          Highest performing locations
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {adsAnalytics.audienceInsights.topLocations
                            .slice(0, 5)
                            .map((location, index) => (
                              <div
                                key={`location-${index}`}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      index === 0
                                        ? 'bg-blue-500'
                                        : index === 1
                                          ? 'bg-blue-400'
                                          : index === 2
                                            ? 'bg-blue-300'
                                            : index === 3
                                              ? 'bg-blue-200'
                                              : 'bg-blue-100'
                                    }`}
                                  />
                                  <span className="text-sm font-medium text-gray-700">
                                    {location.location}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {location.percentage}%
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Audience Interests
                      </CardTitle>
                      <CardDescription>
                        Top interests of your followers
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                        {pageData?.demographics?.interests?.map(
                          (interest: any, i: number) => (
                            <div
                              key={`interest-${i}`}
                              className="py-2 px-3 bg-blue-50 rounded-lg flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-700">
                                {interest.name}
                              </span>
                              <span className="text-xs font-medium text-blue-600">
                                {interest.percentage}%
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Posts"
                  value={formatNumber(postsAnalytics.totalPosts)}
                  icon={Calendar}
                  description="Last 30 days"
                />
                <MetricCard
                  title="Avg. Reach"
                  value={formatNumber(postsAnalytics.avgReach)}
                  icon={Eye}
                  description="Per post"
                  trend={0.7}
                />
                <MetricCard
                  title="Avg. Engagement"
                  value={formatNumber(postsAnalytics.avgEngagement)}
                  icon={ThumbsUp}
                  description="Per post"
                  trend={-0.3}
                />
                <MetricCard
                  title="Engagement Rate"
                  value={formatPercentage(postsAnalytics.engagementRate)}
                  icon={TrendingUp}
                  description="Overall rate"
                />
              </div>

              {/* Enhanced Reach & Engagement Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Total Reach"
                  value={formatNumber(postsAnalytics.totalReach)}
                  icon={Users}
                  description="Unique users reached"
                />
                <MetricCard
                  title="Organic Reach"
                  value={formatNumber(postsAnalytics.organicReach)}
                  icon={TrendingUp}
                  description="Natural discovery"
                />
                <MetricCard
                  title="Viral Reach"
                  value={formatNumber(postsAnalytics.viralReach)}
                  icon={Share2}
                  description="Shared content reach"
                />
              </div>

              {/* Reaction Breakdown */}
              {postsAnalytics.reactionBreakdown && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Reaction Breakdown
                    </CardTitle>
                    <CardDescription>
                      How your audience reacts to your content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(postsAnalytics.reactionBreakdown).map(
                        ([reaction, count]) => (
                          <div
                            key={reaction}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {reaction === 'like'
                                  ? '👍'
                                  : reaction === 'love'
                                    ? '❤️'
                                    : reaction === 'wow'
                                      ? '😮'
                                      : reaction === 'haha'
                                        ? '😆'
                                        : reaction === 'sad'
                                          ? '😢'
                                          : reaction === 'angry'
                                            ? '😠'
                                            : '👍'}
                              </span>
                              <span className="text-sm font-medium capitalize">
                                {reaction}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-blue-600">
                              {formatNumber(count)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Video Performance Metrics */}
              {postsAnalytics.videoMetrics && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Video Performance
                    </CardTitle>
                    <CardDescription>
                      Comprehensive video engagement analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <MetricCard
                        title="Total Views"
                        value={formatNumber(
                          postsAnalytics.videoMetrics.totalViews
                        )}
                        icon={Eye}
                        description="All video views"
                      />
                      <MetricCard
                        title="Avg. View Time"
                        value={`${Math.round(postsAnalytics.videoMetrics.avgViewTime / 1000)}s`}
                        icon={Calendar}
                        description="Per view"
                      />
                      <MetricCard
                        title="Completion Rate"
                        value={formatPercentage(
                          postsAnalytics.videoMetrics.viewCompletionRate
                        )}
                        icon={TrendingUp}
                        description="Videos watched fully"
                      />
                      <MetricCard
                        title="Unique Views"
                        value={formatNumber(
                          postsAnalytics.videoMetrics.videoViewsUnique
                        )}
                        icon={Users}
                        description="Unique viewers"
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-700 mb-1">
                          3s Views
                        </div>
                        <div className="text-lg font-semibold text-blue-900">
                          {formatNumber(
                            postsAnalytics.videoMetrics.videoViews3s
                          )}
                        </div>
                        <div className="text-xs text-blue-600">
                          Initial engagement
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-sm font-medium text-green-700 mb-1">
                          15s Views
                        </div>
                        <div className="text-lg font-semibold text-green-900">
                          {formatNumber(
                            postsAnalytics.videoMetrics.videoViews15s
                          )}
                        </div>
                        <div className="text-xs text-green-600">
                          Strong interest
                        </div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="text-sm font-medium text-purple-700 mb-1">
                          Sound On
                        </div>
                        <div className="text-lg font-semibold text-purple-900">
                          {formatNumber(
                            postsAnalytics.videoMetrics.soundOnViews
                          )}
                        </div>
                        <div className="text-xs text-purple-600">
                          Audio engagement
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content Insights */}
              {postsAnalytics.contentInsights && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Content Insights
                    </CardTitle>
                    <CardDescription>
                      AI-powered analysis of your content performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Optimal Posting Hours */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          Optimal Posting Hours
                        </h4>
                        <div className="space-y-2">
                          {postsAnalytics.contentInsights.optimalPostingHours
                            .slice(0, 4)
                            .map((hour) => (
                              <div
                                key={hour.hour}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <span className="text-sm font-medium">
                                  {hour.hour}:00 {hour.hour >= 12 ? 'PM' : 'AM'}
                                </span>
                                <span className="text-sm text-blue-600">
                                  {formatNumber(hour.avgEngagement)} avg
                                  engagement
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Best Performing Content Type */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          Content Type Performance
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(
                            postsAnalytics.contentInsights.avgEngagementByType
                          ).map(([type, engagement]) => (
                            <div
                              key={type}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {type === 'image'
                                    ? '📷'
                                    : type === 'video'
                                      ? '🎥'
                                      : type === 'carousel'
                                        ? '🎠'
                                        : type === 'text'
                                          ? '📝'
                                          : '📄'}
                                </span>
                                <span className="text-sm font-medium capitalize">
                                  {type}
                                </span>
                              </div>
                              <span className="text-sm text-blue-600">
                                {formatNumber(engagement)} avg
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm font-medium text-blue-700">
                            🏆 Best Performing:{' '}
                            {postsAnalytics.contentInsights.bestPerformingType}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            Focus on this content type for maximum engagement
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Post Performance */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Post Performance
                      </CardTitle>
                      <CardDescription>
                        Compare different post types
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1"
                    >
                      <Filter className="h-3 w-3" />
                      Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={postsAnalytics.contentPerformance}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        barGap={8}
                      >
                        <XAxis
                          dataKey="type"
                          tickFormatter={(value) =>
                            value.charAt(0).toUpperCase() + value.slice(1)
                          }
                          tick={{ fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis hide />
                        <CartesianGrid
                          vertical={false}
                          strokeDasharray="3 3"
                          opacity={0.2}
                        />
                        <Tooltip
                          formatter={customTooltipFormatter}
                          contentStyle={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            border: '1px solid #f0f0f0',
                            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="engagement"
                          name="Engagement"
                          fill={facebookColors.primary}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="reach"
                          name="Reach"
                          fill={facebookColors.charts[2]}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Top Performing Posts
                  </h4>
                  <div className="space-y-4">
                    {postsAnalytics.topPerformingPosts &&
                    postsAnalytics.topPerformingPosts.length > 0 ? (
                      postsAnalytics.topPerformingPosts
                        .slice(0, 3)
                        .map((post, index) => (
                          <div
                            key={post.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50"
                          >
                            <div className="w-16 h-16 bg-blue-100 rounded-md flex items-center justify-center text-blue-500">
                              {post.mediaType === 'image' && (
                                <Share2 className="h-6 w-6" />
                              )}
                              {post.mediaType === 'video' && (
                                <ExternalLinkIcon className="h-6 w-6" />
                              )}
                              {post.mediaType === 'carousel' && (
                                <ExternalLinkIcon className="h-6 w-6" />
                              )}
                              {post.mediaType === 'text' && (
                                <MessageSquare className="h-6 w-6" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                  #{index + 1}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {post.mediaType}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {post.content || 'Post Content'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(post.date)}
                              </p>
                              <div className="flex gap-3 mt-1">
                                <span className="inline-flex items-center text-xs text-gray-600">
                                  <Eye className="h-3 w-3 mr-1 text-gray-400" />
                                  {formatNumber(post.reach)}
                                </span>
                                <span className="inline-flex items-center text-xs text-gray-600">
                                  <ThumbsUp className="h-3 w-3 mr-1 text-gray-400" />
                                  {formatNumber(post.engagement)}
                                </span>
                                <span className="inline-flex items-center text-xs text-gray-600">
                                  <TrendingUp className="h-3 w-3 mr-1 text-gray-400" />
                                  {formatNumber(post.performanceScore || 0)}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                    ) : postsAnalytics.topPost ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                        <div className="w-16 h-16 bg-blue-100 rounded-md flex items-center justify-center text-blue-500">
                          {postsAnalytics.topPost.mediaType === 'image' && (
                            <Share2 className="h-6 w-6" />
                          )}
                          {postsAnalytics.topPost.mediaType === 'video' && (
                            <ExternalLinkIcon className="h-6 w-6" />
                          )}
                          {postsAnalytics.topPost.mediaType === 'carousel' && (
                            <ExternalLinkIcon className="h-6 w-6" />
                          )}
                          {postsAnalytics.topPost.mediaType === 'text' && (
                            <MessageSquare className="h-6 w-6" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {postsAnalytics.topPost.content || 'Top Post'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(postsAnalytics.topPost.date)}
                          </p>
                          <div className="flex gap-3 mt-1">
                            <span className="inline-flex items-center text-xs text-gray-600">
                              <Eye className="h-3 w-3 mr-1 text-gray-400" />
                              {formatNumber(postsAnalytics.topPost.reach)}
                            </span>
                            <span className="inline-flex items-center text-xs text-gray-600">
                              <ThumbsUp className="h-3 w-3 mr-1 text-gray-400" />
                              {formatNumber(postsAnalytics.topPost.engagement)}
                            </span>
                            {postsAnalytics.topPost.reactions && (
                              <span className="inline-flex items-center text-xs text-gray-600">
                                <Heart className="h-3 w-3 mr-1 text-gray-400" />
                                {formatNumber(
                                  Object.values(
                                    postsAnalytics.topPost.reactions
                                  ).reduce((sum, count) => sum + count, 0)
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        No top post data available
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    View All Posts
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardFooter>
              </Card>

              {/* Premium Content Insights */}
              {hasAdsAccess && (
                <div className="pt-4">
                  <h3 className="text-base font-medium mb-4 flex items-center gap-2">
                    Advanced Content Analytics
                    <Badge
                      variant="outline"
                      className="ml-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0"
                    >
                      <Zap className="h-3 w-3 mr-1" /> Premium
                    </Badge>
                  </h3>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Content Performance Prediction
                      </CardTitle>
                      <CardDescription>
                        AI-powered insights for post optimization
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h5 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Optimal Post Times
                          </h5>
                          <div className="space-y-1 mb-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                Monday
                              </span>
                              <span className="text-xs font-medium text-gray-900">
                                3:00 PM
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                Wednesday
                              </span>
                              <span className="text-xs font-medium text-gray-900">
                                1:00 PM
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                Saturday
                              </span>
                              <span className="text-xs font-medium text-gray-900">
                                11:00 AM
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-blue-600 mt-2">
                            Based on follower activity patterns
                          </p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h5 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                            <BarChart2 className="h-4 w-4 mr-1" />
                            Content Recommendations
                          </h5>
                          <div className="space-y-1 mb-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                Video posts
                              </span>
                              <span className="text-xs font-medium text-green-600">
                                +45% engagement
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                Posts with questions
                              </span>
                              <span className="text-xs font-medium text-green-600">
                                +32% comments
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                User testimonials
                              </span>
                              <span className="text-xs font-medium text-green-600">
                                +27% shares
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-blue-600 mt-2">
                            Based on historical performance
                          </p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h5 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                            <Target className="h-4 w-4 mr-1" />
                            Audience Preferences
                          </h5>
                          <div className="space-y-1 mb-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                Educational content
                              </span>
                              <span className="text-xs font-medium text-gray-900">
                                High interest
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                Behind-the-scenes
                              </span>
                              <span className="text-xs font-medium text-gray-900">
                                High interest
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                Product features
                              </span>
                              <span className="text-xs font-medium text-gray-900">
                                Medium interest
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-blue-600 mt-2">
                            Based on engagement patterns
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Ads Performance Tab */}
            <TabsContent value="ads" className="space-y-6">
              {!hasAdsAccess || !adsAnalytics ? (
                <div className="py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-gray-100 p-3 mb-4">
                      <Lock className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      Premium Feature
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-md">
                      Ads analytics are available exclusively for Premium
                      subscribers. Upgrade your plan to access detailed
                      advertising performance metrics.
                    </p>
                    <Button className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900">
                      Upgrade to Premium
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                      title="Active Campaigns"
                      value={formatNumber(adsAnalytics.spendTrend?.length || 0)}
                      icon={Target}
                      description="Running ads"
                    />
                    <MetricCard
                      title="Ad Spend"
                      value={formatCurrency(adsAnalytics.totalSpend)}
                      icon={DollarSign}
                      description="Last 30 days"
                      trend={-2.1}
                    />
                    <MetricCard
                      title="Avg. CTR"
                      value={formatPercentage(adsAnalytics.ctr)}
                      icon={MousePointer}
                      description="Click-through rate"
                      trend={0.8}
                    />
                    <MetricCard
                      title="Cost per Click"
                      value={formatCurrency(adsAnalytics.cpc)}
                      icon={DollarSign}
                      description="Average CPC"
                      trend={-0.3}
                    />
                  </div>

                  {/* Additional Enhanced Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                      title="Total Reach"
                      value={formatNumber(adsAnalytics.totalReach)}
                      icon={Eye}
                      description="People reached"
                    />
                    <MetricCard
                      title="Total Impressions"
                      value={formatNumber(adsAnalytics.totalImpressions)}
                      icon={BarChart2}
                      description="Ad views"
                    />
                    <MetricCard
                      title="CPM"
                      value={formatCurrency(adsAnalytics.cpm)}
                      icon={DollarSign}
                      description="Cost per 1K impressions"
                    />
                    <MetricCard
                      title="ROAS"
                      value={`${adsAnalytics.roas.toFixed(1)}x`}
                      icon={TrendingUp}
                      description="Return on ad spend"
                      trend={adsAnalytics.roas > 3 ? 1.5 : -0.5}
                    />
                  </div>

                  {/* Ad Performance Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Ad Performance Overview
                      </CardTitle>
                      <CardDescription>
                        Spend and results over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={adsAnalytics.spendTrend}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                          >
                            <XAxis
                              dataKey="date"
                              tickFormatter={formatDate}
                              tick={{ fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis yAxisId="left" hide />
                            <YAxis yAxisId="right" orientation="right" hide />
                            <CartesianGrid
                              vertical={false}
                              strokeDasharray="3 3"
                              opacity={0.2}
                            />
                            <Tooltip
                              formatter={(value, name) => {
                                if (name === 'spend')
                                  return [
                                    formatCurrency(value as number),
                                    'Ad Spend',
                                  ];
                                return [formatNumber(value as number), name];
                              }}
                              labelFormatter={(label) =>
                                formatDate(label as string)
                              }
                              contentStyle={{
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                border: '1px solid #f0f0f0',
                                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                              }}
                            />
                            <Legend />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="spend"
                              name="Ad Spend"
                              stroke={facebookColors.charts[3]}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{
                                r: 6,
                                fill: facebookColors.charts[3],
                              }}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="clicks"
                              name="Clicks"
                              stroke={facebookColors.primary}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 6, fill: facebookColors.primary }}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="impressions"
                              name="Impressions"
                              stroke={facebookColors.charts[2]}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{
                                r: 6,
                                fill: facebookColors.charts[2],
                              }}
                              strokeDasharray="5 5"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Enhanced Ads Audience Insights */}
                  {adsAnalytics.audienceInsights && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            Ads Audience Demographics
                            <Badge
                              variant="outline"
                              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0"
                            >
                              <Zap className="h-3 w-3 mr-1" /> Enhanced
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            Age and gender breakdown from ads data
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Age Distribution Mini Chart */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-3">
                                Age Groups
                              </h4>
                              <div className="space-y-2">
                                {adsAnalytics.audienceInsights.ageGroups
                                  .slice(0, 4)
                                  .map((age, index) => (
                                    <div
                                      key={`ads-age-${index}`}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="text-xs text-gray-600">
                                        {age.range}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full transition-all duration-300 ${
                                              index === 0
                                                ? 'bg-blue-500'
                                                : index === 1
                                                  ? 'bg-blue-400'
                                                  : index === 2
                                                    ? 'bg-blue-300'
                                                    : 'bg-blue-200'
                                            } ${
                                              age.percentage >= 75
                                                ? 'w-full'
                                                : age.percentage >= 50
                                                  ? 'w-3/4'
                                                  : age.percentage >= 25
                                                    ? 'w-1/2'
                                                    : age.percentage >= 10
                                                      ? 'w-1/4'
                                                      : 'w-2'
                                            }`}
                                          />
                                        </div>
                                        <span className="text-xs font-medium text-gray-900">
                                          {age.percentage}%
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {/* Gender Distribution Mini Chart */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-3">
                                Gender Split
                              </h4>
                              <div className="space-y-2">
                                {adsAnalytics.audienceInsights.genders.map(
                                  (gender, index) => (
                                    <div
                                      key={`ads-gender-${index}`}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="text-xs text-gray-600 capitalize">
                                        {gender.gender}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full transition-all duration-300 ${
                                              gender.gender.toLowerCase() ===
                                              'female'
                                                ? 'bg-pink-400'
                                                : 'bg-blue-400'
                                            } ${
                                              gender.percentage >= 75
                                                ? 'w-full'
                                                : gender.percentage >= 50
                                                  ? 'w-3/4'
                                                  : gender.percentage >= 25
                                                    ? 'w-1/2'
                                                    : gender.percentage >= 10
                                                      ? 'w-1/4'
                                                      : 'w-2'
                                            }`}
                                          />
                                        </div>
                                        <span className="text-xs font-medium text-gray-900">
                                          {gender.percentage}%
                                        </span>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            Top Performing Locations
                          </CardTitle>
                          <CardDescription>
                            Geographic performance from ads data
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {adsAnalytics.audienceInsights.topLocations
                              .slice(0, 6)
                              .map((location, index) => (
                                <div
                                  key={`ads-location-${index}`}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        index === 0
                                          ? 'bg-green-500'
                                          : index === 1
                                            ? 'bg-blue-500'
                                            : index === 2
                                              ? 'bg-yellow-500'
                                              : index === 3
                                                ? 'bg-purple-500'
                                                : index === 4
                                                  ? 'bg-red-500'
                                                  : 'bg-gray-400'
                                      }`}
                                    />
                                    <span className="text-sm text-gray-700">
                                      {location.location}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-semibold text-gray-900">
                                      {location.percentage}%
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Campaign Table */}
                  <h3 className="text-base font-medium mt-6 mb-3">
                    Active Ad Campaigns
                  </h3>
                  <Card>
                    <CardContent className="p-0 overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 text-xs text-gray-500 bg-gray-50">
                            <th className="px-4 py-3 text-left font-medium">
                              Campaign
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Status
                            </th>
                            <th className="px-4 py-3 text-right font-medium">
                              Budget
                            </th>
                            <th className="px-4 py-3 text-right font-medium">
                              Spend
                            </th>
                            <th className="px-4 py-3 text-right font-medium">
                              Results
                            </th>
                            <th className="px-4 py-3 text-right font-medium">
                              CTR
                            </th>
                            <th className="px-4 py-3 text-right font-medium">
                              CPC
                            </th>
                            <th className="px-4 py-3 text-center font-medium">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {adsAnalytics.topAd ? (
                            <tr
                              key="top-ad"
                              className="border-b border-gray-100 text-sm"
                            >
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {adsAnalytics.topAd.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Top performing ad
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant="default"
                                  className="text-xs bg-green-100 text-green-700 hover:bg-green-100"
                                >
                                  active
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                {formatCurrency(adsAnalytics.topAd.spend)}
                                <span className="text-xs text-gray-500 ml-1">
                                  / day
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(adsAnalytics.topAd.spend)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatNumber(adsAnalytics.topAd.clicks)}
                                <span className="text-xs text-gray-500 ml-1">
                                  clicks
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatPercentage(adsAnalytics.topAd.ctr)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(adsAnalytics.cpc)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td
                                colSpan={8}
                                className="px-4 py-8 text-center text-gray-500"
                              >
                                No ad campaign data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center py-3 px-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Showing ad performance data
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                      >
                        View All Campaigns
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </CardFooter>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="pt-0 pb-4 px-4 text-xs text-gray-500">
          {data.dataSource === 'mock' ? (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>Sample data for demonstration purposes</span>
              </div>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                Connect Facebook Account
              </Button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>
                  Data last updated:{' '}
                  {data.lastUpdated &&
                    new Date(data.lastUpdated).toLocaleString()}
                </span>
              </div>
              <TooltipProvider>
                <TooltipUI>
                  <TooltipTrigger asChild>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                    >
                      <HelpCircle className="h-3 w-3 mr-1" />
                      Help
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">
                      Learn more about Facebook Analytics
                    </p>
                  </TooltipContent>
                </TooltipUI>
              </TooltipProvider>
            </div>
          )}
        </CardFooter>
      </Card>
    );
  }

  return null;
}
