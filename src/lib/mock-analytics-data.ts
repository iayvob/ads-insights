import { FacebookAnalytics, InstagramAnalytics, TwitterAnalytics, TikTokAnalytics } from "@/validations/analytics-types"

// Generate mock analytics data for testing the new UI components
export function generateMockAnalyticsData() {
  const generateMockPostAnalytics = () => ({
    totalPosts: Math.floor(Math.random() * 50) + 10,
    avgEngagement: Math.floor(Math.random() * 1000) + 100,
    avgReach: Math.floor(Math.random() * 5000) + 500,
    avgImpressions: Math.floor(Math.random() * 10000) + 1000,
    topPost: {
      id: "mock_post_1",
      content: "This is our top performing post with amazing engagement and reach! #socialmedia #analytics",
      engagement: Math.floor(Math.random() * 2000) + 500,
      reach: Math.floor(Math.random() * 8000) + 1000,
      impressions: Math.floor(Math.random() * 15000) + 2000,
      date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      mediaType: 'image' as const
    },
    engagementTrend: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      engagement: Math.floor(Math.random() * 500) + 100,
      reach: Math.floor(Math.random() * 2000) + 300,
      impressions: Math.floor(Math.random() * 4000) + 600
    })),
    contentPerformance: [
      { type: 'image' as const, count: Math.floor(Math.random() * 20) + 5, avgEngagement: Math.floor(Math.random() * 300) + 100 },
      { type: 'video' as const, count: Math.floor(Math.random() * 15) + 2, avgEngagement: Math.floor(Math.random() * 500) + 200 },
      { type: 'carousel' as const, count: Math.floor(Math.random() * 10) + 1, avgEngagement: Math.floor(Math.random() * 400) + 150 },
      { type: 'text' as const, count: Math.floor(Math.random() * 8) + 1, avgEngagement: Math.floor(Math.random() * 200) + 50 }
    ]
  })

  const generateMockAdsAnalytics = () => ({
    totalSpend: Math.floor(Math.random() * 5000) + 500,
    totalReach: Math.floor(Math.random() * 50000) + 5000,
    totalImpressions: Math.floor(Math.random() * 100000) + 10000,
    totalClicks: Math.floor(Math.random() * 2000) + 200,
    cpm: Math.random() * 10 + 2,
    cpc: Math.random() * 5 + 0.5,
    ctr: Math.random() * 5 + 1,
    roas: Math.random() * 8 + 2,
    topAd: {
      id: "mock_ad_1",
      name: "Premium Campaign - Q4 2024",
      spend: Math.floor(Math.random() * 1000) + 100,
      reach: Math.floor(Math.random() * 10000) + 1000,
      impressions: Math.floor(Math.random() * 20000) + 2000,
      clicks: Math.floor(Math.random() * 500) + 50,
      ctr: Math.random() * 8 + 2,
      date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    spendTrend: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      spend: Math.floor(Math.random() * 200) + 50,
      reach: Math.floor(Math.random() * 2000) + 500,
      impressions: Math.floor(Math.random() * 4000) + 1000,
      clicks: Math.floor(Math.random() * 100) + 20
    })),
    audienceInsights: {
      ageGroups: [
        { range: "25-34", percentage: Math.floor(Math.random() * 20) + 25 },
        { range: "35-44", percentage: Math.floor(Math.random() * 15) + 20 },
        { range: "18-24", percentage: Math.floor(Math.random() * 15) + 15 },
        { range: "45-54", percentage: Math.floor(Math.random() * 10) + 10 },
        { range: "55+", percentage: Math.floor(Math.random() * 10) + 5 }
      ],
      genders: [
        { gender: "Female", percentage: Math.floor(Math.random() * 20) + 40 },
        { gender: "Male", percentage: Math.floor(Math.random() * 20) + 40 }
      ],
      topLocations: [
        { location: "United States", percentage: Math.floor(Math.random() * 20) + 30 },
        { location: "United Kingdom", percentage: Math.floor(Math.random() * 10) + 15 },
        { location: "Canada", percentage: Math.floor(Math.random() * 10) + 10 }
      ]
    }
  })

  const mockFacebookData: FacebookAnalytics = {
    posts: generateMockPostAnalytics(),
    ads: generateMockAdsAnalytics(),
    lastUpdated: new Date().toISOString(),
    pageData: {
      id: "mock_facebook_page",
      name: "Your Business Page",
      fan_count: Math.floor(Math.random() * 10000) + 1000,
      checkins: Math.floor(Math.random() * 500) + 50
    }
  }

  const mockInstagramData: InstagramAnalytics = {
    posts: generateMockPostAnalytics(),
    ads: generateMockAdsAnalytics(),
    lastUpdated: new Date().toISOString(),
    profile: {
      id: "mock_instagram_profile",
      username: "yourbusiness",
      followers_count: Math.floor(Math.random() * 15000) + 2000,
      media_count: Math.floor(Math.random() * 200) + 50
    }
  }

  const mockTwitterData: TwitterAnalytics = {
    posts: generateMockPostAnalytics(),
    ads: generateMockAdsAnalytics(),
    lastUpdated: new Date().toISOString(),
    profile: {
      id: "mock_twitter_profile",
      username: "yourbusiness",
      followers_count: Math.floor(Math.random() * 8000) + 500,
      tweet_count: Math.floor(Math.random() * 1000) + 100
    }
  }

  const mockTikTokData: TikTokAnalytics = {
    posts: generateMockPostAnalytics(),
    ads: generateMockAdsAnalytics(),
    lastUpdated: new Date().toISOString(),
    profile: {
      id: "mock_tiktok_profile",
      username: "yourbusiness",
      followers_count: Math.floor(Math.random() * 25000) + 3000,
      video_count: Math.floor(Math.random() * 150) + 25,
      likes_count: Math.floor(Math.random() * 50000) + 5000
    }
  }

  return {
    facebook: mockFacebookData,
    instagram: mockInstagramData,
    twitter: mockTwitterData,
    tiktok: mockTikTokData
  }
}

// For free users, remove ads data
export function filterDataForFreePlan(data: any) {
  return {
    ...data,
    ads: null
  }
}
