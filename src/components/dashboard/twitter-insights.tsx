'use client';

import { useState } from 'react';
import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Percent,
  BarChart2,
  MessageSquare,
  ThumbsUp,
  BarChart,
  Share2,
  Zap,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';
import {
  TwitterAnalytics,
  TwitterAdsAnalytics,
  TwitterPostAnalytics,
} from '@/validations/analytics-types';
import { useSession } from '@/hooks/session-context';
import { getFeatureAccess } from '@/lib/subscription-access';
import { SubscriptionPlan } from '@prisma/client';

import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

interface TwitterInsightsProps {
  data?: TwitterAnalytics;
  isLoading?: boolean;
  error?: Error | null;
}

// Helper functions to format numbers
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

// Twitter colors
const twitterColors = {
  primary: '#1DA1F2',
  secondary: '#14171A',
  gradient: 'from-blue-400 to-blue-600',
  light: '#E8F5FD',
  charts: [
    '#1DA1F2', // Primary blue
    '#AAB8C2', // Light gray
    '#657786', // Dark gray
    '#14171A', // Black
    '#E1E8ED', // Extra light gray
    '#38B2AC', // Teal
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

export function TwitterInsights({
  data,
  isLoading,
  error,
}: TwitterInsightsProps) {
  const [dateRange, setDateRange] = useState('30days');
  const [contentFilter, setContentFilter] = useState('all');
  const [insightsTab, setInsightsTab] = useState('overview');
  const { data: session } = useSession();

  // Get user plan from session
  const userPlan = session?.user?.plan || 'FREEMIUM';

  // 🔍 DEBUG: Log incoming Twitter data
  React.useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🐦 TWITTER INSIGHTS - DATA RECEIVED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Data Status:', {
      hasData: !!data,
      isLoading,
      hasError: !!error,
      errorMessage: error?.message,
    });

    if (data) {
      console.log('\n📈 TWITTER PROFILE DATA:');
      console.log('   Profile:', data.profile);
      console.log('   Followers:', data.profile?.followers_count);
      console.log('   Last Updated:', data.lastUpdated);

      console.log('\n📝 POSTS DATA:');
      console.log('   Total Posts:', data.posts?.totalPosts);
      console.log('   Avg Engagement:', data.posts?.avgEngagement);
      console.log('   Avg Reach:', data.posts?.avgReach);
      console.log(
        '   Engagement Trend:',
        data.posts?.engagementTrend?.length,
        'data points'
      );
      console.log('   Top Tweet:', data.posts?.topTweet);

      console.log('\n💰 ADS DATA:');
      console.log('   Has Ads Data:', !!data.ads);
      console.log('   User Plan:', userPlan);
      console.log('   Has Ads Access:', featureAccess.adsAnalytics);

      if (data.ads) {
        const twitterAds = isTwitterAdsAnalytics(data.ads) ? data.ads : null;
        console.log('   Total Spend:', twitterAds?.totalSpend);
        console.log('   Total Reach:', twitterAds?.totalReach);
        console.log('   Total Clicks:', twitterAds?.totalClicks);
        console.log('   CTR:', twitterAds?.ctr);
        console.log(
          '   Twitter Specific Metrics:',
          twitterAds?.twitterSpecificMetrics
        );
        console.log(
          '   Promoted Tweets:',
          twitterAds?.promotedTweetPerformance?.length
        );
      }

      console.log('\n🔍 FULL DATA OBJECT:');
      console.log(JSON.stringify(data, null, 2));
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }, [data, isLoading, error, userPlan]);

  // Get feature access based on plan
  const featureAccess = getFeatureAccess(userPlan as SubscriptionPlan);

  // Determine if user can access ads analytics
  const hasAdsAccess = featureAccess.adsAnalytics || false;

  // Type guard to check if ads data is TwitterAdsAnalytics
  const isTwitterAdsAnalytics = (ads: any): ads is TwitterAdsAnalytics => {
    return ads && typeof ads === 'object' && 'twitterSpecificMetrics' in ads;
  };

  // Get Twitter-specific ads data
  const twitterAds =
    data && data.ads && isTwitterAdsAnalytics(data.ads) ? data.ads : null;

  // Format dates for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
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
              <CardTitle className="text-xl">Twitter/X Insights</CardTitle>
              <CardDescription>
                Loading your Twitter analytics...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center py-10">
            <div className="h-10 w-10 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin mb-4"></div>
            <p className="text-gray-500">
              Please wait while we fetch your Twitter data...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const isAuthError =
      error?.message?.includes('token') ||
      error?.message?.includes('Authentication');

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
              <CardTitle className="text-xl">Twitter/X Insights</CardTitle>
              <CardDescription>Error retrieving data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message ||
                'An error occurred while fetching Twitter data.'}
            </AlertDescription>
          </Alert>
          {isAuthError && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                <strong>Authentication Issue Detected</strong>
              </p>
              <p className="text-xs text-yellow-700 mb-3">
                Your Twitter connection may have expired. Please reconnect your
                Twitter account in the Profile → Connections section.
              </p>
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
                onClick={() =>
                  (window.location.href = '/profile?tab=connections')
                }
              >
                Go to Connections
              </Button>
            </div>
          )}
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

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
              <CardTitle className="text-xl">Twitter/X Insights</CardTitle>
              <CardDescription>
                Connect your Twitter account to view insights
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
              No Twitter Data Available
            </h3>
            <p className="text-gray-500 mb-6 text-center">
              Connect your Twitter/X account to view analytics and insights
            </p>
            <Button className="bg-blue-400 hover:bg-blue-500">
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect Twitter Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <div className="text-blue-500">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div>
              <CardTitle className="text-xl">Twitter/X Insights</CardTitle>
              <CardDescription>
                {data.lastUpdated &&
                  `Updated ${new Date(data.lastUpdated).toLocaleDateString()}`}
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
                <SelectItem value="all">All Tweets</SelectItem>
                <SelectItem value="image">With Images</SelectItem>
                <SelectItem value="video">With Videos</SelectItem>
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
                title="Followers"
                value={formatNumber(data.profile?.followers_count || 0)}
                icon={Users}
                description="Total followers"
                trend={1.8}
              />
              <MetricCard
                title="Tweet Reach"
                value={formatNumber(
                  data.posts ? data.posts.avgReach * data.posts.totalPosts : 0
                )}
                icon={Eye}
                description="Total organic reach"
                trend={2.3}
              />
              <MetricCard
                title="Engagement Rate"
                value={formatPercentage(
                  data.posts
                    ? (data.posts.avgEngagement / data.posts.avgReach) * 100 ||
                        0
                    : 0
                )}
                icon={Heart}
                description="Avg. engagement"
                trend={0.7}
              />
              <MetricCard
                title="Total Posts"
                value={formatNumber(data.posts?.totalPosts || 0)}
                icon={MessageSquare}
                description="Published tweets"
                trend={3.5}
              />
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Engagement Trend</CardTitle>
                  <CardDescription>Tweet engagement over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data.posts?.engagementTrend || []}
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
                              stopColor={twitterColors.primary}
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor={twitterColors.primary}
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
                          stroke={twitterColors.primary}
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
                  <CardDescription>Engagement by content type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={data.posts?.contentPerformance || []}
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
                          dataKey="avgEngagement"
                          name="Engagement"
                          fill={twitterColors.primary}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="count"
                          name="Count"
                          fill={twitterColors.charts[1]}
                          radius={[4, 4, 0, 0]}
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performing Tweet */}
            {data.posts?.topTweet && (
              <div className="pt-4">
                <h3 className="text-base font-medium mb-4">
                  Top Performing Tweet
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {data.posts?.topTweet?.text}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          {formatDate(data.posts?.topTweet?.date || '')}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Impressions</p>
                            <p className="text-sm font-medium">
                              {formatNumber(
                                data.posts?.topTweet?.impressions || 0
                              )}
                            </p>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Engagement</p>
                            <p className="text-sm font-medium">
                              {formatNumber(
                                data.posts?.topTweet?.engagement || 0
                              )}
                            </p>
                          </div>
                          <div className="bg-purple-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Likes</p>
                            <p className="text-sm font-medium">
                              {formatNumber(
                                data.posts?.topTweet?.metrics?.likes || 0
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Audience Tab */}
          <TabsContent value="audience" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Audience Growth</CardTitle>
                  <CardDescription>Follower count over time</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.posts?.engagementTrend || []}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
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
                        labelFormatter={(label) => formatDate(label as string)}
                        contentStyle={{
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          border: '1px solid #f0f0f0',
                          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="reach"
                        name="Audience"
                        stroke={twitterColors.primary}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: twitterColors.primary }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Content Types</CardTitle>
                  <CardDescription>Performance by media type</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={data.posts?.contentPerformance || []}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                        dataKey="count"
                        name="Count"
                        fill={twitterColors.charts[0]}
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Engagement by Type
                  </CardTitle>
                  <CardDescription>Which content performs best</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={data.posts?.contentPerformance || []}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                        dataKey="avgEngagement"
                        name="Engagement"
                        fill={twitterColors.charts[2]}
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ads Performance Tab */}
          <TabsContent value="ads" className="space-y-6">
            {!hasAdsAccess ? (
              // User doesn't have Premium plan - show upgrade prompt
              <div className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-gray-100 p-3 mb-4">
                    <Lock className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Premium Feature
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md">
                    Twitter Ads analytics are available exclusively for Premium
                    subscribers. Upgrade your plan to access detailed
                    advertising performance metrics including campaign
                    analytics, engagement tracking, and conversion insights.
                  </p>
                  <Button className="bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700">
                    Upgrade to Premium
                  </Button>
                </div>
              </div>
            ) : !twitterAds ? (
              // Premium user but no ads data returned
              <div className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-yellow-100 p-3 mb-4">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    No Ads Data Available
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md">
                    Unable to load Twitter Ads analytics. Please try again
                    later.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : (twitterAds as any).error ? (
              // Premium user with specific error from API
              <div className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div
                    className={`rounded-full p-3 mb-4 ${
                      (twitterAds as any).error === 'no_ads_account'
                        ? 'bg-blue-100'
                        : 'bg-yellow-100'
                    }`}
                  >
                    {(twitterAds as any).error === 'no_ads_account' ? (
                      <Target className="h-6 w-6 text-blue-600" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-yellow-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    {(twitterAds as any).error === 'no_ads_account'
                      ? 'Set Up Twitter Ads'
                      : (twitterAds as any).error === 'ads_api_not_configured'
                        ? 'Coming Soon'
                        : 'Ads Data Unavailable'}
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md">
                    {(twitterAds as any).message ||
                      'Unable to fetch Twitter Ads data'}
                  </p>
                  {(twitterAds as any).action === 'setup_ads' && (
                    <Button
                      className="bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700"
                      onClick={() =>
                        window.open('https://ads.twitter.com', '_blank')
                      }
                    >
                      Set Up Ads Account
                    </Button>
                  )}
                  {(twitterAds as any).action === 'retry_later' && (
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      Try Again
                    </Button>
                  )}
                  {(twitterAds as any).action === 'contact_support' && (
                    <Button variant="outline">Contact Support</Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Campaign Performance Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Total Spend"
                    value={formatCurrency(twitterAds.totalSpend)}
                    icon={DollarSign}
                    description="Campaign budget used"
                    trend={-1.5}
                  />
                  <MetricCard
                    title="Impressions"
                    value={formatNumber(twitterAds.totalImpressions)}
                    icon={Eye}
                    description="Total ad views"
                    trend={5.2}
                  />
                  <MetricCard
                    title="Clicks"
                    value={formatNumber(twitterAds.totalClicks)}
                    icon={MousePointer}
                    description="Link and engagement clicks"
                    trend={3.8}
                  />
                  <MetricCard
                    title="CTR"
                    value={formatPercentage(twitterAds.ctr)}
                    icon={TrendingUp}
                    description="Click-through rate"
                    trend={1.2}
                  />
                </div>

                {/* Campaign Performance Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Campaign Performance
                      </CardTitle>
                      <CardDescription>Key metrics by campaign</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {twitterAds.campaignPerformance
                          .slice(0, 3)
                          .map((campaign: any, index: number) => (
                            <div
                              key={campaign.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {campaign.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Status: {campaign.status}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {formatCurrency(campaign.totalBudget)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatNumber(campaign.engagements)} eng.
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Conversion Metrics
                      </CardTitle>
                      <CardDescription>Performance outcomes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MousePointer className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-gray-600">
                              Website Clicks
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            {formatNumber(
                              twitterAds.conversionMetrics.websiteClicks.count
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-gray-600">
                              App Installs
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            {formatNumber(
                              twitterAds.conversionMetrics.appInstalls.count
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span className="text-sm text-gray-600">
                              Lead Generation
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            {formatNumber(
                              twitterAds.conversionMetrics.leadGeneration.count
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart2 className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-gray-600">
                              Total Conversions
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            {formatNumber(
                              twitterAds.conversionMetrics.purchases.count +
                                twitterAds.conversionMetrics.signups.count
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Promoted Tweet Performance */}
                {twitterAds.promotedTweetPerformance.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Top Promoted Tweets
                      </CardTitle>
                      <CardDescription>
                        Best performing promoted content
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {twitterAds.promotedTweetPerformance
                          .slice(0, 2)
                          .map((tweet: any, index: number) => (
                            <div
                              key={tweet.id}
                              className="border rounded-lg p-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                  <MessageSquare className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-gray-900 mb-2 line-clamp-2">
                                    {tweet.tweetText}
                                  </p>
                                  <div className="grid grid-cols-4 gap-3 text-xs">
                                    <div>
                                      <p className="text-gray-500">
                                        Impressions
                                      </p>
                                      <p className="font-medium">
                                        {formatNumber(tweet.impressions)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">
                                        Engagements
                                      </p>
                                      <p className="font-medium">
                                        {formatNumber(tweet.engagements)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Spend</p>
                                      <p className="font-medium">
                                        {formatCurrency(tweet.spend)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">CPE</p>
                                      <p className="font-medium">
                                        {formatCurrency(
                                          tweet.cpe ||
                                            tweet.spend / tweet.engagements
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Audience Insights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Demographics</CardTitle>
                      <CardDescription>Age distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {twitterAds.twitterAudienceInsights.demographics.ageGroups
                          .slice(0, 4)
                          .map((group: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-600">
                                {group.range}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    data-width={`${Math.min(100, Math.max(0, group.percentage || 0))}%`}
                                    ref={(el) => {
                                      if (el) {
                                        el.style.width = `${Math.min(100, Math.max(0, group.percentage || 0))}%`;
                                      }
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 w-8">
                                  {group.percentage}%
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Top Interests</CardTitle>
                      <CardDescription>Audience preferences</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {twitterAds.twitterAudienceInsights.interests
                          .slice(0, 5)
                          .map((interest: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-600">
                                {interest.category}
                              </span>
                              <span className="text-xs text-gray-500">
                                {interest.percentage}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Billing Overview
                      </CardTitle>
                      <CardDescription>Cost breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Total Billed
                          </span>
                          <span className="text-sm font-medium">
                            {formatCurrency(
                              twitterAds.billingInsights.totalBilledAmount
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Currency
                          </span>
                          <span className="text-sm font-medium">
                            {twitterAds.billingInsights.currency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">CPM</span>
                          <span className="text-sm font-medium">
                            {formatCurrency(twitterAds.cpm)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm font-medium text-gray-900">
                            Total Spend
                          </span>
                          <span className="text-sm font-medium">
                            {formatCurrency(twitterAds.totalSpend)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Engagement Quality & Video Metrics (if available) */}
                {twitterAds.videoMetrics &&
                  twitterAds.videoMetrics.totalVideoViews > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Video Performance
                        </CardTitle>
                        <CardDescription>
                          Video ad engagement metrics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">
                              {formatNumber(
                                twitterAds.videoMetrics.totalVideoViews
                              )}
                            </p>
                            <p className="text-xs text-gray-600">Total Views</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">
                              {formatPercentage(
                                twitterAds.videoMetrics.avgVideoViewPercentage
                              )}
                            </p>
                            <p className="text-xs text-gray-600">
                              Completion Rate
                            </p>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <p className="text-2xl font-bold text-purple-600">
                              {formatNumber(
                                twitterAds.videoMetrics.avgVideoViewTime
                              )}
                              s
                            </p>
                            <p className="text-xs text-gray-600">
                              Avg Watch Time
                            </p>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">
                              {formatNumber(
                                twitterAds.videoMetrics.fullScreenViews
                              )}
                            </p>
                            <p className="text-xs text-gray-600">
                              Full Screen Views
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="pt-0 pb-6 px-6">
        <div className="w-full flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {data.lastUpdated &&
              `Last updated: ${new Date(data.lastUpdated).toLocaleString()}`}
          </p>
          <Button variant="outline" size="sm" className="text-xs">
            <RefreshCcw className="h-3 w-3 mr-2" />
            Refresh Data
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
