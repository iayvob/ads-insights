'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  AmazonPostAnalytics,
  AmazonAdsAnalytics,
} from '@/validations/analytics-types';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Eye,
  Target,
  DollarSign,
  BarChart3,
  Users,
  Search,
} from 'lucide-react';

interface AmazonChartsProps {
  data: AmazonPostAnalytics;
  adsData?: AmazonAdsAnalytics;
  showAdsCharts?: boolean;
}

// Chart color configurations
const chartConfig = {
  primary: {
    label: 'Primary',
    color: '#f97316', // Orange
  },
  secondary: {
    label: 'Secondary',
    color: '#0ea5e9', // Blue
  },
  success: {
    label: 'Success',
    color: '#22c55e', // Green
  },
  warning: {
    label: 'Warning',
    color: '#eab308', // Yellow
  },
  danger: {
    label: 'Danger',
    color: '#ef4444', // Red
  },
  info: {
    label: 'Info',
    color: '#8b5cf6', // Purple
  },
};

const COLORS = [
  '#f97316',
  '#0ea5e9',
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#8b5cf6',
];

// Helper function to format numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};

export function AmazonCharts({
  data,
  adsData,
  showAdsCharts = false,
}: AmazonChartsProps) {
  // Growth Metrics Trend Data (mocked 30-day trend)
  const growthTrendData = React.useMemo(() => {
    const days = 30;
    const baseDate = new Date();
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - (days - 1 - i));

      // Generate realistic growth curves
      const dayProgress = i / (days - 1);
      const salesGrowth =
        Math.sin(dayProgress * Math.PI * 2) * 5 +
        (data.growthMetrics?.sales_growth_trend?.[
          data.growthMetrics.sales_growth_trend.length - 1
        ]?.growth_rate || 0) *
          dayProgress;
      const trafficGrowth =
        Math.cos(dayProgress * Math.PI * 1.5) * 3 +
        (data.growthMetrics?.listing_growth_trend?.[
          data.growthMetrics.listing_growth_trend.length - 1
        ]?.avg_performance || 0) *
          dayProgress;
      const conversionGrowth =
        Math.sin(dayProgress * Math.PI * 3) * 2 +
        (data.listingAnalytics?.conversion_rate || 0) * dayProgress;

      return {
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        sales: salesGrowth,
        traffic: trafficGrowth,
        conversion: conversionGrowth,
      };
    });
  }, [data.growthMetrics]);

  // Product Performance Data
  const productPerformanceData = React.useMemo(() => {
    return (
      data.topPerformingProducts?.slice(0, 8).map((product, index) => ({
        name:
          product.product_name.slice(0, 20) +
          (product.product_name.length > 20 ? '...' : ''),
        sales: product.sales,
        revenue: product.revenue,
        views: product.views,
        rating: product.rating,
        index: index + 1,
      })) || []
    );
  }, [data.topPerformingProducts]);

  // Listing Analytics Data
  const listingAnalyticsData = React.useMemo(() => {
    if (!data.listingAnalytics) return [];

    return [
      {
        name: 'Total Views',
        value: data.listingAnalytics.total_listing_views,
        color: COLORS[0],
      },
      {
        name: 'Sessions',
        value: data.listingAnalytics.total_listing_sessions,
        color: COLORS[1],
      },
      {
        name: 'Clicks',
        value: data.listingAnalytics.total_listing_clicks,
        color: COLORS[2],
      },
    ];
  }, [data.listingAnalytics]);

  // Brand Content Performance Data
  const brandContentData = React.useMemo(() => {
    if (!data.brandContentAnalytics) return [];

    return [
      {
        category: 'A+ Content',
        views:
          data.brandContentAnalytics.content_performance.a_plus_content.views,
        engagement:
          data.brandContentAnalytics.content_performance.a_plus_content.views *
          0.15, // Estimated engagement
      },
      {
        category: 'Brand Store',
        views: data.brandContentAnalytics.total_brand_sessions,
        engagement: data.brandContentAnalytics.total_brand_sessions * 0.25,
      },
      {
        category: 'Enhanced Content',
        views:
          data.brandContentAnalytics.content_performance.enhanced_content.views,
        engagement:
          data.brandContentAnalytics.content_performance.enhanced_content
            .views * 0.35,
      },
      {
        category: 'Enhanced Images',
        views:
          data.brandContentAnalytics.content_performance.enhanced_content.views,
        engagement:
          data.brandContentAnalytics.content_performance.enhanced_content
            .views * 0.2,
      },
    ];
  }, [data.brandContentAnalytics]);

  // Audience Demographics Data
  const audienceDemographicsData = React.useMemo(() => {
    return (
      data.audienceInsights?.customer_demographics.age_distribution.map(
        (group, index) => ({
          ...group,
          color: COLORS[index % COLORS.length],
        })
      ) || []
    );
  }, [data.audienceInsights]);

  // Geographic Distribution Data
  const geographicData = React.useMemo(() => {
    return (
      data.audienceInsights?.geographic_distribution
        .slice(0, 6)
        .map((state, index) => ({
          ...state,
          color: COLORS[index % COLORS.length],
        })) || []
    );
  }, [data.audienceInsights]);

  // Seller Metrics Comparison Data
  const sellerMetricsData = React.useMemo(() => {
    if (!data.sellerMetrics) return [];

    return [
      {
        metric: 'Products',
        current: data.sellerMetrics.total_products,
        active: data.sellerMetrics.active_listings,
      },
      {
        metric: 'Performance',
        current: data.sellerMetrics.avg_review_rating * 20, // Scale for visualization
        active: data.sellerMetrics.total_reviews / 100, // Scale for visualization
      },
    ];
  }, [data.sellerMetrics]);

  // Engagement Metrics Data
  const engagementData = React.useMemo(() => {
    if (!data.amazonEngagementMetrics) return [];

    return [
      {
        name: 'Session Duration',
        value: data.amazonEngagementMetrics.avg_session_duration,
      },
      {
        name: 'Pages per Session',
        value: data.amazonEngagementMetrics.pages_per_session * 10,
      }, // Scale up
      {
        name: 'Click-through Rate',
        value: 100 - data.amazonEngagementMetrics.bounce_rate,
      }, // Invert for positive visualization
      {
        name: 'Search Ranking',
        value: 100 - data.amazonEngagementMetrics.search_ranking_avg,
      }, // Invert for positive visualization
    ];
  }, [data.amazonEngagementMetrics]);

  // Ads Analytics Data Processing
  const adsPerformanceTrendData = React.useMemo(() => {
    if (!adsData?.performanceTrends?.spendTrend) return [];

    return adsData.performanceTrends.spendTrend.slice(-30).map((trend) => ({
      date: new Date(trend.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      totalSpend: trend.totalSpend,
      sponsoredProducts: trend.sponsoredProductsSpend,
      sponsoredBrands: trend.sponsoredBrandsSpend,
      sponsoredDisplay: trend.sponsoredDisplaySpend,
    }));
  }, [adsData?.performanceTrends]);

  const acosPerformanceTrendData = React.useMemo(() => {
    if (!adsData?.performanceTrends?.acosTrend) return [];

    return adsData.performanceTrends.acosTrend.slice(-30).map((trend) => ({
      date: new Date(trend.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      overallAcos: trend.overallAcos,
      sponsoredProducts: trend.sponsoredProductsAcos,
      sponsoredBrands: trend.sponsoredBrandsAcos,
      sponsoredDisplay: trend.sponsoredDisplayAcos,
    }));
  }, [adsData?.performanceTrends]);

  const campaignPerformanceData = React.useMemo(() => {
    if (!adsData?.campaignPerformance) return [];

    return adsData.campaignPerformance.slice(0, 10).map((campaign) => ({
      name:
        campaign.campaignName.slice(0, 15) +
        (campaign.campaignName.length > 15 ? '...' : ''),
      spend: campaign.spend,
      sales: campaign.sales,
      acos: campaign.acos,
      roas: campaign.roas,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      type: campaign.campaignType,
    }));
  }, [adsData?.campaignPerformance]);

  const keywordPerformanceData = React.useMemo(() => {
    if (!adsData?.keywordPerformance) return [];

    return adsData.keywordPerformance.slice(0, 12).map((keyword) => ({
      keyword:
        keyword.keywordText.slice(0, 20) +
        (keyword.keywordText.length > 20 ? '...' : ''),
      spend: keyword.spend,
      clicks: keyword.clicks,
      cpc: keyword.cpc,
      acos: keyword.acos,
      sales: keyword.sales,
      matchType: keyword.matchType,
    }));
  }, [adsData?.keywordPerformance]);

  const placementPerformanceData = React.useMemo(() => {
    if (!adsData?.placementPerformance) return [];

    return adsData.placementPerformance.map((placement, index) => ({
      ...placement,
      color: COLORS[index % COLORS.length],
    }));
  }, [adsData?.placementPerformance]);

  const adTypePerformanceData = React.useMemo(() => {
    if (!adsData?.adTypePerformance) return [];

    return [
      {
        adType: 'Sponsored Products',
        spend: adsData.adTypePerformance.sponsoredProducts.spend,
        sales: adsData.adTypePerformance.sponsoredProducts.sales,
        acos: adsData.adTypePerformance.sponsoredProducts.acos,
        color: COLORS[0],
      },
      {
        adType: 'Sponsored Brands',
        spend: adsData.adTypePerformance.sponsoredBrands.spend,
        sales: adsData.adTypePerformance.sponsoredBrands.sales,
        acos: adsData.adTypePerformance.sponsoredBrands.acos,
        color: COLORS[1],
      },
      {
        adType: 'Sponsored Display',
        spend: adsData.adTypePerformance.sponsoredDisplay.spend,
        sales: adsData.adTypePerformance.sponsoredDisplay.sales,
        acos: adsData.adTypePerformance.sponsoredDisplay.acos,
        color: COLORS[2],
      },
      {
        adType: 'Amazon DSP',
        spend: adsData.adTypePerformance.amazonDsp?.spend || 0,
        sales: adsData.adTypePerformance.amazonDsp?.sales || 0,
        acos: adsData.adTypePerformance.amazonDsp?.acos || 0,
        color: COLORS[3],
      },
    ];
  }, [adsData?.adTypePerformance]);

  const audienceInsightsData = React.useMemo(() => {
    if (!adsData?.audienceInsights?.amazonAudienceData?.interestCategories)
      return [];

    return adsData.audienceInsights.amazonAudienceData.interestCategories.map(
      (category, index) => ({
        category: category.category,
        percentage: category.percentage,
        acos: category.acos,
        roas: category.roas,
        color: COLORS[index % COLORS.length],
      })
    );
  }, [adsData?.audienceInsights]);

  return (
    <div className="space-y-6">
      {/* Growth Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Growth Trends (30 Days)
            </CardTitle>
            <CardDescription>
              Track your sales, traffic, and conversion growth over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <LineChart data={growthTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke={chartConfig.primary.color}
                  strokeWidth={2}
                  name="Sales Growth (%)"
                />
                <Line
                  type="monotone"
                  dataKey="traffic"
                  stroke={chartConfig.secondary.color}
                  strokeWidth={2}
                  name="Traffic Growth (%)"
                />
                <Line
                  type="monotone"
                  dataKey="conversion"
                  stroke={chartConfig.success.color}
                  strokeWidth={2}
                  name="Conversion Growth (%)"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Listing Analytics Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Traffic Sources
            </CardTitle>
            <CardDescription>
              Distribution of product views by source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <PieChart>
                <Pie
                  data={listingAnalyticsData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={(entry) =>
                    `${entry.name}: ${formatNumber(entry.value)}`
                  }
                >
                  {listingAnalyticsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Product Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Top Products Performance
          </CardTitle>
          <CardDescription>
            Sales, revenue, and views for your best performing products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-96">
            <ComposedChart data={productPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                yAxisId="left"
                dataKey="sales"
                fill={chartConfig.primary.color}
                name="Sales"
              />
              <Bar
                yAxisId="left"
                dataKey="views"
                fill={chartConfig.secondary.color}
                name="Views"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke={chartConfig.success.color}
                strokeWidth={3}
                name="Revenue ($)"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Brand Content Performance */}
      {data.brandContentAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Brand Content Performance
            </CardTitle>
            <CardDescription>
              Engagement metrics for different types of brand content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <AreaChart data={brandContentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="views"
                  stackId="1"
                  stroke={chartConfig.primary.color}
                  fill={chartConfig.primary.color}
                  fillOpacity={0.6}
                  name="Views"
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stackId="1"
                  stroke={chartConfig.secondary.color}
                  fill={chartConfig.secondary.color}
                  fillOpacity={0.6}
                  name="Engagement"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Audience Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Demographics */}
        <Card>
          <CardHeader>
            <CardTitle>Age Demographics</CardTitle>
            <CardDescription>
              Customer age distribution for your products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <BarChart data={audienceDemographicsData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="age_range" type="category" width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="percentage"
                  fill={chartConfig.primary.color}
                  name="Percentage (%)"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Top states for your customer base</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <PieChart>
                <Pie
                  data={geographicData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="percentage"
                  label={(entry) =>
                    `${entry.region}: ${entry.percentage.toFixed(1)}%`
                  }
                >
                  {geographicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      {data.amazonEngagementMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Engagement Metrics
            </CardTitle>
            <CardDescription>
              Customer engagement and behavior metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="value"
                  fill={chartConfig.info.color}
                  name="Value"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance Scatter Plot */}
      {productPerformanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sales vs Views Correlation</CardTitle>
            <CardDescription>
              Understand the relationship between product views and sales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <ScatterChart data={productPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="views"
                  name="Views"
                  tickFormatter={formatNumber}
                />
                <YAxis
                  type="number"
                  dataKey="sales"
                  name="Sales"
                  tickFormatter={formatNumber}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value, name) => [
                    name === 'sales'
                      ? formatNumber(value as number)
                      : formatNumber(value as number),
                    name === 'sales' ? 'Sales' : 'Views',
                  ]}
                />
                <Scatter
                  dataKey="sales"
                  fill={chartConfig.primary.color}
                  name="Product Performance"
                />
              </ScatterChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Amazon Ads Analytics Charts */}
      {showAdsCharts && adsData && (
        <>
          {/* Ads Performance Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Ad Spend Trends
                </CardTitle>
                <CardDescription>
                  Daily advertising spend by campaign type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <AreaChart data={adsPerformanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={formatCurrency} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="sponsoredProducts"
                      stackId="1"
                      stroke={COLORS[0]}
                      fill={COLORS[0]}
                      fillOpacity={0.6}
                      name="Sponsored Products"
                    />
                    <Area
                      type="monotone"
                      dataKey="sponsoredBrands"
                      stackId="1"
                      stroke={COLORS[1]}
                      fill={COLORS[1]}
                      fillOpacity={0.6}
                      name="Sponsored Brands"
                    />
                    <Area
                      type="monotone"
                      dataKey="sponsoredDisplay"
                      stackId="1"
                      stroke={COLORS[2]}
                      fill={COLORS[2]}
                      fillOpacity={0.6}
                      name="Sponsored Display"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  ACOS Performance Trends
                </CardTitle>
                <CardDescription>
                  Advertising Cost of Sales by campaign type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <LineChart data={acosPerformanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `${value}%`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="overallAcos"
                      stroke={COLORS[0]}
                      strokeWidth={3}
                      name="Overall ACOS"
                    />
                    <Line
                      type="monotone"
                      dataKey="sponsoredProducts"
                      stroke={COLORS[1]}
                      strokeWidth={2}
                      name="Sponsored Products"
                    />
                    <Line
                      type="monotone"
                      dataKey="sponsoredBrands"
                      stroke={COLORS[2]}
                      strokeWidth={2}
                      name="Sponsored Brands"
                    />
                    <Line
                      type="monotone"
                      dataKey="sponsoredDisplay"
                      stroke={COLORS[3]}
                      strokeWidth={2}
                      name="Sponsored Display"
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Campaign Performance Analysis
              </CardTitle>
              <CardDescription>
                Performance metrics for top campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-80">
                <ComposedChart data={campaignPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" tickFormatter={formatCurrency} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    yAxisId="left"
                    dataKey="spend"
                    fill={COLORS[0]}
                    name="Spend"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="sales"
                    fill={COLORS[1]}
                    name="Sales"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="acos"
                    stroke={COLORS[2]}
                    strokeWidth={3}
                    name="ACOS (%)"
                  />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Ad Type Performance Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Ad Type Performance
                </CardTitle>
                <CardDescription>
                  Spend and sales distribution by ad type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <PieChart>
                    <Pie
                      data={adTypePerformanceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="spend"
                      label={(entry) =>
                        `${entry.adType}: ${formatCurrency(entry.spend)}`
                      }
                    >
                      {adTypePerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value) => [
                        formatCurrency(value as number),
                        'Spend',
                      ]}
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Placement Performance
                </CardTitle>
                <CardDescription>Performance by ad placement</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <BarChart data={placementPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="placement" />
                    <YAxis tickFormatter={formatCurrency} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="spend" fill={COLORS[0]} name="Spend" />
                    <Bar dataKey="sales" fill={COLORS[1]} name="Sales" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Keyword Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Keywords Performance
              </CardTitle>
              <CardDescription>
                Performance metrics for top performing keywords
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-80">
                <ComposedChart data={keywordPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="keyword"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis yAxisId="left" tickFormatter={formatCurrency} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    yAxisId="left"
                    dataKey="spend"
                    fill={COLORS[0]}
                    name="Spend"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="acos"
                    stroke={COLORS[2]}
                    strokeWidth={3}
                    name="ACOS (%)"
                  />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Audience Insights */}
          {audienceInsightsData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Audience Interest Categories
                </CardTitle>
                <CardDescription>
                  Performance by customer interest categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <BarChart data={audienceInsightsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(value) => `${value}%`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      yAxisId="left"
                      dataKey="percentage"
                      fill={COLORS[0]}
                      name="Audience %"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="acos"
                      stroke={COLORS[2]}
                      strokeWidth={3}
                      name="ACOS (%)"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
