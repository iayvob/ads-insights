'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartContainer } from '@/components/ui/chart';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  MousePointer,
  Percent,
  Users,
  Target,
  ChevronDown,
  Eye,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AdsAnalytics as BaseAdsAnalytics } from '@/validations/analytics-types';

// Extended AdsAnalytics interface with campaigns
interface AdsAnalytics extends BaseAdsAnalytics {
  campaigns?: Array<{
    id: string;
    name: string;
    status: string;
    budget: number;
    spend: number;
    reach: number;
    impressions: number;
    clicks: number;
    ctr: number;
    startDate: string;
    endDate: string | null;
  }>;
}
import { useState } from 'react';

interface AdsAnalyticsComponentProps {
  data: AdsAnalytics;
  platform: 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'amazon';
}

// Format numbers for display
const formatNumber = (num: number | undefined | null): string => {
  // Handle undefined, null, or NaN values
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }

  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

// Format currency
const formatCurrency = (amount: number | undefined | null): string => {
  // Handle undefined, null, or NaN values
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Get platform-specific colors
const getPlatformColors = (platform: string) => {
  switch (platform) {
    case 'facebook':
      return {
        primary: '#1877F2',
        secondary: '#4267B2',
        gradient: 'from-blue-600 to-blue-800',
        light: '#E7F0FF',
      };
    case 'instagram':
      return {
        primary: '#E4405F',
        secondary: '#8A3AB9',
        gradient: 'from-pink-500 via-purple-500 to-indigo-500',
        light: '#FEECF3',
      };
    case 'twitter':
      return {
        primary: '#1DA1F2',
        secondary: '#14171A',
        gradient: 'from-blue-400 to-blue-600',
        light: '#E8F5FE',
      };
    case 'tiktok':
      return {
        primary: '#00F2EA',
        secondary: '#FF0050',
        gradient: 'from-cyan-400 to-pink-500',
        light: '#E6FFFE',
      };
    case 'amazon':
      return {
        primary: '#FF9900',
        secondary: '#232F3E',
        gradient: 'from-orange-500 to-yellow-500',
        light: '#FFF4E6',
      };
    default:
      return {
        primary: '#6366F1',
        secondary: '#4F46E5',
        gradient: 'from-indigo-500 to-indigo-700',
        light: '#EEEEFF',
      };
  }
};

export function AdsAnalyticsComponent({
  data,
  platform,
}: AdsAnalyticsComponentProps) {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [chartView, setChartView] = useState<'spend' | 'performance'>(
    'performance'
  );

  // Handle null or undefined data
  if (!data) {
    console.warn(`No ads analytics data available for ${platform}`);
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {platform.charAt(0).toUpperCase() + platform.slice(1)} Ads Analytics
          </CardTitle>
          <CardDescription>
            No ads data available. This could be due to:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• No active ad campaigns</p>
            <p>• API connection issues</p>
            <p>• Insufficient permissions to access ads data</p>
            <p>• Premium subscription required for ads analytics</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Check the console for more detailed error information.
          </p>
        </CardContent>
      </Card>
    );
  }

  const colors = getPlatformColors(platform);

  // Prepare trend data for chart with limited data points based on selected range
  const getTrendData = () => {
    if (!data.spendTrend || data.spendTrend.length === 0) {
      console.warn(`No spend trend data available for ${platform} ads`);
      return [];
    }

    const rangeMap = { '7d': 7, '30d': 30, '90d': 90 };
    const dataPoints = rangeMap[dateRange];

    // If we have more data than needed, sample evenly
    if (data.spendTrend.length > dataPoints) {
      const step = Math.floor(data.spendTrend.length / dataPoints);
      return data.spendTrend
        .filter((_, index) => index % step === 0)
        .slice(0, dataPoints);
    }

    // Otherwise return all available data
    return data.spendTrend;
  };

  // Format data for charts with safety checks
  const trendData = getTrendData().map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    spend: item.spend || 0,
    impressions: item.impressions || 0,
    clicks: item.clicks || 0,
  }));

  // Calculate ROI/ROAS value with safety check
  const roasValue = data.roas || 0;

  // Prepare audience data for charts
  const ageGroupData =
    data.audienceInsights?.ageGroups?.map((item) => ({
      name: item.range,
      value: item.percentage,
    })) || [];

  const genderData =
    data.audienceInsights?.genders?.map((item) => ({
      name: item.gender,
      value: item.percentage,
    })) || [];

  const locationData =
    data.audienceInsights?.topLocations?.map((item) => ({
      name: item.location,
      value: item.percentage,
    })) || [];

  // Colors for charts
  const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884D8',
    '#82CA9D',
  ];

  // Custom tooltip for pie charts
  const CustomPieTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<any>;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 rounded shadow-md border border-gray-100">
          <p className="text-sm">{`${payload[0].name}: ${Number(payload[0].value).toFixed(1)}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Premium Badge and Date Range */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Badge
            variant="secondary"
            className={`bg-gradient-to-r ${colors.gradient} text-white`}
          >
            Premium Analytics
          </Badge>
          <p className="text-sm text-gray-500 mt-1">
            Advanced ad performance metrics for{' '}
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </p>
        </div>

        <Select
          defaultValue={dateRange}
          onValueChange={(value) => setDateRange(value as any)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className={`bg-gradient-to-br from-${platform}-50 to-${platform}-100 rounded-xl p-4 shadow-sm`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-r ${colors.gradient} flex items-center justify-center`}
            >
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium">Ad Spend</span>
          </div>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(data.totalSpend)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Total for selected period
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="bg-blue-50 rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium">Impressions</span>
          </div>
          <div className="text-2xl font-bold mt-2">
            {formatNumber(data.totalImpressions)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total ad views</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="bg-green-50 rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center">
              <MousePointer className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium">Clicks</span>
          </div>
          <div className="text-2xl font-bold mt-2">
            {formatNumber(data.totalClicks)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total ad clicks</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="bg-purple-50 rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center">
              <Percent className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium">CTR</span>
          </div>
          <div className="text-2xl font-bold mt-2">
            {(data.ctr || 0).toFixed(2)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">Click-through rate</p>
        </motion.div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Cost Per Click</div>
              <div className="text-3xl font-bold">
                {formatCurrency(data.cpc)}
              </div>
              <div className="flex items-center justify-center text-xs text-gray-500 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                Average for all campaigns
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Cost Per Mille</div>
              <div className="text-3xl font-bold">
                {formatCurrency(data.cpm)}
              </div>
              <div className="flex items-center justify-center text-xs text-gray-500 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                Cost per 1,000 impressions
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">ROAS</div>
              <div className="text-3xl font-bold">{roasValue.toFixed(2)}x</div>
              <div className="flex items-center justify-center text-xs text-gray-500 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1"></span>
                Return on ad spend
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends Chart - Enhanced */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                Performance Trends
              </CardTitle>
              <CardDescription>Ad performance over time</CardDescription>
            </div>
            <div className="flex gap-2 mt-2 sm:mt-0">
              <Button
                variant={chartView === 'performance' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartView('performance')}
                className={
                  chartView === 'performance'
                    ? `bg-gradient-to-r ${colors.gradient} text-white`
                    : ''
                }
              >
                Performance
              </Button>
              <Button
                variant={chartView === 'spend' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartView('spend')}
                className={
                  chartView === 'spend'
                    ? `bg-gradient-to-r ${colors.gradient} text-white`
                    : ''
                }
              >
                Spend
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[350px] mt-6">
            {chartView === 'performance' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#888' }}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#888' }}
                    dx={-10}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#888' }}
                    dx={10}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 shadow-md rounded-md border border-gray-100">
                            <p className="font-semibold text-gray-800">
                              {label}
                            </p>
                            <p className="text-blue-600">
                              <span className="font-medium">Impressions:</span>{' '}
                              {formatNumber(Number(payload[0].value || 0))}
                            </p>
                            <p className="text-green-600">
                              <span className="font-medium">Clicks:</span>{' '}
                              {formatNumber(Number(payload[1].value || 0))}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    name="Impressions"
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    yAxisId="left"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{
                      r: 8,
                      stroke: '#3b82f6',
                      strokeWidth: 1,
                      fill: '#fff',
                    }}
                  />
                  <Line
                    name="Clicks"
                    type="monotone"
                    dataKey="clicks"
                    stroke="#10b981"
                    strokeWidth={2}
                    yAxisId="right"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{
                      r: 8,
                      stroke: '#10b981',
                      strokeWidth: 1,
                      fill: '#fff',
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#888' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#888' }}
                    dx={-10}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 shadow-md rounded-md border border-gray-100">
                            <p className="font-semibold text-gray-800">
                              {label}
                            </p>
                            <p className="text-purple-600">
                              <span className="font-medium">Spend:</span>{' '}
                              {formatCurrency(Number(payload[0].value || 0))}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={colors.primary}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={colors.primary}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    name="Ad Spend"
                    type="monotone"
                    dataKey="spend"
                    stroke={colors.primary}
                    fillOpacity={1}
                    fill="url(#colorSpend)"
                    strokeWidth={2}
                    dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{
                      r: 8,
                      stroke: colors.primary,
                      strokeWidth: 1,
                      fill: '#fff',
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Campaigns */}
      {data.campaigns && data.campaigns.length > 0 && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              Top Campaigns
            </CardTitle>
            <CardDescription>Performance by campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Campaign
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">
                      Spend
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">
                      Impressions
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">
                      Clicks
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">
                      CTR
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.map((campaign, idx) => (
                    <motion.tr
                      key={campaign.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.1 }}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {campaign.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(campaign.spend)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(campaign.impressions)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(campaign.clicks)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(
                          (campaign.clicks / campaign.impressions) *
                          100
                        ).toFixed(2)}
                        %
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant={
                            campaign.status === 'ACTIVE'
                              ? 'default'
                              : 'secondary'
                          }
                          className={
                            campaign.status === 'ACTIVE'
                              ? 'bg-green-500 hover:bg-green-600 text-white'
                              : ''
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audience Insights */}
      {data.audienceInsights && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              Audience Demographics
            </CardTitle>
            <CardDescription>Who your ads are reaching</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Age Groups */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
                  Age Distribution
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ageGroupData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                          `${name}: ${value.toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ageGroupData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gender Distribution */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
                  Gender Distribution
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                          `${name}: ${value.toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genderData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name.toLowerCase() === 'female'
                                ? '#FF6B9F'
                                : entry.name.toLowerCase() === 'male'
                                  ? '#4169E1'
                                  : '#8884d8'
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Locations */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
                  Top Locations
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={locationData.slice(0, 5)}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value) => {
                          const numValue =
                            typeof value === 'number' ? value : Number(value);
                          return [`${numValue.toFixed(1)}%`, 'Percentage'];
                        }}
                        labelFormatter={(label) => `Location: ${label}`}
                      />
                      <Bar
                        dataKey="value"
                        fill={colors.primary}
                        radius={[0, 4, 4, 0]}
                      >
                        {locationData.slice(0, 5).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performing Ad */}
      {data.topAd && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              Top Performing Ad
            </CardTitle>
            <CardDescription>
              Your best performing advertisement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {data.topAd.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Published on{' '}
                    {new Date(data.topAd.date).toLocaleDateString()}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500">Ad Spend</div>
                      <div className="text-xl font-semibold">
                        {formatCurrency(data.topAd.spend)}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500">
                        Click-Through Rate
                      </div>
                      <div className="text-xl font-semibold">
                        {data.topAd.ctr.toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500">Impressions</div>
                      <div className="text-xl font-semibold">
                        {formatNumber(data.topAd.impressions)}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500">Clicks</div>
                      <div className="text-xl font-semibold">
                        {formatNumber(data.topAd.clicks)}
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Ad Details
                  </Button>
                </div>

                <div className="w-full md:w-64 flex items-center justify-center">
                  <div className="relative w-full aspect-square max-w-[200px] rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/40 to-orange-500/40"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                      <div className="font-semibold text-amber-800">
                        Performance
                      </div>
                      <div className="text-3xl font-bold text-orange-700">
                        {data.topAd.ctr.toFixed(1)}x
                      </div>
                      <div className="text-sm text-amber-700 mt-1">
                        above average
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// Additional icons
function Trophy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
