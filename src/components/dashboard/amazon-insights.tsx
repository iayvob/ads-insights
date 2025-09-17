'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AmazonAnalytics,
  AmazonPostAnalytics,
  AmazonAdsAnalytics,
} from '@/validations/analytics-types';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  Eye,
  Target,
  DollarSign,
  BarChart,
  Users,
  Search,
  Megaphone,
  AlertCircle,
} from 'lucide-react';
import { AmazonCharts } from './amazon-charts';

interface AmazonInsightsProps {
  data?: AmazonAnalytics & {
    postsAnalytics?: AmazonPostAnalytics;
    adsAnalytics?: AmazonAdsAnalytics;
    noAdsHistory?: boolean;
    noAdsHistoryMessage?: string;
    noAdsHistoryActions?: Array<{
      title: string;
      description: string;
      action: string;
      url?: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  };
  isLoading?: boolean;
  error?: string | null;
  canAccessAds?: boolean;
  analyticsType?: 'posts' | 'ads' | 'both';
}

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
    minimumFractionDigits: 2,
  }).format(amount);
};

// Helper function to format percentage
const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Helper component for metric cards
const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: any;
  color?: string;
  trend?: 'up' | 'down';
  trendValue?: number;
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    green: 'bg-green-50 text-green-800 border-green-200',
    orange: 'bg-orange-50 text-orange-800 border-orange-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  };

  return (
    <div
      className={`p-4 rounded-lg border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        {Icon && <Icon className="h-4 w-4 opacity-70" />}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs opacity-75">{subtitle}</p>}
        {trend && trendValue !== undefined && (
          <div className="flex items-center gap-1">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span
              className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatPercentage(Math.abs(trendValue))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export function AmazonInsights({
  canAccessAds,
  data,
  isLoading,
  error,
  analyticsType = 'both',
}: AmazonInsightsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Amazon Insights</CardTitle>
          <CardDescription>
            Loading your Amazon marketplace analytics...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Amazon Insights</CardTitle>
          <CardDescription>Error loading Amazon analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Badge variant="destructive">Connection Error</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Amazon Insights</CardTitle>
          <CardDescription>No Amazon data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              Connect your Amazon Seller account to view insights.
            </p>
            <Badge variant="outline">Not Connected</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const postsData = data.postsAnalytics;
  const adsData = data.adsAnalytics;

  // Comprehensive Posts Analytics Render Function
  const renderPostsAnalytics = () => {
    if (!postsData) {
      return (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No posts analytics data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Overview Metrics */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Overview</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Products"
              value={formatNumber(postsData.totalPosts)}
              subtitle="Active listings"
              icon={Package}
              color="blue"
              trend={
                postsData.growthMetrics?.sales_growth_trend[
                  postsData.growthMetrics.sales_growth_trend.length - 1
                ]?.growth_rate > 0
                  ? 'up'
                  : 'down'
              }
              trendValue={
                postsData.growthMetrics?.sales_growth_trend[
                  postsData.growthMetrics.sales_growth_trend.length - 1
                ]?.growth_rate || 0
              }
            />
            <MetricCard
              title="Total Impressions"
              value={formatNumber(postsData.totalImpressions)}
              subtitle="Product views"
              icon={Eye}
              color="green"
              trend={
                postsData.growthMetrics?.listing_growth_trend[
                  postsData.growthMetrics.listing_growth_trend.length - 1
                ]?.avg_performance > 0
                  ? 'up'
                  : 'down'
              }
              trendValue={
                postsData.growthMetrics?.listing_growth_trend[
                  postsData.growthMetrics.listing_growth_trend.length - 1
                ]?.avg_performance || 0
              }
            />
            <MetricCard
              title="Total Engagement"
              value={formatNumber(postsData.totalEngagements)}
              subtitle="Customer interactions"
              icon={Target}
              color="orange"
              trend={postsData.engagementRate > 0 ? 'up' : 'down'}
              trendValue={postsData.engagementRate}
            />
            <MetricCard
              title="Total Reach"
              value={formatNumber(postsData.totalReach)}
              subtitle="Unique viewers"
              icon={TrendingUp}
              color="purple"
              trend={
                postsData.growthMetrics?.customer_growth_trend[
                  postsData.growthMetrics.customer_growth_trend.length - 1
                ]?.customer_retention_rate > 50
                  ? 'up'
                  : 'down'
              }
              trendValue={
                postsData.growthMetrics?.customer_growth_trend[
                  postsData.growthMetrics.customer_growth_trend.length - 1
                ]?.customer_retention_rate || 0
              }
            />
          </div>
        </div>

        {/* Seller Metrics */}
        {postsData.sellerMetrics && (
          <div>
            <h4 className="text-lg font-semibold mb-4">Seller Performance</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Products"
                value={formatNumber(postsData.sellerMetrics.total_products)}
                subtitle="In catalog"
                color="blue"
              />
              <MetricCard
                title="Active Listings"
                value={formatNumber(postsData.sellerMetrics.active_listings)}
                subtitle="Currently live"
                color="green"
              />
              <MetricCard
                title="Orders Growth"
                value={formatPercentage(postsData.sellerMetrics.orders_growth)}
                subtitle="30-day trend"
                color="orange"
                trend={
                  postsData.sellerMetrics.orders_growth > 0 ? 'up' : 'down'
                }
                trendValue={postsData.sellerMetrics.orders_growth}
              />
              <MetricCard
                title="Avg Rating"
                value={
                  postsData.sellerMetrics.avg_review_rating?.toFixed(1) || '0.0'
                }
                subtitle={`${formatNumber(postsData.sellerMetrics.total_reviews)} reviews`}
                color="yellow"
              />
            </div>
          </div>
        )}

        {/* Listing Analytics */}
        {postsData.listingAnalytics && (
          <div>
            <h4 className="text-lg font-semibold mb-4">Listing Performance</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-4">
                <h5 className="font-semibold mb-3">Visibility Metrics</h5>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Search Views</span>
                      <span>
                        {formatNumber(
                          postsData.listingAnalytics.total_listing_views
                        )}
                      </span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Browse Views</span>
                      <span>
                        {formatNumber(
                          postsData.listingAnalytics.total_listing_sessions
                        )}
                      </span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Other Views</span>
                      <span>
                        {formatNumber(
                          postsData.listingAnalytics.total_listing_clicks
                        )}
                      </span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h5 className="font-semibold mb-3">Conversion Metrics</h5>
                <div className="space-y-3">
                  <MetricCard
                    title="Conversion Rate"
                    value={formatPercentage(
                      postsData.listingAnalytics.conversion_rate
                    )}
                    color="green"
                  />
                  <MetricCard
                    title="Cart Add Rate"
                    value={formatPercentage(
                      (postsData.listingAnalytics.total_cart_adds /
                        postsData.listingAnalytics.total_listing_views) *
                        100
                    )}
                    color="blue"
                  />
                </div>
              </Card>

              <Card className="p-4">
                <h5 className="font-semibold mb-3">Engagement</h5>
                <div className="space-y-3">
                  <MetricCard
                    title="Session Duration"
                    value={`${postsData.listingAnalytics.avg_listing_sessions}s`}
                    color="purple"
                  />
                  <MetricCard
                    title="Bounce Rate"
                    value={formatPercentage(
                      (postsData.listingAnalytics.total_listing_clicks /
                        postsData.listingAnalytics.total_listing_views) *
                        100
                    )}
                    color="orange"
                  />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Brand Content Analytics */}
        {postsData.brandContentAnalytics && (
          <div>
            <h4 className="text-lg font-semibold mb-4">
              Brand Content Performance
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="A+ Content Views"
                value={formatNumber(
                  postsData.brandContentAnalytics.total_brand_views
                )}
                subtitle="Enhanced content"
                color="blue"
              />
              <MetricCard
                title="Brand Store Sessions"
                value={formatNumber(
                  postsData.brandContentAnalytics.total_brand_sessions
                )}
                subtitle="Store visits"
                color="green"
              />
              <MetricCard
                title="Video Views"
                value={formatNumber(
                  postsData.brandContentAnalytics.content_performance
                    .a_plus_content.views
                )}
                subtitle="Product videos"
                color="orange"
              />
              <MetricCard
                title="Enhanced Images"
                value={formatNumber(
                  postsData.brandContentAnalytics.content_performance
                    .enhanced_content.views
                )}
                subtitle="Image interactions"
                color="purple"
              />
            </div>
          </div>
        )}

        {/* Top Performing Products */}
        {postsData.topPerformingProducts &&
          postsData.topPerformingProducts.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-4">
                Top Performing Products
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {postsData.topPerformingProducts
                  .slice(0, 6)
                  .map((product, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-sm line-clamp-2">
                          {product.product_name}
                        </h5>
                        <Badge variant="outline" className="ml-2">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Views:</span>
                          <span className="font-medium ml-1">
                            {formatNumber(product.views)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Sales:</span>
                          <span className="font-medium ml-1">
                            {formatNumber(product.sales)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Revenue:</span>
                          <span className="font-medium ml-1">
                            {formatCurrency(product.revenue)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Rating:</span>
                          <span className="font-medium ml-1">
                            {product.rating.toFixed(1)}⭐
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          )}

        {/* Audience Insights */}
        {postsData.audienceInsights && (
          <div>
            <h4 className="text-lg font-semibold mb-4">Audience Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-4">
                <h5 className="font-semibold mb-3">Demographics</h5>
                <div className="space-y-2">
                  {postsData.audienceInsights.customer_demographics.age_distribution
                    .slice(0, 4)
                    .map((group, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm">{group.age_range}</span>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={group.percentage}
                            className="w-16 h-2"
                          />
                          <span className="text-xs text-gray-500">
                            {formatPercentage(group.percentage)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              <Card className="p-4">
                <h5 className="font-semibold mb-3">Geographic Distribution</h5>
                <div className="space-y-2">
                  {postsData.audienceInsights.geographic_distribution
                    .slice(0, 4)
                    .map((state, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm">{state.region}</span>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={state.percentage}
                            className="w-16 h-2"
                          />
                          <span className="text-xs text-gray-500">
                            {formatPercentage(state.percentage)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              <Card className="p-4">
                <h5 className="font-semibold mb-3">Purchase Behavior</h5>
                <div className="space-y-3">
                  <MetricCard
                    title="Repeat Purchase Rate"
                    value={formatPercentage(
                      (postsData.audienceInsights.customer_satisfaction
                        .avg_rating /
                        5) *
                        100
                    )}
                    color="green"
                  />
                  <MetricCard
                    title="Avg Order Value"
                    value={formatCurrency(
                      postsData.audienceInsights.purchase_behavior
                        .avg_order_value
                    )}
                    color="blue"
                  />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Growth Metrics */}
        {postsData.growthMetrics && (
          <div>
            <h4 className="text-lg font-semibold mb-4">
              Growth Trends (30 Days)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Sales Growth"
                value={formatPercentage(
                  postsData.growthMetrics.sales_growth_trend?.[
                    postsData.growthMetrics.sales_growth_trend.length - 1
                  ]?.growth_rate || 0
                )}
                color="green"
                trend={
                  postsData.growthMetrics.sales_growth_trend?.[
                    postsData.growthMetrics.sales_growth_trend.length - 1
                  ]?.growth_rate > 0
                    ? 'up'
                    : 'down'
                }
                trendValue={
                  postsData.growthMetrics.sales_growth_trend?.[
                    postsData.growthMetrics.sales_growth_trend.length - 1
                  ]?.growth_rate || 0
                }
              />
              <MetricCard
                title="Traffic Growth"
                value={formatPercentage(
                  postsData.growthMetrics.listing_growth_trend?.[
                    postsData.growthMetrics.listing_growth_trend.length - 1
                  ]?.avg_performance || 0
                )}
                color="blue"
                trend={
                  postsData.growthMetrics.listing_growth_trend?.[
                    postsData.growthMetrics.listing_growth_trend.length - 1
                  ]?.avg_performance > 0
                    ? 'up'
                    : 'down'
                }
                trendValue={
                  postsData.growthMetrics.listing_growth_trend?.[
                    postsData.growthMetrics.listing_growth_trend.length - 1
                  ]?.avg_performance || 0
                }
              />
              <MetricCard
                title="Conversion Growth"
                value={formatPercentage(
                  postsData.listingAnalytics.conversion_rate
                )}
                color="orange"
                trend={
                  postsData.listingAnalytics.conversion_rate > 0 ? 'up' : 'down'
                }
                trendValue={postsData.listingAnalytics.conversion_rate}
              />
              <MetricCard
                title="New Customers"
                value={formatNumber(
                  postsData.growthMetrics.customer_growth_trend?.[
                    postsData.growthMetrics.customer_growth_trend.length - 1
                  ]?.new_customers || 0
                )}
                subtitle="This month"
                color="purple"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Comprehensive Ads Analytics Render Function
  const renderAdsAnalytics = () => {
    // Check if user has access to ads analytics
    if (!canAccessAds) {
      return (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Premium Feature
            </h3>
            <p className="text-gray-600 mb-4">
              Amazon Advertising analytics are available with our Premium plan.
            </p>
            <Badge variant="outline" className="bg-orange-50 text-orange-700">
              Upgrade to Premium
            </Badge>
          </div>
        </div>
      );
    }

    // Check for no ads history scenario
    if (data.noAdsHistory) {
      return (
        <div className="text-center py-8">
          <div className="bg-blue-50 rounded-lg p-6">
            <AlertCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-700 mb-2">
              No Advertising History
            </h3>
            <p className="text-blue-600 mb-6">
              {data.noAdsHistoryMessage ||
                'Start your first Amazon advertising campaign to see detailed insights here.'}
            </p>

            {data.noAdsHistoryActions && (
              <div className="space-y-3">
                {data.noAdsHistoryActions.map((action, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      action.priority === 'high'
                        ? 'border-blue-300 bg-blue-100'
                        : action.priority === 'medium'
                          ? 'border-yellow-300 bg-yellow-100'
                          : 'border-gray-300 bg-gray-100'
                    }`}
                  >
                    <h4 className="font-semibold text-sm mb-1">
                      {action.title}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2">
                      {action.description}
                    </p>
                    {action.url && (
                      <a
                        href={action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Learn more →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Check if ads data is available
    if (!adsData) {
      return (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <BarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Ads Data Available
            </h3>
            <p className="text-gray-600 mb-4">
              We couldn't load your advertising analytics. This might be because
              you don't have any active campaigns or there was an error fetching
              the data.
            </p>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              Data Not Available
            </Badge>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Overview Metrics */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Advertising Overview</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Spend"
              value={formatCurrency(adsData.totalSpend)}
              subtitle="Campaign investment"
              icon={DollarSign}
              color="red"
            />
            <MetricCard
              title="Total Impressions"
              value={formatNumber(adsData.totalImpressions)}
              subtitle="Ad views"
              icon={Eye}
              color="blue"
            />
            <MetricCard
              title="Total Clicks"
              value={formatNumber(adsData.totalClicks)}
              subtitle="User engagement"
              icon={Target}
              color="green"
            />
            <MetricCard
              title="CTR"
              value={formatPercentage(adsData.ctr)}
              subtitle="Click-through rate"
              icon={TrendingUp}
              color="purple"
            />
          </div>
        </div>

        {/* Performance Metrics */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Performance Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="CPC"
              value={formatCurrency(adsData.cpc)}
              subtitle="Cost per click"
              color="yellow"
            />
            <MetricCard
              title="CPM"
              value={formatCurrency(adsData.cpm)}
              subtitle="Cost per mille"
              color="orange"
            />
            <MetricCard
              title="ROAS"
              value={`${adsData.roas.toFixed(2)}x`}
              subtitle="Return on ad spend"
              color="green"
            />
            <MetricCard
              title="ACOS"
              value={formatPercentage(adsData.acos)}
              subtitle="Advertising cost of sales"
              color="blue"
            />
          </div>
        </div>

        {/* Amazon-Specific Metrics */}
        <div>
          <h4 className="text-lg font-semibold mb-4">
            Amazon Advertising Metrics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="TACOS"
              value={formatPercentage(adsData.tacos)}
              subtitle="Total advertising cost of sales"
              color="purple"
            />
            <MetricCard
              title="Attributed Sales (30d)"
              value={formatCurrency(adsData.attributedSales30d)}
              subtitle="Sales from ads"
              color="green"
            />
            <MetricCard
              title="Attributed Units (30d)"
              value={formatNumber(adsData.attributedUnitsOrdered30d)}
              subtitle="Units sold"
              color="blue"
            />
          </div>
        </div>

        {/* Campaign Performance */}
        {adsData.campaignPerformance &&
          adsData.campaignPerformance.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-4">
                Campaign Performance
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h5 className="font-semibold mb-3">
                    Top Performing Campaigns
                  </h5>
                  <div className="space-y-3">
                    {adsData.campaignPerformance
                      .slice(0, 5)
                      .map((campaign, index) => (
                        <div
                          key={campaign.campaignId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h6 className="font-medium text-sm">
                                {campaign.campaignName}
                              </h6>
                              <Badge variant="outline" className="text-xs">
                                {campaign.campaignType}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                              <span className="text-gray-500">
                                Spend:{' '}
                                <span className="font-medium">
                                  {formatCurrency(campaign.spend)}
                                </span>
                              </span>
                              <span className="text-gray-500">
                                ACOS:{' '}
                                <span className="font-medium">
                                  {formatPercentage(campaign.acos)}
                                </span>
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            #{index + 1}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h5 className="font-semibold mb-3">
                    Campaign Types Performance
                  </h5>
                  <div className="space-y-3">
                    {adsData.sponsoredProductsMetrics && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h6 className="font-medium text-sm text-blue-800 mb-2">
                          Sponsored Products
                        </h6>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <span className="text-blue-600">
                            Campaigns:{' '}
                            <span className="font-medium">
                              {adsData.sponsoredProductsMetrics.totalCampaigns}
                            </span>
                          </span>
                          <span className="text-blue-600">
                            Avg CPC:{' '}
                            <span className="font-medium">
                              {formatCurrency(
                                adsData.sponsoredProductsMetrics.avgCpc
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                    {adsData.sponsoredBrandsMetrics && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <h6 className="font-medium text-sm text-green-800 mb-2">
                          Sponsored Brands
                        </h6>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <span className="text-green-600">
                            Campaigns:{' '}
                            <span className="font-medium">
                              {adsData.sponsoredBrandsMetrics.totalCampaigns}
                            </span>
                          </span>
                          <span className="text-green-600">
                            Brand Sales:{' '}
                            <span className="font-medium">
                              {formatCurrency(
                                adsData.sponsoredBrandsMetrics.brandSales
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                    {adsData.sponsoredDisplayMetrics && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <h6 className="font-medium text-sm text-purple-800 mb-2">
                          Sponsored Display
                        </h6>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <span className="text-purple-600">
                            Campaigns:{' '}
                            <span className="font-medium">
                              {adsData.sponsoredDisplayMetrics.totalCampaigns}
                            </span>
                          </span>
                          <span className="text-purple-600">
                            Viewability:{' '}
                            <span className="font-medium">
                              {formatPercentage(
                                adsData.sponsoredDisplayMetrics
                                  .displayViewabilityRate
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

        {/* Keyword Performance */}
        {adsData.keywordPerformance &&
          adsData.keywordPerformance.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-4">Top Keywords</h4>
              <Card className="p-4">
                <div className="space-y-3">
                  {adsData.keywordPerformance
                    .slice(0, 8)
                    .map((keyword, index) => (
                      <div
                        key={keyword.keywordId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {keyword.keywordText}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {keyword.matchType}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs mt-1">
                            <span className="text-gray-500">
                              Clicks:{' '}
                              <span className="font-medium">
                                {formatNumber(keyword.clicks)}
                              </span>
                            </span>
                            <span className="text-gray-500">
                              CPC:{' '}
                              <span className="font-medium">
                                {formatCurrency(keyword.cpc)}
                              </span>
                            </span>
                            <span className="text-gray-500">
                              ACOS:{' '}
                              <span className="font-medium">
                                {formatPercentage(keyword.acos)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          )}

        {/* Optimization Insights */}
        {adsData.optimizationInsights && (
          <div>
            <h4 className="text-lg font-semibold mb-4">
              Optimization Opportunities
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-4">
                <h5 className="font-semibold mb-3 text-blue-600">
                  Bid Optimization
                </h5>
                <div className="space-y-2">
                  {adsData.optimizationInsights.bidOptimizationOpportunities
                    .slice(0, 3)
                    .map((opportunity, index) => (
                      <div key={index} className="p-2 bg-blue-50 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {opportunity.target}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              opportunity.potentialImpact === 'HIGH'
                                ? 'bg-red-100 text-red-700'
                                : opportunity.potentialImpact === 'MEDIUM'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                            }
                          >
                            {opportunity.potentialImpact}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {opportunity.reason}
                        </p>
                        <div className="text-xs mt-1">
                          Current: {formatCurrency(opportunity.currentBid)} →
                          Suggested: {formatCurrency(opportunity.suggestedBid)}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              <Card className="p-4">
                <h5 className="font-semibold mb-3 text-green-600">
                  Budget Recommendations
                </h5>
                <div className="space-y-2">
                  {adsData.optimizationInsights.budgetRecommendations
                    .slice(0, 3)
                    .map((recommendation, index) => (
                      <div key={index} className="p-2 bg-green-50 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {recommendation.campaignName}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {recommendation.expectedImprovement}
                        </p>
                        <div className="text-xs mt-1">
                          Current:{' '}
                          {formatCurrency(recommendation.currentBudget)} →
                          Suggested:{' '}
                          {formatCurrency(recommendation.suggestedBudget)}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Amazon Insights
          {data.postsAnalytics && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700">
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Comprehensive analytics and performance metrics for your Amazon
          marketplace presence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts Analytics</TabsTrigger>
            <TabsTrigger value="charts">
              Charts & Trends
              <Badge
                variant="outline"
                className="ml-2 text-xs bg-blue-50 text-blue-700"
              >
                Visual
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ads">
              Ads Analytics
              {!adsData && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Premium
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Product & Listing Performance
                </h3>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Available to All Users
                </Badge>
              </div>
              {renderPostsAnalytics()}
            </div>
          </TabsContent>
          <TabsContent value="charts" className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Visual Analytics & Insights
                </h3>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Advanced Visualizations
                </Badge>
              </div>
              {postsData ? (
                <AmazonCharts
                  data={postsData}
                  adsData={adsData}
                  showAdsCharts={!!adsData && canAccessAds}
                />
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No analytics data available for charts
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="ads" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Advertising Performance
                {adsData && (
                  <Badge
                    variant="outline"
                    className="ml-2 bg-orange-50 text-orange-700"
                  >
                    Premium Active
                  </Badge>
                )}
              </h3>
              {renderAdsAnalytics()}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
