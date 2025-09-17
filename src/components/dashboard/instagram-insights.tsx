'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from './metric-card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  Users,
  Eye,
  Heart,
  Camera,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  MessageCircle,
  Bookmark,
  MousePointer,
  Mail,
  Phone,
  Navigation,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  InstagramPostAnalytics,
  InstagramAdsAnalytics,
} from '@/validations/analytics-types';

interface InstagramAnalytics {
  posts?: InstagramPostAnalytics;
  ads?: InstagramAdsAnalytics;
  account: {
    followers_count: number;
    media_count: number;
    account_type: string;
    username: string;
    biography: string;
    website: string;
    profile_picture_url: string;
  };
  lastUpdated: string;
  plan: string;
}

interface InstagramInsightsProps {
  data?: InstagramAnalytics;
  error?: {
    type:
      | 'no_business_account'
      | 'connection_failed'
      | 'api_error'
      | 'token_expired';
    message: string;
    details?: any;
  };
  canAccessAds?: boolean;
}

// Helper functions for chart colors
function getContentTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'carousel':
      return '#8b5cf6';
    case 'photo':
      return '#3b82f6';
    case 'video':
      return '#ef4444';
    case 'reel':
      return '#ec4899';
    case 'story':
      return '#10b981';
    default:
      return '#6b7280';
  }
}

function getAgeGroupColor(range: string): string {
  switch (range) {
    case '13-17':
      return '#fbbf24';
    case '18-24':
      return '#34d399';
    case '25-34':
      return '#3b82f6';
    case '35-44':
      return '#8b5cf6';
    case '45-54':
      return '#ef4444';
    case '55-64':
      return '#f97316';
    case '65+':
      return '#6b7280';
    default:
      return '#9ca3af';
  }
}

function getLocationColor(location: string): string {
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#84cc16',
  ];
  const index = location.charCodeAt(0) % colors.length;
  return colors[index];
}

