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
import { TikTokAnalytics } from '@/validations/analytics-types';
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
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

interface TikTokInsightsProps {
  data?: TikTokAnalytics & {
    posts_analytics?: any; // Comprehensive posts analytics from the API
  };
  isLoading?: boolean;
  error?: string | null;
  canAccessAds?: boolean;
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

// Helper functions for chart colors and data
function getContentTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'dance':
      return '#ec4899'; // Pink
    case 'comedy':
      return '#f59e0b'; // Amber
    case 'education':
      return '#3b82f6'; // Blue
    case 'lifestyle':
      return '#8b5cf6'; // Purple
    case 'music':
      return '#ef4444'; // Red
    case 'video':
      return '#10b981'; // Emerald
    case 'photo':
      return '#06b6d4'; // Cyan
    default:
      return '#6b7280'; // Gray
  }
}

function getAgeGroupColor(range: string): string {
  switch (range) {
    case '13-17':
      return '#fbbf24'; // Yellow
    case '18-24':
      return '#34d399'; // Emerald
    case '25-34':
      return '#3b82f6'; // Blue
    case '35-44':
      return '#8b5cf6'; // Purple
    case '45+':
      return '#ef4444'; // Red
    default:
      return '#9ca3af'; // Gray
  }
}

function getDurationColor(type: string): string {
  switch (type) {
    case 'short':
      return '#10b981'; // Emerald
    case 'medium':
      return '#f59e0b'; // Amber
    case 'long':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
}

export function TikTokInsights({
  data,
  isLoading,
  error,
  canAccessAds,
}: TikTokInsightsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>TikTok Insights</CardTitle>
          <CardDescription>Loading your TikTok analytics...</CardDescription>
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
          <CardTitle>TikTok Insights</CardTitle>
          <CardDescription>Error loading TikTok analytics</CardDescription>
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
          <CardTitle>TikTok Insights</CardTitle>
          <CardDescription>No TikTok data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Connect your TikTok account to view insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderPostsAnalytics = () => {
    const postsData = data.posts_analytics || data.posts;

    if (!postsData) {
      return (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Posts Data Available
            </h3>
            <p className="text-gray-600 mb-4">
              Post content to see comprehensive analytics here.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="font-semibold text-pink-800">Total Posts</h3>
            <p className="text-2xl font-bold text-pink-600">
              {formatNumber(postsData.totalPosts || 0)}
            </p>
            <p className="text-xs text-pink-600 mt-1">
              {postsData.profileMetrics?.total_videos || 0} videos,{' '}
              {postsData.profileMetrics?.total_photos || 0} photos
            </p>
          </div>
          <div className="bg-cyan-50 p-4 rounded-lg">
            <h3 className="font-semibold text-cyan-800">Total Views</h3>
            <p className="text-2xl font-bold text-cyan-600">
              {formatNumber(
                (postsData.videoAnalytics?.total_video_views || 0) +
                  (postsData.photoAnalytics?.total_photo_views || 0)
              )}
            </p>
            <p className="text-xs text-cyan-600 mt-1">All content views</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">Engagement Rate</h3>
            <p className="text-2xl font-bold text-purple-600">
              {postsData.engagementRate?.toFixed(1) || '0.0'}%
            </p>
            <p className="text-xs text-purple-600 mt-1">Avg across all posts</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-800">Followers</h3>
            <p className="text-2xl font-bold text-orange-600">
              {formatNumber(postsData.profileMetrics?.total_followers || 0)}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              +{formatNumber(postsData.profileMetrics?.followers_growth || 0)}{' '}
              this month
            </p>
          </div>
        </div>

        {/* Video Analytics Section */}
        {postsData.videoAnalytics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                📹 Video Performance
                <Badge variant="outline" className="bg-pink-50 text-pink-700">
                  {postsData.videoAnalytics.performance_by_duration
                    ?.short_videos?.count || 0}{' '}
                  Short |
                  {postsData.videoAnalytics.performance_by_duration
                    ?.medium_videos?.count || 0}{' '}
                  Medium |
                  {postsData.videoAnalytics.performance_by_duration?.long_videos
                    ?.count || 0}{' '}
                  Long
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Avg Views</p>
                  <p className="text-xl font-bold text-red-700">
                    {formatNumber(postsData.videoAnalytics.avg_video_views)}
                  </p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Avg Likes</p>
                  <p className="text-xl font-bold text-blue-700">
                    {formatNumber(postsData.videoAnalytics.avg_video_likes)}
                  </p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">
                    Completion Rate
                  </p>
                  <p className="text-xl font-bold text-green-700">
                    {postsData.videoAnalytics.video_completion_rate.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">
                    Avg Watch Time
                  </p>
                  <p className="text-xl font-bold text-purple-700">
                    {postsData.videoAnalytics.avg_watch_time.toFixed(1)}s
                  </p>
                </div>
              </div>

              {/* Video Duration Performance */}
              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-gray-700">
                  Performance by Duration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Short (&lt;15s)
                      </span>
                      <Badge variant="secondary">
                        {postsData.videoAnalytics.performance_by_duration
                          ?.short_videos?.count || 0}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatNumber(
                        postsData.videoAnalytics.performance_by_duration
                          ?.short_videos?.avg_views || 0
                      )}{' '}
                      avg views
                    </p>
                    <p className="text-sm text-gray-600">
                      {postsData.videoAnalytics.performance_by_duration?.short_videos?.avg_engagement?.toFixed(
                        1
                      ) || 0}
                      % engagement
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Medium (15-60s)
                      </span>
                      <Badge variant="secondary">
                        {postsData.videoAnalytics.performance_by_duration
                          ?.medium_videos?.count || 0}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatNumber(
                        postsData.videoAnalytics.performance_by_duration
                          ?.medium_videos?.avg_views || 0
                      )}{' '}
                      avg views
                    </p>
                    <p className="text-sm text-gray-600">
                      {postsData.videoAnalytics.performance_by_duration?.medium_videos?.avg_engagement?.toFixed(
                        1
                      ) || 0}
                      % engagement
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Long (&gt;60s)
                      </span>
                      <Badge variant="secondary">
                        {postsData.videoAnalytics.performance_by_duration
                          ?.long_videos?.count || 0}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatNumber(
                        postsData.videoAnalytics.performance_by_duration
                          ?.long_videos?.avg_views || 0
                      )}{' '}
                      avg views
                    </p>
                    <p className="text-sm text-gray-600">
                      {postsData.videoAnalytics.performance_by_duration?.long_videos?.avg_engagement?.toFixed(
                        1
                      ) || 0}
                      % engagement
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Analytics Section (if available) */}
        {postsData.photoAnalytics &&
          postsData.photoAnalytics.total_photo_views > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📸 Photo Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-indigo-600 font-medium">
                      Avg Views
                    </p>
                    <p className="text-xl font-bold text-indigo-700">
                      {formatNumber(postsData.photoAnalytics.avg_photo_views)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-emerald-600 font-medium">
                      Avg Likes
                    </p>
                    <p className="text-xl font-bold text-emerald-700">
                      {formatNumber(postsData.photoAnalytics.avg_photo_likes)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-600 font-medium">
                      Engagement Rate
                    </p>
                    <p className="text-xl font-bold text-amber-700">
                      {postsData.photoAnalytics.photo_engagement_rate.toFixed(
                        1
                      )}
                      %
                    </p>
                  </div>
                  <div className="text-center p-3 bg-violet-50 rounded-lg">
                    <p className="text-sm text-violet-600 font-medium">
                      Swipe Rate
                    </p>
                    <p className="text-xl font-bold text-violet-700">
                      {postsData.photoAnalytics.photo_interaction_metrics?.swipe_rate?.toFixed(
                        1
                      ) || 0}
                      %
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Content Insights */}
        {postsData.contentInsights && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎵 Trending Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trending Sounds */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Top Sounds
                  </h4>
                  <div className="space-y-2">
                    {postsData.contentInsights.trending_sounds
                      ?.slice(0, 3)
                      .map((sound: any, index: number) => (
                        <div
                          key={sound.sound_id}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium truncate">
                            {sound.sound_title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {formatNumber(sound.usage_count)} uses
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Trending Hashtags */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Top Hashtags
                  </h4>
                  <div className="space-y-2">
                    {postsData.contentInsights.trending_hashtags
                      ?.slice(0, 3)
                      .map((hashtag: any, index: number) => (
                        <div
                          key={hashtag.hashtag}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium text-blue-600">
                            {hashtag.hashtag}
                          </span>
                          <div className="text-right">
                            <div className="text-xs text-gray-600">
                              {formatNumber(hashtag.avg_views)} avg views
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatNumber(hashtag.avg_engagement)} engagement
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Best Performing Content Types */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-700 mb-3">
                  Content Type Performance
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {postsData.contentInsights.best_performing_content_types?.map(
                    (type: any) => (
                      <div
                        key={type.type}
                        className="text-center p-3 border rounded-lg"
                      >
                        <div className="text-lg mb-1">
                          {type.type === 'dance'
                            ? '💃'
                            : type.type === 'comedy'
                              ? '😂'
                              : type.type === 'education'
                                ? '📚'
                                : type.type === 'lifestyle'
                                  ? '✨'
                                  : type.type === 'music'
                                    ? '🎵'
                                    : '📱'}
                        </div>
                        <p className="text-xs font-medium capitalize">
                          {type.type}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatNumber(type.avg_views)} avg views
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {type.count}
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performing Posts */}
        {(postsData.topPerformingVideos?.length > 0 ||
          postsData.topPerformingPhotos?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                🏆 Top Performing Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Top Videos */}
                {postsData.topPerformingVideos?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Top Videos
                    </h4>
                    <div className="space-y-2">
                      {postsData.topPerformingVideos
                        .slice(0, 3)
                        .map((video: any) => (
                          <div
                            key={video.video_id}
                            className="flex justify-between items-center p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm truncate">
                                {video.title || 'Untitled Video'}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {video.description}
                              </p>
                              <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                <span>
                                  {formatNumber(video.view_count)} views
                                </span>
                                <span>
                                  {formatNumber(video.like_count)} likes
                                </span>
                                <span>
                                  {formatNumber(video.comment_count)} comments
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-xs">
                                {video.engagement_rate.toFixed(1)}% engagement
                              </Badge>
                              <p className="text-xs text-gray-600 mt-1">
                                {video.duration}s duration
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Top Photos */}
                {postsData.topPerformingPhotos?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Top Photos
                    </h4>
                    <div className="space-y-2">
                      {postsData.topPerformingPhotos
                        .slice(0, 3)
                        .map((photo: any) => (
                          <div
                            key={photo.photo_id}
                            className="flex justify-between items-center p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm truncate">
                                {photo.title || 'Untitled Photo'}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {photo.description}
                              </p>
                              <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                <span>
                                  {formatNumber(photo.view_count)} views
                                </span>
                                <span>
                                  {formatNumber(photo.like_count)} likes
                                </span>
                                <span>
                                  {formatNumber(photo.comment_count)} comments
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-xs">
                                {photo.engagement_rate.toFixed(1)}% engagement
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audience Insights */}
        {postsData.audienceInsights && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">👥 Audience Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Age Distribution */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Age Distribution
                  </h4>
                  <div className="space-y-2">
                    {postsData.audienceInsights.age_distribution?.map(
                      (age: any) => (
                        <div
                          key={age.age_range}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium">
                            {age.age_range}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-bold">
                              {age.percentage.toFixed(1)}%
                            </span>
                            <div className="text-xs text-gray-600">
                              {age.engagement_rate.toFixed(1)}% engagement
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Gender Distribution */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Gender Distribution
                  </h4>
                  <div className="space-y-2">
                    {postsData.audienceInsights.gender_distribution?.map(
                      (gender: any) => (
                        <div
                          key={gender.gender}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium capitalize">
                            {gender.gender}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-bold">
                              {gender.percentage.toFixed(1)}%
                            </span>
                            <div className="text-xs text-gray-600">
                              {gender.engagement_rate.toFixed(1)}% engagement
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Device Insights */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Device Usage
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">📱 Mobile</span>
                      <span className="text-sm font-bold">
                        {postsData.audienceInsights.device_insights?.mobile_percentage.toFixed(
                          1
                        )}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">📱 Tablet</span>
                      <span className="text-sm font-bold">
                        {postsData.audienceInsights.device_insights?.tablet_percentage.toFixed(
                          1
                        )}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">💻 Desktop</span>
                      <span className="text-sm font-bold">
                        {postsData.audienceInsights.device_insights?.desktop_percentage.toFixed(
                          1
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Countries */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Top Countries
                  </h4>
                  <div className="space-y-2">
                    {postsData.audienceInsights.geographic_distribution
                      ?.slice(0, 4)
                      .map((country: any) => (
                        <div
                          key={country.country}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium">
                            {country.country}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-bold">
                              {country.percentage.toFixed(1)}%
                            </span>
                            <div className="text-xs text-gray-600">
                              {formatNumber(country.avg_views)} avg views
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Benchmarks & Recommendations */}
        {postsData.performanceBenchmarks && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                📊 Performance & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Performance vs Industry */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Performance vs Industry
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Your Performance</span>
                      <Badge
                        variant={
                          postsData.performanceBenchmarks
                            .your_vs_industry_performance > 1
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {postsData.performanceBenchmarks
                          .your_vs_industry_performance > 1
                          ? 'Above'
                          : 'Below'}{' '}
                        Average
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Percentile Ranking</span>
                      <span className="text-sm font-bold">
                        {postsData.performanceBenchmarks.percentile_ranking}th
                        percentile
                      </span>
                    </div>
                  </div>
                </div>

                {/* Improvement Suggestions */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Improvement Suggestions
                  </h4>
                  <div className="space-y-2">
                    {postsData.performanceBenchmarks.improvement_suggestions
                      ?.slice(0, 3)
                      .map((suggestion: any, index: number) => (
                        <div key={index} className="p-2 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {suggestion.category}
                            </Badge>
                            <span className="text-xs text-gray-600">
                              Impact: {suggestion.impact_score}/10
                            </span>
                          </div>
                          <p className="text-sm">{suggestion.suggestion}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Charts Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-700">
            📊 Advanced Analytics
          </h3>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Trend Chart */}
            {postsData.growthMetrics?.engagement_trend && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Engagement Trend (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      engagement_rate: {
                        label: 'Engagement Rate',
                        color: '#ec4899',
                      },
                      total_views: {
                        label: 'Total Views',
                        color: '#3b82f6',
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart
                        data={postsData.growthMetrics.engagement_trend}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) =>
                            new Date(value).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          }
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="engagement_rate"
                          stroke="#ec4899"
                          fill="#ec4899"
                          fillOpacity={0.3}
                          name="Engagement Rate (%)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Content Type Performance Chart */}
            {postsData.contentInsights?.best_performing_content_types && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Content Type Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      avg_views: {
                        label: 'Avg Views',
                        color: '#3b82f6',
                      },
                      avg_engagement: {
                        label: 'Avg Engagement',
                        color: '#10b981',
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={
                          postsData.contentInsights
                            .best_performing_content_types
                        }
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="avg_views"
                          fill="#3b82f6"
                          name="Avg Views"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Video Duration Performance Chart */}
            {postsData.videoAnalytics?.performance_by_duration && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Performance by Video Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      avg_views: {
                        label: 'Avg Views',
                        color: '#8b5cf6',
                      },
                      avg_engagement: {
                        label: 'Avg Engagement',
                        color: '#f59e0b',
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={[
                          {
                            duration: 'Short (<15s)',
                            avg_views:
                              postsData.videoAnalytics.performance_by_duration
                                .short_videos.avg_views,
                            avg_engagement:
                              postsData.videoAnalytics.performance_by_duration
                                .short_videos.avg_engagement,
                            count:
                              postsData.videoAnalytics.performance_by_duration
                                .short_videos.count,
                          },
                          {
                            duration: 'Medium (15-60s)',
                            avg_views:
                              postsData.videoAnalytics.performance_by_duration
                                .medium_videos.avg_views,
                            avg_engagement:
                              postsData.videoAnalytics.performance_by_duration
                                .medium_videos.avg_engagement,
                            count:
                              postsData.videoAnalytics.performance_by_duration
                                .medium_videos.count,
                          },
                          {
                            duration: 'Long (>60s)',
                            avg_views:
                              postsData.videoAnalytics.performance_by_duration
                                .long_videos.avg_views,
                            avg_engagement:
                              postsData.videoAnalytics.performance_by_duration
                                .long_videos.avg_engagement,
                            count:
                              postsData.videoAnalytics.performance_by_duration
                                .long_videos.count,
                          },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="duration" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="avg_views"
                          fill="#8b5cf6"
                          name="Avg Views"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Audience Age Distribution Pie Chart */}
            {postsData.audienceInsights?.age_distribution && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Audience Age Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      percentage: {
                        label: 'Percentage',
                        color: '#3b82f6',
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={postsData.audienceInsights.age_distribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ age_range, percentage }) =>
                            `${age_range}: ${percentage.toFixed(1)}%`
                          }
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="percentage"
                        >
                          {postsData.audienceInsights.age_distribution.map(
                            (entry: any, index: number) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={getAgeGroupColor(entry.age_range)}
                              />
                            )
                          )}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Follower Growth Trend */}
            {postsData.growthMetrics?.follower_growth_trend && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Follower Growth Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      followers_count: {
                        label: 'Followers',
                        color: '#10b981',
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart
                        data={postsData.growthMetrics.follower_growth_trend}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) =>
                            new Date(value).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          }
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="followers_count"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: '#10b981', strokeWidth: 2 }}
                          name="Followers"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Optimal Posting Times */}
            {postsData.contentInsights?.optimal_posting_times && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Optimal Posting Times
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      avg_engagement_rate: {
                        label: 'Engagement Rate',
                        color: '#f59e0b',
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={postsData.contentInsights.optimal_posting_times}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="day_of_week"
                          tickFormatter={(value) => value.substring(0, 3)}
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="avg_engagement_rate"
                          fill="#f59e0b"
                          name="Engagement Rate (%)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAdsAnalytics = () => {
    const adsData = data?.ads_analytics;

    // Check if there's an error or no ads history
    if (!adsData || (adsData && 'error' in adsData)) {
      const hasError = adsData && 'error' in adsData;
      return (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {hasError ? 'No Ads History Available' : 'Premium Feature'}
            </h3>
            <p className="text-gray-600 mb-4">
              {hasError
                ? 'No ad campaigns are currently running or advertiser access is required.'
                : 'TikTok Ads analytics are available with our Premium plan.'}
            </p>
            <Badge variant="outline" className="bg-pink-50 text-pink-700">
              {hasError ? 'Set up TikTok Ads' : 'Upgrade to Premium'}
            </Badge>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-red-800">Total Spend</h3>
            <p className="text-2xl font-bold text-red-600">
              ${formatNumber(adsData.totalSpend || 0)}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Total Impressions</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatNumber(adsData.totalImpressions || 0)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Total Clicks</h3>
            <p className="text-2xl font-bold text-green-600">
              {formatNumber(adsData.totalClicks || 0)}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">CTR</h3>
            <p className="text-2xl font-bold text-purple-600">
              {adsData.ctr?.toFixed(2) || 0}%
            </p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800">CPC</h3>
            <p className="text-2xl font-bold text-yellow-600">
              ${adsData.cpc?.toFixed(2) || 0}
            </p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-semibold text-indigo-800">CPM</h3>
            <p className="text-2xl font-bold text-indigo-600">
              ${adsData.cpm?.toFixed(2) || 0}
            </p>
          </div>
          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="font-semibold text-pink-800">ROAS</h3>
            <p className="text-2xl font-bold text-pink-600">
              {adsData.roas?.toFixed(2) || 0}x
            </p>
          </div>
        </div>

        {/* TikTok Specific Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-cyan-50 p-4 rounded-lg">
            <h3 className="font-semibold text-cyan-800">Total Conversions</h3>
            <p className="text-2xl font-bold text-cyan-600">
              {formatNumber(adsData.totalConversions || 0)}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-800">
              Video Play Actions
            </h3>
            <p className="text-2xl font-bold text-orange-600">
              {formatNumber(adsData.videoPlayActions || 0)}
            </p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-lg">
            <h3 className="font-semibold text-emerald-800">Likes</h3>
            <p className="text-2xl font-bold text-emerald-600">
              {formatNumber(adsData.likes || 0)}
            </p>
          </div>
          <div className="bg-violet-50 p-4 rounded-lg">
            <h3 className="font-semibold text-violet-800">Shares</h3>
            <p className="text-2xl font-bold text-violet-600">
              {formatNumber(adsData.shares || 0)}
            </p>
          </div>
        </div>

        {/* Video Performance */}
        {adsData.videoPlayActions > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Video Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">2s+ Views</p>
                  <p className="text-xl font-bold">
                    {formatNumber(adsData.videoWatched2s || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">6s+ Views</p>
                  <p className="text-xl font-bold">
                    {formatNumber(adsData.videoWatched6s || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-xl font-bold">
                    {adsData.videoViewCompletionRate?.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Avg Watch Time</p>
                  <p className="text-xl font-bold">
                    {adsData.videoAvgWatchTime?.toFixed(1) || 0}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performing Ad */}
        {adsData.topAd && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Performing Ad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{adsData.topAd.name}</p>
                  <p className="text-sm text-gray-600">
                    CTR: {adsData.topAd.ctr?.toFixed(2)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    ${formatNumber(adsData.topAd.spend)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatNumber(adsData.topAd.impressions)} impressions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Insights */}
        {adsData.performanceInsights?.recommendation_insights &&
          adsData.performanceInsights.recommendation_insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Performance Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {adsData.performanceInsights.recommendation_insights.map(
                    (rec, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Badge
                          variant={
                            rec.potential_impact === 'HIGH'
                              ? 'destructive'
                              : rec.potential_impact === 'MEDIUM'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {rec.type}
                        </Badge>
                        <p className="text-sm">{rec.message}</p>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          TikTok Insights
          {(data.posts || data.posts_analytics) && (
            <Badge variant="outline" className="bg-pink-50 text-pink-700">
              Connected
            </Badge>
          )}
          {data.posts_analytics && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Enhanced Analytics
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {data.posts_analytics
            ? 'Comprehensive analytics and performance metrics for your TikTok content'
            : 'Analytics and performance metrics for your TikTok presence'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">Posts Analytics</TabsTrigger>
            <TabsTrigger value="ads">
              Ads Analytics
              {!data?.ads_analytics && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Premium
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Content Performance</h3>
                {data.posts_analytics && (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700"
                  >
                    Enhanced Analytics Active
                  </Badge>
                )}
              </div>
              {renderPostsAnalytics()}
            </div>
          </TabsContent>
          <TabsContent value="ads" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Advertising Performance
                {data?.ads_analytics && !('error' in data.ads_analytics) && (
                  <Badge
                    variant="outline"
                    className="ml-2 bg-pink-50 text-pink-700"
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
