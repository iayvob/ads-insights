"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TwitterAnalytics } from "@/validations/analytics-types";

interface TwitterInsightsProps {
  data?: TwitterAnalytics;
  isLoading?: boolean;
  error?: string | null;
  canAccessAds?: boolean;
}

// Helper function to format numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

export function TwitterInsights({
  canAccessAds,
  data,
  isLoading,
  error,
}: TwitterInsightsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Twitter/X Insights</CardTitle>
          <CardDescription>Loading your Twitter analytics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Twitter/X Insights</CardTitle>
          <CardDescription>Error loading Twitter analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Twitter/X Insights</CardTitle>
          <CardDescription>No Twitter data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Connect your Twitter account to view insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderPostsAnalytics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800">Avg Impressions</h3>
        <p className="text-2xl font-bold text-blue-600">
          {formatNumber(data.posts?.avgImpressions || 0)}
        </p>
      </div>
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-semibold text-green-800">Avg Engagement</h3>
        <p className="text-2xl font-bold text-green-600">
          {formatNumber(data.posts?.avgEngagement || 0)}
        </p>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg">
        <h3 className="font-semibold text-purple-800">Avg Reach</h3>
        <p className="text-2xl font-bold text-purple-600">
          {formatNumber(data.posts?.avgReach || 0)}
        </p>
      </div>
      <div className="bg-orange-50 p-4 rounded-lg">
        <h3 className="font-semibold text-orange-800">Total Posts</h3>
        <p className="text-2xl font-bold text-orange-600">
          {formatNumber(data.posts?.totalPosts || 0)}
        </p>
      </div>
    </div>
  );

  const renderAdsAnalytics = () => {
    if (!canAccessAds) {
      return (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Premium Feature
            </h3>
            <p className="text-gray-600 mb-4">
              Twitter Ads analytics are available with our Premium plan.
            </p>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Upgrade to Premium
            </Badge>
          </div>
        </div>
      );
    }

    if (!data.ads) {
      return (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Data Available
            </h3>
            <p className="text-gray-600 mb-4">
              Twitter Ads analytics are not available.
            </p>
            <Badge variant="outline" className="bg-blue-50 text-red-700">
              Request Data
            </Badge>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-red-800">Total Spend</h3>
            <p className="text-2xl font-bold text-red-600">
              ${formatNumber(data.ads.totalSpend || 0)}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Total Impressions</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatNumber(data.ads.totalImpressions || 0)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Total Clicks</h3>
            <p className="text-2xl font-bold text-green-600">
              {formatNumber(data.ads.totalClicks || 0)}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">CTR</h3>
            <p className="text-2xl font-bold text-purple-600">
              {data.ads.ctr?.toFixed(2) || 0}%
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800">CPC</h3>
            <p className="text-2xl font-bold text-yellow-600">
              ${data.ads.cpc?.toFixed(2) || 0}
            </p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-semibold text-indigo-800">CPM</h3>
            <p className="text-2xl font-bold text-indigo-600">
              ${data.ads.cpm?.toFixed(2) || 0}
            </p>
          </div>
          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="font-semibold text-pink-800">ROAS</h3>
            <p className="text-2xl font-bold text-pink-600">
              {data.ads.roas?.toFixed(2) || 0}x
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Twitter/X Insights
          {data.posts && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Analytics and performance metrics for your Twitter/X presence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">Posts Analytics</TabsTrigger>
            <TabsTrigger value="ads">
              Ads Analytics
              {!data.ads && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Premium
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Organic Posts Performance
              </h3>
              {renderPostsAnalytics()}
            </div>
          </TabsContent>
          <TabsContent value="ads" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Advertising Performance
                {data.ads && (
                  <Badge
                    variant="outline"
                    className="ml-2 bg-blue-50 text-blue-700"
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