// Instagram Business Account Connection Component
function InstagramConnectionPrompt({
  error,
}: {
  error: InstagramInsightsProps['error'];
}) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <CardTitle className="text-amber-800">
          Instagram Business Account Required
        </CardTitle>
        <CardDescription className="text-amber-600">
          {error?.message ||
            'To view Instagram insights, you need to connect an Instagram Business account.'}
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
            onClick={() =>
              window.open(
                'https://help.instagram.com/502981923235522',
                '_blank'
              )
            }
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Instagram Help
          </Button>
          <Button size="sm" onClick={() => (window.location.href = '/profile')}>
            Reconnect Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function InstagramInsights({
  canAccessAds,
  data,
  error,
}: InstagramInsightsProps) {
  // Show connection prompt if there's a business account error
  if (error?.type === 'no_business_account' || (!data && error)) {
    return <InstagramConnectionPrompt error={error} />;
  }

  if (!data) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <div className="text-gray-500">No Instagram data available</div>
        </CardContent>
      </Card>
    );
  }

  const { posts, ads, account, lastUpdated } = data;

  if (!posts) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <div className="text-gray-500">No Instagram posts data available</div>
        </CardContent>
      </Card>
    );
  }

  // Prepare content performance data for chart
  const contentPerformanceData = posts.contentPerformance.map((item) => ({
    name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
    count: item.count,
    avgEngagement: item.avgEngagement,
    avgReach: item.avgReach,
    avgImpressions: item.avgImpressions,
    engagementRate: item.engagementRate,
    color: getContentTypeColor(item.type),
  }));

  // Prepare engagement trend data for chart
  const engagementTrendData = posts.engagementTrend.slice(-7).map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    engagement: item.engagement,
    reach: item.reach,
    impressions: item.impressions,
    saves: item.saves || 0,
    profileViews: item.profileViews || 0,
    websiteClicks: item.websiteClicks || 0,
  }));

  // Prepare audience demographics data
  const ageGroupData =
    posts.audienceInsights?.ageGroups?.map((group) => ({
      name: group.range,
      value: group.percentage,
      color: getAgeGroupColor(group.range),
    })) || [];

  const genderData =
    posts.audienceInsights?.genders?.map((gender) => ({
      name: gender.gender,
      value: gender.percentage,
      color: gender.gender === 'Female' ? '#ec4899' : '#3b82f6',
    })) || [];

  const topLocationsData =
    posts.audienceInsights?.topLocations?.slice(0, 5).map((location) => ({
      name: location.location,
      value: location.percentage,
      color: getLocationColor(location.location),
    })) || [];

  // Prepare followers growth data
  const followersGrowthData =
    posts.audienceInsights?.followersGrowth?.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      count: item.count,
    })) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Data Source Indicator */}
      <div className="text-sm text-gray-500 mb-4">
        Instagram Business Account • Updated:{' '}
        {new Date(lastUpdated).toLocaleString()}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        <MetricCard
          title="Followers"
          value={account?.followers_count?.toLocaleString() || '0'}
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

      {/* Enhanced Instagram Metrics Row */}
      <div className="grid gap-6 md:grid-cols-4">
        <MetricCard
          title="Engagement Rate"
          value={`${posts.engagementRate.toFixed(2)}%`}
          icon={TrendingUp}
          trend={posts.engagementRate > 2 ? 10 : 0}
          description="Total engagement rate"
        />
        <MetricCard
          title="Total Saves"
          value={posts.totalSaves.toLocaleString()}
          icon={Bookmark}
          trend={posts.totalSaves > 0 ? 15 : 0}
          description="Content saved"
        />
        <MetricCard
          title="Profile Views"
          value={posts.totalProfileViews.toLocaleString()}
          icon={Eye}
          trend={posts.totalProfileViews > 0 ? 12 : 0}
          description="Profile visits"
        />
        <MetricCard
          title="Website Clicks"
          value={posts.websiteClicks.toLocaleString()}
          icon={MousePointer}
          trend={posts.websiteClicks > 0 ? 8 : 0}
          description="Link clicks"
        />
      </div>

      {/* Action Metrics Row */}
      <div className="grid gap-6 md:grid-cols-4">
        <MetricCard
          title="Email Clicks"
          value={posts.emailClicks.toLocaleString()}
          icon={Mail}
          trend={posts.emailClicks > 0 ? 6 : 0}
          description="Email contacts"
        />
        <MetricCard
          title="Phone Clicks"
          value={posts.phoneCallClicks.toLocaleString()}
          icon={Phone}
          trend={posts.phoneCallClicks > 0 ? 4 : 0}
          description="Phone calls"
        />
        <MetricCard
          title="Directions"
          value={posts.getDirectionsClicks.toLocaleString()}
          icon={Navigation}
          trend={posts.getDirectionsClicks > 0 ? 3 : 0}
          description="Get directions"
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

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Enhanced Engagement Trend */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Engagement Trend</CardTitle>
            <CardDescription>
              Daily engagement, reach, and saves
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                engagement: { label: 'Engagement', color: '#e91e63' },
                reach: { label: 'Reach', color: '#3b82f6' },
                saves: { label: 'Saves', color: '#10b981' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementTrendData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    stackId="1"
                    stroke="#e91e63"
                    fill="#e91e63"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="saves"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

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
                  label: 'Avg Engagement',
                  color: '#e91e63',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contentPerformanceData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgEngagement" fill="#e91e63" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Audience Demographics */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Age Groups */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Age Groups</CardTitle>
            <CardDescription>Audience by age range</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ageGroupData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {ageGroupData.map((entry, index) => (
                      <Cell key={`age-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Gender</CardTitle>
            <CardDescription>Audience by gender</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`gender-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Locations */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Top Locations</CardTitle>
            <CardDescription>Audience by location</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topLocationsData} layout="horizontal">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={60} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Followers Growth */}
      {followersGrowthData.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Followers Growth</CardTitle>
            <CardDescription>Follower count over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: 'Followers', color: '#3b82f6' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={followersGrowthData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Content Insights */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Content Insights</CardTitle>
          <CardDescription>
            Performance recommendations and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">
                Best Performing Content
              </h4>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                {posts.contentInsights?.bestPerformingType || 'Video'} content
                performs best
              </Badge>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">
                Top Engagement Types
              </h4>
              <div className="flex flex-wrap gap-2">
                {posts.contentPerformance.slice(0, 3).map((content, index) => (
                  <Badge key={index} variant="outline">
                    {content.type}: {Math.round(content.avgEngagement)} avg
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Posts */}
      {posts.topPerformingPosts && posts.topPerformingPosts.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Top Performing Posts</CardTitle>
            <CardDescription>Your best content by engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {posts.topPerformingPosts.slice(0, 3).map((post, index) => (
                <div
                  key={post.id}
                  className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg"
                >
                  <Badge variant="secondary" className="mt-1">
                    #{index + 1}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{Math.round(post.engagement)} engagement</span>
                      <span>
                        {Math.round(post.reach).toLocaleString()} reach
                      </span>
                      <span>
                        {Math.round(post.impressions).toLocaleString()}{' '}
                        impressions
                      </span>
                      <span className="text-purple-600">{post.mediaType}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(post.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Instagram Ads Analytics for Premium Users */}
      {canAccessAds && ads && (
        <>
          {/* Ads Overview Cards */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Instagram Ads Performance Overview</span>
                <Badge
                  variant="default"
                  className="bg-purple-100 text-purple-800"
                >
                  Premium
                </Badge>
              </CardTitle>
              <CardDescription>
                Key advertising campaign metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4 mb-6">
                <MetricCard
                  title="Total Spend"
                  value={`$${ads.totalSpend.toFixed(2)}`}
                  icon={TrendingUp}
                  trend={0}
                  description="Campaign budget"
                />
                <MetricCard
                  title="Total Reach"
                  value={ads.totalReach.toLocaleString()}
                  icon={Eye}
                  trend={0}
                  description="People reached"
                />
                <MetricCard
                  title="Total Clicks"
                  value={ads.totalClicks.toLocaleString()}
                  icon={MousePointer}
                  trend={0}
                  description="Link clicks"
                />
                <MetricCard
                  title="ROAS"
                  value={`${ads.roas}x`}
                  icon={TrendingUp}
                  trend={ads.roas > 1 ? 10 : 0}
                  description="Return on ad spend"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    ${ads.cpc.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Cost per Click</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    ${ads.cpm.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Cost per 1000 Impressions
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {ads.ctr.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    Click-through Rate
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instagram-Specific Placement Performance */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Instagram Placement Performance</CardTitle>
              <CardDescription>
                Performance breakdown by Instagram ad placement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Stories Performance */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">
                    Stories Performance
                  </h4>
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                      <span className="text-sm font-medium">Impressions</span>
                      <span className="font-bold">
                        {ads.instagramSpecificMetrics.storiesImpressions.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                      <span className="text-sm font-medium">Reach</span>
                      <span className="font-bold">
                        {ads.instagramSpecificMetrics.storiesReach.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                      <span className="text-sm font-medium">CTR</span>
                      <span className="font-bold">
                        {ads.instagramSpecificMetrics.storiesCtr.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feed Performance */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">
                    Feed Performance
                  </h4>
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                      <span className="text-sm font-medium">Impressions</span>
                      <span className="font-bold">
                        {ads.instagramSpecificMetrics.feedImpressions.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                      <span className="text-sm font-medium">Reach</span>
                      <span className="font-bold">
                        {ads.instagramSpecificMetrics.feedReach.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                      <span className="text-sm font-medium">CTR</span>
                      <span className="font-bold">
                        {ads.instagramSpecificMetrics.feedCtr.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reels Performance */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">
                    Reels Performance
                  </h4>
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg">
                      <span className="text-sm font-medium">Impressions</span>
                      <span className="font-bold">
                        {ads.instagramSpecificMetrics.reelsImpressions.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg">
                      <span className="text-sm font-medium">Reach</span>
                      <span className="font-bold">
                        {ads.instagramSpecificMetrics.reelsReach.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg">
                      <span className="text-sm font-medium">CTR</span>
                      <span className="font-bold">
                        {ads.instagramSpecificMetrics.reelsCtr.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Instagram Actions */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">
                    Instagram Actions
                  </h4>
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                      <span className="text-sm font-medium">
                        Profile Visits
                      </span>
                      <span className="font-bold">
                        {ads.instagramActions.profileVisits.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                      <span className="text-sm font-medium">
                        Website Clicks
                      </span>
                      <span className="font-bold">
                        {ads.instagramActions.websiteClicks.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                      <span className="text-sm font-medium">Page Follows</span>
                      <span className="font-bold">
                        {ads.instagramActions.pageFollows.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Creative Performance */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Creative Performance Analysis</CardTitle>
              <CardDescription>
                Top performing Instagram ad creatives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ads.creativePerformance.map((creative, index) => (
                  <div
                    key={creative.id}
                    className="p-4 border rounded-lg bg-gradient-to-r from-gray-50 to-white"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-semibold">{creative.name}</h5>
                        <Badge variant="secondary" className="text-xs">
                          {creative.type}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {creative.roas}x ROAS
                        </div>
                        <div className="text-sm text-gray-500">
                          ${creative.spend.toFixed(2)} spent
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold">
                          {creative.impressions.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Impressions</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {creative.clicks.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Clicks</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {creative.ctr.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-500">CTR</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {creative.conversions}
                        </div>
                        <div className="text-xs text-gray-500">Conversions</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conversion Metrics */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Conversion Tracking</CardTitle>
              <CardDescription>
                Instagram ads conversion performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {ads.conversionMetrics.purchases.count}
                  </div>
                  <div className="text-sm text-green-600 mb-1">Purchases</div>
                  <div className="text-xs text-gray-500">
                    ${ads.conversionMetrics.purchases.value.toFixed(2)} revenue
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-100 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {ads.conversionMetrics.addToCart.count}
                  </div>
                  <div className="text-sm text-blue-600 mb-1">Add to Cart</div>
                  <div className="text-xs text-gray-500">
                    ${ads.conversionMetrics.addToCart.value.toFixed(2)} value
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {ads.conversionMetrics.lead.count}
                  </div>
                  <div className="text-sm text-purple-600 mb-1">Leads</div>
                  <div className="text-xs text-gray-500">
                    ${ads.conversionMetrics.lead.value.toFixed(2)} value
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audience Demographics */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Audience Demographics</CardTitle>
              <CardDescription>
                Instagram ads audience insights with ROAS breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Age Groups with ROAS */}
                <div>
                  <h4 className="font-semibold mb-4">Age Groups Performance</h4>
                  <div className="space-y-3">
                    {ads.adsAudienceInsights.ageGroups.map((group, index) => (
                      <div
                        key={group.range}
                        className="flex justify-between items-center p-3 rounded-lg"
                        style={{
                          backgroundColor: `${getAgeGroupColor(group.range)}15`,
                          borderLeft: `4px solid ${getAgeGroupColor(group.range)}`,
                        }}
                      >
                        <div>
                          <span className="font-medium">{group.range}</span>
                          <div className="text-sm text-gray-500">
                            ${group.spend.toFixed(2)} spent
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{group.percentage}%</div>
                          <div className="text-sm text-green-600 font-medium">
                            {group.roas.toFixed(1)}x ROAS
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gender Performance */}
                <div>
                  <h4 className="font-semibold mb-4">Gender Performance</h4>
                  <div className="space-y-3">
                    {ads.adsAudienceInsights.genders.map((gender, index) => (
                      <div
                        key={gender.gender}
                        className="flex justify-between items-center p-3 rounded-lg border-l-4"
                        style={{
                          backgroundColor:
                            gender.gender === 'Female' ? '#f0f9ff' : '#fefce8',
                          borderLeftColor:
                            gender.gender === 'Female' ? '#0ea5e9' : '#eab308',
                        }}
                      >
                        <div>
                          <span className="font-medium">{gender.gender}</span>
                          <div className="text-sm text-gray-500">
                            ${gender.spend.toFixed(2)} spent
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{gender.percentage}%</div>
                          <div className="text-sm text-green-600 font-medium">
                            {gender.roas.toFixed(1)}x ROAS
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Video Metrics (if available) */}
          {ads.videoMetrics && ads.videoMetrics.videoViews > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Video Performance</CardTitle>
                <CardDescription>
                  Instagram video ads engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 bg-gradient-to-br from-red-50 to-pink-100 rounded-lg">
                    <div className="text-2xl font-bold text-red-700">
                      {ads.videoMetrics.videoViews.toLocaleString()}
                    </div>
                    <div className="text-sm text-red-600">Video Views</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-yellow-100 rounded-lg">
                    <div className="text-2xl font-bold text-orange-700">
                      {ads.videoMetrics.videoWatches25Percent.toLocaleString()}
                    </div>
                    <div className="text-sm text-orange-600">
                      25% Completion
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-lime-100 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-700">
                      {ads.videoMetrics.videoWatches75Percent.toLocaleString()}
                    </div>
                    <div className="text-sm text-yellow-600">
                      75% Completion
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {ads.videoMetrics.videoAvgWatchPercentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-green-600">Avg. Watch %</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
