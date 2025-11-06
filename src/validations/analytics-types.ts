// Analytics data types for posts and ads insights

export interface PostAnalytics {
  totalPosts: number
  avgEngagement: number
  avgReach: number
  avgImpressions: number
  // Enhanced Post Metrics
  totalReach: number
  totalImpressions: number
  totalEngagements: number
  engagementRate: number
  // Post Performance Breakdown
  organicReach: number
  paidReach: number
  viralReach: number
  // Reaction Breakdown
  totalReactions: number
  reactionBreakdown: {
    like: number
    love: number
    wow: number
    haha: number
    sad: number
    angry: number
  }
  // Video Metrics (for video posts)
  videoMetrics?: {
    totalViews: number
    avgViewTime: number
    viewCompletionRate: number
    videoViewsUnique: number
    videoViews3s: number
    videoViews15s: number
    videoViews30s: number
    videoViews60s: number
    soundOnViews: number
    autoplayedViews: number
    clickToPlayViews: number
  }
  topPost?: {
    id: string
    content: string
    engagement: number
    reach: number
    impressions: number
    date: string
    mediaType?: 'image' | 'video' | 'carousel' | 'text'
    reactions: {
      like: number
      love: number
      wow: number
      haha: number
      sad: number
      angry: number
    }
    shares: number
    comments: number
    clicks: number
    // Video specific metrics if applicable
    videoViews?: number
    videoViewTime?: number
  }
  engagementTrend: Array<{
    date: string
    engagement: number
    reach: number
    impressions: number
    organicReach?: number
    paidReach?: number
    viralReach?: number
  }>
  contentPerformance: Array<{
    type: 'image' | 'video' | 'carousel' | 'text'
    count: number
    avgEngagement: number
    avgReach: number
    avgImpressions: number
    avgClicks: number
    engagementRate: number
  }>
  // Post Performance Analysis
  topPerformingPosts: Array<{
    id: string
    content: string
    engagement: number
    reach: number
    impressions: number
    date: string
    mediaType: 'image' | 'video' | 'carousel' | 'text'
    performanceScore: number
  }>
  // Content Insights
  contentInsights: {
    bestPerformingType: string
    optimalPostingHours: Array<{ hour: number; avgEngagement: number }>
    avgEngagementByType: Record<string, number>
    avgReachByType: Record<string, number>
  }
}

// Twitter-specific Post Analytics based on Twitter API v2
export interface TwitterPostAnalytics {
  totalPosts: number
  avgEngagement: number
  avgReach: number
  avgImpressions: number

  // Enhanced Twitter API v2 Metrics
  totalReach: number
  totalImpressions: number
  totalEngagements: number
  engagementRate: number

  // Twitter API v2 Public Metrics (available to all)
  publicMetrics: {
    totalRetweets: number
    totalReplies: number
    totalLikes: number
    totalQuotes: number
    totalBookmarks: number
    avgRetweets: number
    avgReplies: number
    avgLikes: number
    avgQuotes: number
    avgBookmarks: number
  }

  // Twitter API v2 Non-Public Metrics (requires user context authentication)
  nonPublicMetrics?: {
    totalImpressions: number
    totalUrlLinkClicks: number
    totalUserProfileClicks: number
    avgImpressions: number
    avgUrlLinkClicks: number
    avgUserProfileClicks: number
  }

  // Twitter API v2 Organic Metrics (requires user context authentication)
  organicMetrics?: {
    totalImpressions: number
    totalRetweets: number
    totalReplies: number
    totalLikes: number
    totalUserProfileClicks: number
    totalUrlLinkClicks: number
    avgImpressions: number
    avgRetweets: number
    avgReplies: number
    avgLikes: number
    avgUserProfileClicks: number
    avgUrlLinkClicks: number
  }

  // Twitter API v2 Promoted Metrics (requires user context authentication)
  promotedMetrics?: {
    totalImpressions: number
    totalRetweets: number
    totalReplies: number
    totalLikes: number
    totalUserProfileClicks: number
    totalUrlLinkClicks: number
    avgImpressions: number
    avgRetweets: number
    avgReplies: number
    avgLikes: number
    avgUserProfileClicks: number
    avgUrlLinkClicks: number
  }

  // Twitter-specific Media Metrics
  mediaMetrics?: {
    totalVideoViews: number
    avgVideoViews: number
    totalPhotoViews: number
    avgPhotoViews: number
    videoViewCompletionRate: number
  }

  // Top Performing Tweet
  topTweet?: {
    id: string
    text: string
    engagement: number
    impressions: number
    date: string
    mediaType?: 'text' | 'photo' | 'video' | 'animated_gif'
    metrics: {
      retweets: number
      replies: number
      likes: number
      quotes: number
      bookmarks?: number
      impressions?: number
      urlLinkClicks?: number
      userProfileClicks?: number
    }
  }

  // Twitter Engagement Trends
  engagementTrend: Array<{
    date: string
    engagement: number
    impressions: number
    retweets: number
    replies: number
    likes: number
    quotes: number
    bookmarks?: number
    urlLinkClicks?: number
    userProfileClicks?: number
  }>

  // Twitter Content Performance by Type
  contentPerformance: Array<{
    type: 'text' | 'photo' | 'video' | 'animated_gif'
    count: number
    avgEngagement: number
    avgImpressions: number
    avgRetweets: number
    avgReplies: number
    avgLikes: number
    avgQuotes: number
    avgBookmarks?: number
    engagementRate: number
  }>

  // Top Performing Tweets
  topPerformingTweets: Array<{
    id: string
    text: string
    engagement: number
    impressions: number
    date: string
    mediaType: 'text' | 'photo' | 'video' | 'animated_gif'
    performanceScore: number
    metrics: {
      retweets: number
      replies: number
      likes: number
      quotes: number
      bookmarks?: number
      impressions?: number
      urlLinkClicks?: number
      userProfileClicks?: number
    }
  }>

  // Twitter Content Insights
  contentInsights: {
    bestPerformingType: string
    optimalTweetingHours: Array<{ hour: number; avgEngagement: number }>
    avgEngagementByType: Record<string, number>
    avgImpressionsbyType: Record<string, number>
    hashtags: {
      topHashtags: Array<{ tag: string; usage: number; avgEngagement: number }>
      hashtagPerformance: Record<string, number>
    }
    mentions: {
      topMentions: Array<{ username: string; mentions: number; avgEngagement: number }>
      mentionPerformance: Record<string, number>
    }
  }

  // Authentication Status for Premium Metrics
  authenticationStatus: {
    hasUserContext: boolean
    accessLevel: 'public' | 'user_context' | 'full_access'
    availableMetrics: string[]
  }
}

// Instagram-specific Post Analytics based on Meta Graph API v23.0
export interface InstagramPostAnalytics {
  totalPosts: number
  avgEngagement: number
  avgReach: number
  avgImpressions: number
  // Enhanced Instagram Metrics
  totalReach: number
  totalImpressions: number
  totalEngagements: number
  engagementRate: number
  // Instagram Post Performance Breakdown
  organicReach: number
  paidReach: number
  viralReach: number
  // Instagram-specific metrics
  totalSaves: number
  avgSaves: number
  totalProfileViews: number
  websiteClicks: number
  emailClicks: number
  phoneCallClicks: number
  textMessageClicks: number
  getDirectionsClicks: number
  // Reactions (Instagram uses likes instead of Facebook's reaction types)
  totalReactions: number
  reactionBreakdown: {
    like: number
    love: number
    wow: number
    haha: number
    sad: number
    angry: number
  }
  // Video Metrics (for video posts and reels)
  videoMetrics?: {
    totalViews: number
    avgViewTime: number
    viewCompletionRate: number
    videoViewsUnique: number
    videoViews3s: number
    videoViews15s: number
    videoViews30s: number
    videoViews60s: number
    soundOnViews: number
    autoplayedViews: number
    clickToPlayViews: number
    replays: number
    shares: number
  }
  // Story Metrics
  storyMetrics?: {
    totalStoryImpressions: number
    totalStoryReach: number
    storyReplies: number
    storyForwardTaps: number
    storyBackTaps: number
    storyExits: number
    totalStoryViews: number
    avgStoryCompletionRate: number
  }
  // Audience Demographics
  audienceInsights: {
    ageGroups: Array<{ range: string; percentage: number }>
    genders: Array<{ gender: string; percentage: number }>
    topLocations: Array<{ location: string; percentage: number }>
    deviceTypes: Array<{ device: string; percentage: number }>
    followersGrowth: Array<{ date: string; count: number }>
  }
  topPost?: {
    id: string
    content: string // Use content instead of caption for compatibility
    engagement: number
    reach: number
    impressions: number
    date: string
    mediaType: 'image' | 'video' | 'carousel' | 'text' // Normalize to lowercase for compatibility
    // Instagram specific metrics
    likesCount: number
    commentsCount: number
    sharesCount: number
    savesCount: number
    // Required compatibility fields
    reactions: {
      like: number
      love: number
      wow: number
      haha: number
      sad: number
      angry: number
    }
    shares: number
    comments: number
    clicks: number
    // Video specific metrics
    videoViews?: number
    videoViewTime?: number
    // Instagram specific interactions
    profileViews?: number
    websiteClicks?: number
  }
  engagementTrend: Array<{
    date: string
    engagement: number
    reach: number
    impressions: number
    saves?: number
    profileViews?: number
    websiteClicks?: number
    organicReach?: number
    paidReach?: number
    viralReach?: number
  }>
  contentPerformance: Array<{
    type: 'image' | 'video' | 'carousel' | 'text' // Normalize to lowercase for compatibility
    count: number
    avgEngagement: number
    avgReach: number
    avgImpressions: number
    avgSaves?: number
    engagementRate: number
    avgVideoViews?: number
    avgClicks: number
  }>
  // Top Performing Posts
  topPerformingPosts: Array<{
    id: string
    content: string // Use content instead of caption for compatibility
    engagement: number
    reach: number
    impressions: number
    date: string
    mediaType: 'image' | 'video' | 'carousel' | 'text' // Normalize to lowercase for compatibility
    performanceScore: number
  }>
  // Enhanced Content Insights for Instagram
  contentInsights: {
    bestPerformingType: string
    optimalPostingHours: Array<{ hour: number; avgEngagement: number }>
    avgEngagementByType: Record<string, number>
    avgReachByType: Record<string, number>
  }
  // Hashtag Analytics
  hashtagInsights?: {
    topHashtags: Array<{ hashtag: string; usage: number; avgEngagement: number }>
    hashtagTrends: Array<{ date: string; hashtag: string; engagement: number }>
    recommendedHashtags: Array<{ hashtag: string; reason: string; potentialReach: number }>
  }
}

// Twitter/X Ads Analytics based on Twitter Ads API v12
export interface TwitterAdsAnalytics extends AdsAnalytics {
  // Twitter-specific campaign metrics
  twitterSpecificMetrics: {
    // Core Twitter engagement metrics
    retweets: number
    replies: number
    likes: number
    quotes: number
    follows: number
    unfollows: number

    // Twitter ad-specific actions
    promotedTweetEngagements: number
    cardEngagements: number
    linkClicks: number
    appOpens: number
    appInstalls: number

    // Video metrics for video ads
    videoViews: number
    videoQuartile25Views: number
    videoQuartile50Views: number
    videoQuartile75Views: number
    videoCompleteViews: number

    // Poll engagement (if applicable)
    pollCardVotes: number

    // Lead generation metrics
    leadGeneration: number
    emailSignups: number
  }

  // Twitter campaign performance breakdown
  campaignPerformance: Array<{
    id: string
    name: string
    status: 'ACTIVE' | 'PAUSED' | 'DELETED'
    objective: 'ENGAGEMENT' | 'FOLLOWERS' | 'WEBSITE_CLICKS' | 'AWARENESS' | 'VIDEO_VIEWS' | 'APP_INSTALLS' | 'LEAD_GENERATION'
    totalBudget: number
    dailyBudget: number
    spend: number
    impressions: number
    engagements: number
    clicks: number
    ctr: number
    cpe: number // Cost per engagement
    cpm: number
    startDate: string
    endDate: string
    bidAmount: number
    bidType: 'AUTO' | 'MAX' | 'TARGET'
    targeting: {
      locations: string[]
      languages: string[]
      ageRanges: string[]
      genders: string[]
      interests: string[]
      keywords: string[]
      followers: string[]
    }
  }>

  // Line item (ad group) performance
  lineItemPerformance: Array<{
    id: string
    name: string
    campaignId: string
    status: 'ACTIVE' | 'PAUSED' | 'DELETED'
    bidAmount: number
    spend: number
    impressions: number
    engagements: number
    clicks: number
    ctr: number
    cpe: number
    qualityScore: number
    optimizationTarget: string
  }>

  // Promoted tweet performance
  promotedTweetPerformance: Array<{
    id: string
    tweetId: string
    tweetText: string
    lineItemId: string
    spend: number
    impressions: number
    engagements: number
    retweets: number
    replies: number
    likes: number
    clicks: number
    ctr: number
    engagementRate: number
    mediaType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'GIF' | 'POLL'
    hasCard: boolean
    cardType?: string
  }>

  // Twitter audience insights
  twitterAudienceInsights: {
    demographics: {
      ageGroups: Array<{ range: string; percentage: number; spend: number; engagements: number }>
      genders: Array<{ gender: string; percentage: number; spend: number; engagements: number }>
      locations: Array<{ location: string; percentage: number; spend: number; engagements: number }>
      languages: Array<{ language: string; percentage: number; spend: number; engagements: number }>
    }
    interests: Array<{ interest: string; percentage: number; spend: number; engagements: number }>
    devices: Array<{ device: string; percentage: number; spend: number; engagements: number }>
    platforms: Array<{ platform: string; percentage: number; spend: number; engagements: number }>
    timeOfDay: Array<{ hour: number; engagements: number; impressions: number; spend: number }>
    dayOfWeek: Array<{ day: string; engagements: number; impressions: number; spend: number }>
  }

  // Conversion tracking
  conversionMetrics: {
    websiteClicks: { count: number; value: number }
    appInstalls: { count: number; value: number }
    appOpens: { count: number; value: number }
    leadGeneration: { count: number; value: number }
    purchases: { count: number; value: number }
    signups: { count: number; value: number }
    downloads: { count: number; value: number }
    customConversions: Array<{
      name: string
      count: number
      value: number
      conversionType: string
    }>
  }

  // Billing insights
  billingInsights: {
    totalBilledAmount: number
    currency: string
    billingPeriod: {
      startDate: string
      endDate: string
    }
    spendByObjective: Array<{
      objective: string
      spend: number
      percentage: number
    }>
    spendByBidType: Array<{
      bidType: string
      spend: number
      percentage: number
    }>
    costBreakdown: {
      mediaCost: number
      platformFee: number
      taxAmount: number
      totalCost: number
    }
  }

  // Video content metrics (for video ads)
  videoMetrics?: {
    totalVideoViews: number
    video25PercentViews: number
    video50PercentViews: number
    video75PercentViews: number
    video100PercentViews: number
    avgVideoViewTime: number
    avgVideoViewPercentage: number
    videoDownloads: number
    videoShares: number
    soundOnViews: number
    fullScreenViews: number
  }

  // Engagement quality metrics
  engagementQuality: {
    organicEngagements: number
    paidEngagements: number
    engagementRate: number
    qualityScore: number
    brandSafetyScore: number
    spamScore: number
    authenticityScore: number
  }
}

export interface AdsAnalytics {
  totalSpend: number
  totalReach: number
  totalImpressions: number
  totalClicks: number
  cpm: number // Cost per mille (thousand impressions)
  cpc: number // Cost per click
  ctr: number // Click-through rate
  roas: number // Return on ad spend
  topAd?: {
    id: string
    name: string
    spend: number
    reach: number
    impressions: number
    clicks: number
    ctr: number
    date: string
  }
  spendTrend: Array<{
    date: string
    spend: number
    reach: number
    impressions: number
    clicks: number
  }>
  audienceInsights: {
    ageGroups: Array<{ range: string; percentage: number }>
    genders: Array<{ gender: string; percentage: number }>
    topLocations: Array<{ location: string; percentage: number }>
  }
}

// Instagram-specific Ads Analytics based on Meta Graph API v23.0
export interface InstagramAdsAnalytics extends AdsAnalytics {
  // Optional error state for when no ads are available
  error?: {
    type: 'no_ads' | 'no_permissions' | 'api_error'
    message: string
  }

  // Instagram-specific ad metrics
  instagramSpecificMetrics: {
    // Instagram placement metrics
    storiesImpressions: number
    storiesReach: number
    storiesClicks: number
    storiesCtr: number

    // Instagram feed metrics  
    feedImpressions: number
    feedReach: number
    feedClicks: number
    feedCtr: number

    // Reels metrics
    reelsImpressions: number
    reelsReach: number
    reelsClicks: number
    reelsCtr: number

    // Shopping metrics
    catalogViews: number
    purchaseClicks: number
    addToCartClicks: number
    checkoutClicks: number
  }

  // Instagram ad actions
  instagramActions: {
    profileVisits: number
    websiteClicks: number
    callClicks: number
    emailClicks: number
    directionsClicks: number
    messageClicks: number
    leadSubmissions: number
    appInstalls: number
    videoViews: number
    postEngagements: number
    pageFollows: number
    linkClicks: number
  }

  // Creative performance for Instagram
  creativePerformance: Array<{
    id: string
    name: string
    type: 'single_image' | 'single_video' | 'carousel' | 'collection' | 'stories' | 'reels'
    impressions: number
    reach: number
    clicks: number
    spend: number
    ctr: number
    cpc: number
    cpm: number
    conversions: number
    roas: number
    qualityRanking: 'above_average' | 'average' | 'below_average' | null
    engagementRateRanking: 'above_average' | 'average' | 'below_average' | null
    conversionRateRanking: 'above_average' | 'average' | 'below_average' | null
  }>

  // Placement performance breakdown
  placementBreakdown: {
    instagram_stories: {
      impressions: number
      reach: number
      clicks: number
      spend: number
      ctr: number
      cpc: number
    }
    instagram_feed: {
      impressions: number
      reach: number
      clicks: number
      spend: number
      ctr: number
      cpc: number
    }
    instagram_reels: {
      impressions: number
      reach: number
      clicks: number
      spend: number
      ctr: number
      cpc: number
    }
    instagram_explore: {
      impressions: number
      reach: number
      clicks: number
      spend: number
      ctr: number
      cpc: number
    }
  }

  // Audience insights for ads
  adsAudienceInsights: {
    ageGroups: Array<{ range: string; percentage: number; spend: number; roas: number }>
    genders: Array<{ gender: string; percentage: number; spend: number; roas: number }>
    locations: Array<{ location: string; percentage: number; spend: number; roas: number }>
    interests: Array<{ interest: string; percentage: number; spend: number; roas: number }>
    behaviors: Array<{ behavior: string; percentage: number; spend: number; roas: number }>
    devices: Array<{ device: string; percentage: number; spend: number; roas: number }>
    platforms: Array<{ platform: string; percentage: number; spend: number; roas: number }>
  }

  // Conversion tracking
  conversionMetrics: {
    purchases: { count: number; value: number }
    addToCart: { count: number; value: number }
    initiateCheckout: { count: number; value: number }
    viewContent: { count: number; value: number }
    search: { count: number; value: number }
    lead: { count: number; value: number }
    completeRegistration: { count: number; value: number }
    subscribe: { count: number; value: number }
    customEvents: Array<{ name: string; count: number; value: number }>
  }

  // Video metrics for video ads
  videoMetrics: {
    videoViews: number
    videoWatches25Percent: number
    videoWatches50Percent: number
    videoWatches75Percent: number
    videoWatches100Percent: number
    videoAvgTimeWatched: number
    videoAvgWatchPercentage: number
    thumbStops: number
    videoPlaysToComplete: number
  }
}

// TikTok-specific Ads Analytics based on TikTok Business API v1.3
export interface TikTokAdsAnalytics extends AdsAnalytics {
  // TikTok Business API Core Metrics
  totalConversions: number
  conversionRate: number
  costPerConversion: number

  // TikTok Video Performance Metrics  
  videoPlayActions: number
  videoWatched2s: number
  videoWatched6s: number
  videoWatched25Percent: number
  videoWatched50Percent: number
  videoWatched75Percent: number
  videoWatched100Percent: number
  videoAvgWatchTime: number
  videoViewCompletionRate: number

  // TikTok Engagement Metrics
  profileVisits: number
  follows: number
  likes: number
  comments: number
  shares: number
  comments_rate: number
  shares_rate: number

  // TikTok App Activity Metrics
  appInstalls: number
  appEvents: number
  appEventsCost: number
  installRate: number

  // TikTok Creative Performance
  creativePerformance: Array<{
    creative_id: string
    creative_name: string
    ad_text: string
    video_id?: string
    image_url?: string
    impressions: number
    clicks: number
    spend: number
    ctr: number
    cpc: number
    cpm: number
    conversions: number
    video_play_actions: number
    video_watched_2s: number
    video_watched_6s: number
    likes: number
    comments: number
    shares: number
    profile_visits: number
    follows: number
  }>

  // Campaign Level Performance
  campaignPerformance: Array<{
    campaign_id: string
    campaign_name: string
    campaign_type: 'REACH' | 'TRAFFIC' | 'VIDEO_VIEWS' | 'LEAD_GENERATION' | 'ENGAGEMENT' | 'APP_PROMOTION' | 'CONVERSIONS'
    objective: string
    status: 'ACTIVE' | 'PAUSED' | 'DISABLED'
    budget_mode: 'BUDGET_MODE_DAY' | 'BUDGET_MODE_TOTAL'
    budget: number
    spend: number
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    cpm: number
    conversions: number
    cost_per_conversion: number
    roas: number
    start_date: string
    end_date?: string
  }>

  // Ad Group Level Performance  
  adGroupPerformance: Array<{
    adgroup_id: string
    adgroup_name: string
    campaign_id: string
    placement_type: 'PLACEMENT_TYPE_AUTOMATIC' | 'PLACEMENT_TYPE_TIKTOK' | 'PLACEMENT_TYPE_TOPBUZZ' | 'PLACEMENT_TYPE_HELO'
    audience_type: string
    optimization_goal: string
    bid_type: 'BID_TYPE_NO_BID' | 'BID_TYPE_LOWEST_COST_WITHOUT_CAP' | 'BID_TYPE_LOWEST_COST_WITH_CAP'
    bid_price?: number
    spend: number
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    cpm: number
    conversions: number
    frequency: number
    reach: number
  }>

  // TikTok Audience Insights
  audienceInsights: {
    ageGroups: Array<{
      range: string
      percentage: number
      impressions: number
      clicks: number
      spend: number
      conversions: number
      roas: number
    }>
    genders: Array<{
      gender: string
      percentage: number
      impressions: number
      clicks: number
      spend: number
      conversions: number
      roas: number
    }>
    topLocations: Array<{
      location: string
      percentage: number
      impressions: number
      clicks: number
      spend: number
      conversions: number
      roas: number
    }>
    // TikTok-specific audience data
    tiktokAudienceData: {
      interests: Array<{
        interest_category: string
        interest_name: string
        percentage: number
        performance_rating: 'HIGH' | 'MEDIUM' | 'LOW'
      }>
      devices: Array<{
        os: 'IOS' | 'ANDROID'
        percentage: number
        impressions: number
        clicks: number
        ctr: number
        conversions: number
      }>
      placements: Array<{
        placement: 'TikTok' | 'TopBuzz' | 'Helo' | 'BuzzVideo'
        impressions: number
        clicks: number
        spend: number
        ctr: number
        cpc: number
        conversions: number
      }>
    }
  }

  // Attribution Window Performance
  attributionMetrics: {
    attribution_window: '1d_click' | '7d_click' | '1d_view' | '7d_view'
    conversions_1d_click: number
    conversions_7d_click: number
    conversions_1d_view: number
    conversions_7d_view: number
    conversion_value_1d_click: number
    conversion_value_7d_click: number
    conversion_value_1d_view: number
    conversion_value_7d_view: number
  }

  // TikTok Shopping Metrics (if applicable)
  shoppingMetrics?: {
    catalog_sales: number
    catalog_value: number
    add_to_cart: number
    checkout_initiated: number
    purchase_value: number
    dynamic_product_ads_impressions: number
    dynamic_product_ads_clicks: number
    product_clicks: number
  }

  // Real-time Performance Insights
  performanceInsights: {
    delivery_status: 'DELIVERING' | 'UNDER_REVIEW' | 'REJECTED' | 'NOT_DELIVERING'
    learning_phase: 'LEARNING' | 'LEARNED' | 'LIMITED'
    budget_utilization: number
    auction_competitiveness: 'HIGH' | 'MEDIUM' | 'LOW'
    audience_saturation: number
    creative_fatigue_score: number
    recommendation_insights: Array<{
      type: 'BUDGET' | 'TARGETING' | 'CREATIVE' | 'BID'
      message: string
      potential_impact: 'HIGH' | 'MEDIUM' | 'LOW'
    }>
  }

  // Advanced Metrics for Business Analytics
  businessMetrics: {
    brand_awareness_lift: number
    ad_recall_lift: number
    purchase_intent_lift: number
    search_lift: number
    store_visits: number
    offline_conversions: number
    lifetime_value: number
    customer_acquisition_cost: number
  }

  // Authentication and Access Status
  authenticationStatus: {
    advertiser_id: string
    advertiser_name: string
    business_account_verified: boolean
    api_access_level: 'SANDBOX' | 'PRODUCTION'
    available_metrics: string[]
    data_freshness: string // ISO date
    rate_limit_remaining: number
  }
}

// Amazon-specific Ads Analytics based on Amazon Advertising API v3
export interface AmazonAdsAnalytics extends AdsAnalytics {
  // Amazon-specific advertising metrics
  acos: number // Advertising Cost of Sales - core Amazon metric
  tacos: number // Total Advertising Cost of Sales
  attributedSales1d: number // Sales attributed within 1 day
  attributedSales7d: number // Sales attributed within 7 days  
  attributedSales14d: number // Sales attributed within 14 days
  attributedSales30d: number // Sales attributed within 30 days

  // Amazon-specific conversion metrics
  attributedConversions1d: number
  attributedConversions7d: number
  attributedConversions14d: number
  attributedConversions30d: number

  // Amazon units and sales metrics
  attributedUnitsOrdered1d: number
  attributedUnitsOrdered7d: number
  attributedUnitsOrdered14d: number
  attributedUnitsOrdered30d: number

  // Amazon Sponsored Products Metrics
  sponsoredProductsMetrics: {
    totalCampaigns: number
    activeCampaigns: number
    pausedCampaigns: number
    totalAdGroups: number
    totalKeywords: number
    totalProductAds: number
    avgCpc: number
    avgAcos: number
    topPerformingAsin: string
    impressionShare: number
    searchTermImpressionShare: number
  }

  // Amazon Sponsored Brands Metrics  
  sponsoredBrandsMetrics: {
    totalCampaigns: number
    brandKeywords: number
    brandImpressions: number
    brandClicks: number
    brandSpend: number
    brandConversions: number
    brandDetailPageViews: number
    brandSales: number
    brandNewToBrandPurchases: number
    brandNewToBrandPercentage: number
  }

  // Amazon Sponsored Display Metrics
  sponsoredDisplayMetrics: {
    totalCampaigns: number
    displayImpressions: number
    displayClicks: number
    displaySpend: number
    displayConversions: number
    displaySales: number
    displayViewableImpressions: number
    displayViewabilityRate: number
    displayDetailPageViews: number
    displayPurchases: number
  }

  // Campaign Performance Breakdown
  campaignPerformance: Array<{
    campaignId: string
    campaignName: string
    campaignType: 'sponsoredProducts' | 'sponsoredBrands' | 'sponsoredDisplay'
    targetingType: 'manual' | 'auto' | 'keyword' | 'product' | 'audience'
    state: 'enabled' | 'paused' | 'archived'
    dailyBudget: number
    spend: number
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    acos: number
    roas: number
    orders: number
    sales: number
    conversions: number
    startDate: string
    endDate?: string
  }>

  // Ad Group Level Performance
  adGroupPerformance: Array<{
    adGroupId: string
    adGroupName: string
    campaignId: string
    campaignName: string
    state: 'enabled' | 'paused' | 'archived'
    defaultBid: number
    spend: number
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    acos: number
    orders: number
    sales: number
    conversions: number
  }>

  // Keyword Performance (for manual campaigns)
  keywordPerformance: Array<{
    keywordId: string
    keywordText: string
    adGroupId: string
    campaignId: string
    matchType: 'exact' | 'phrase' | 'broad'
    state: 'enabled' | 'paused' | 'archived'
    bid: number
    spend: number
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    acos: number
    orders: number
    sales: number
    conversions: number
    qualityScore?: number
  }>

  // Product Ads Performance
  productAdsPerformance: Array<{
    adId: string
    campaignId: string
    adGroupId: string
    asin: string
    sku: string
    state: 'enabled' | 'paused' | 'archived'
    spend: number
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    acos: number
    orders: number
    sales: number
    conversions: number
  }>

  // Search Terms Performance
  searchTermsAnalytics: Array<{
    searchTerm: string
    campaignId: string
    adGroupId: string
    keywordId?: string
    matchType: 'exact' | 'phrase' | 'broad' | 'auto'
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    spend: number
    acos: number
    orders: number
    sales: number
    conversions: number
  }>

  // Placement Performance (where ads are shown)
  placementPerformance: Array<{
    placement: 'top-of-search' | 'product-pages' | 'other'
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    spend: number
    acos: number
    orders: number
    sales: number
    conversions: number
    impressionShare: number
  }>

  // Audience Insights for Amazon DSP
  audienceInsights: {
    ageGroups: Array<{
      range: string
      percentage: number
      impressions: number
      clicks: number
      spend: number
      conversions: number
      acos: number
    }>
    genders: Array<{
      gender: string
      percentage: number
      impressions: number
      clicks: number
      spend: number
      conversions: number
      acos: number
    }>
    topLocations: Array<{
      location: string
      percentage: number
      impressions: number
      clicks: number
      spend: number
      conversions: number
      acos: number
    }>
    // Amazon-specific audience data
    amazonAudienceData: {
      shoppingBehaviors: Array<{
        behavior: string
        percentage: number
        performance_rating: 'HIGH' | 'MEDIUM' | 'LOW'
      }>
      interestCategories: Array<{
        category: string
        percentage: number
        acos: number
        roas: number
      }>
      lifestyleSegments: Array<{
        segment: string
        percentage: number
        avgOrderValue: number
        purchaseFrequency: number
      }>
    }
  }

  // Attribution Analysis
  attributionAnalysis: {
    viewThroughConversions: number
    clickThroughConversions: number
    assistedConversions: number
    directConversions: number
    crossDeviceConversions: number
    newToBrandConversions: number
    existingCustomerConversions: number
  }

  // Competitive Intelligence (if available)
  competitiveMetrics?: {
    impressionShare: number
    overlapRate: number
    outranking: number
    topOfPageRate: number
    averagePosition: number
    competitorBidLandscape: Array<{
      bidRange: string
      impressionShare: number
      avgCpc: number
    }>
  }

  // Amazon DSP Metrics (if using Amazon DSP)
  dspMetrics?: {
    programmaticImpressions: number
    programmaticClicks: number
    programmaticSpend: number
    programmaticConversions: number
    brandAwarenessLift: number
    purchaseIntentLift: number
    videoCompletionRate: number
    viewableImpressionRate: number
  }

  // Performance Optimization Insights
  optimizationInsights: {
    bidOptimizationOpportunities: Array<{
      target: string // keyword, product, or audience
      currentBid: number
      suggestedBid: number
      potentialImpact: 'HIGH' | 'MEDIUM' | 'LOW'
      reason: string
    }>
    budgetRecommendations: Array<{
      campaignId: string
      campaignName: string
      currentBudget: number
      suggestedBudget: number
      expectedImprovement: string
    }>
    keywordExpansion: Array<{
      suggestedKeyword: string
      searchVolume: number
      competition: 'HIGH' | 'MEDIUM' | 'LOW'
      suggestedBid: number
    }>
    negativeKeywordSuggestions: Array<{
      term: string
      reason: string
      estimatedSavings: number
    }>
  }

  // Amazon Ad Types Performance Summary
  adTypePerformance: {
    sponsoredProducts: {
      spend: number
      sales: number
      acos: number
      impressionShare: number
    }
    sponsoredBrands: {
      spend: number
      sales: number
      acos: number
      brandAwareness: number
    }
    sponsoredDisplay: {
      spend: number
      sales: number
      acos: number
      viewabilityRate: number
    }
    amazonDsp?: {
      spend: number
      sales: number
      acos: number
      brandLift: number
    }
  }

  // Historical Trends
  performanceTrends: {
    spendTrend: Array<{
      date: string
      totalSpend: number
      sponsoredProductsSpend: number
      sponsoredBrandsSpend: number
      sponsoredDisplaySpend: number
    }>
    acosTrend: Array<{
      date: string
      overallAcos: number
      sponsoredProductsAcos: number
      sponsoredBrandsAcos: number
      sponsoredDisplayAcos: number
    }>
    salesTrend: Array<{
      date: string
      totalSales: number
      organicSales: number
      advertisingSales: number
    }>
  }

  // Amazon Advertising Account Status
  accountStatus: {
    profileId: string
    profileName: string
    profileType: 'seller' | 'vendor' | 'agency'
    countryCode: string
    currencyCode: string
    timezone: string
    accountInfo: {
      marketplaceStringId: string
      sellerStringId?: string
      type: string
      name: string
      validPaymentMethod: boolean
    }
    accessLevels: {
      sponsoredProducts: boolean
      sponsoredBrands: boolean
      sponsoredDisplay: boolean
      amazonDsp: boolean
      stores: boolean
      posts: boolean
    }
  }

  // Data Quality and Freshness
  dataQuality: {
    lastUpdated: string
    dataCompleteness: number
    attributionWindowUsed: '1d' | '7d' | '14d' | '30d'
    includesWeekendData: boolean
    timeZone: string
    reportingDelay: number // hours
  }
}

export interface PlatformAnalytics {
  posts: PostAnalytics | TwitterPostAnalytics | InstagramPostAnalytics | null
  ads: AdsAnalytics | null // null for free users
  lastUpdated: string
}

export interface FacebookAnalytics extends PlatformAnalytics {
  pageData?: {
    id: string
    name: string
    fan_count: number
    checkins: number
  }
}

export interface InstagramAnalytics extends PlatformAnalytics {
  posts: PostAnalytics | InstagramPostAnalytics  // Support both for compatibility
  ads: AdsAnalytics | InstagramAdsAnalytics | null // Enhanced Instagram-specific ads analytics
  profile?: {
    id: string
    username: string
    followers_count: number
    media_count: number
    follows_count?: number
    biography?: string
    website?: string
    profile_picture_url?: string
    account_type?: 'PERSONAL' | 'BUSINESS' | 'CREATOR'
    business_discovery?: {
      category?: string
      contact_email?: string
      contact_phone_number?: string
      contact_address?: string
    }
  }
  // Instagram-specific metrics
  storyInsights?: {
    totalStoryImpressions: number
    totalStoryReach: number
    storyCompletionRate: number
    storyReplies: number
    storyShares: number
    storyExits: number
  }
  // Hashtag performance data
  hashtagAnalytics?: {
    topHashtags: Array<{ hashtag: string; usage: number; avgEngagement: number }>
    hashtagTrends: Array<{ date: string; engagement: number }>
    recommendedHashtags: Array<string>
  }
  // Instagram-specific engagement metrics
  instagramMetrics?: {
    totalSaves: number
    profileViews: number
    websiteClicks: number
    emailClicks: number
    phoneCallClicks: number
    getDirectionsClicks: number
  }
}

export interface TwitterAnalytics extends PlatformAnalytics {
  posts: TwitterPostAnalytics | null // Enhanced Twitter-specific posts analytics with Twitter API v2
  profile?: {
    id: string
    username: string
    followers_count: number
    tweet_count: number
  }
  ads: AdsAnalytics | TwitterAdsAnalytics | null // Enhanced Twitter-specific ads analytics
}

export interface TikTokAnalytics extends PlatformAnalytics {
  posts: TikTokPostAnalytics // Enhanced TikTok-specific posts analytics
  profile?: {
    id: string
    username: string
    followers_count: number
    video_count: number
    likes_count: number
  }
  ads: AdsAnalytics | null // Required by PlatformAnalytics - kept for backward compatibility
  ads_analytics?: TikTokAdsAnalytics | { error: string; message: string; hasAdvertiserAccess: boolean } | null // Enhanced TikTok-specific ads analytics
}

export interface AmazonAnalytics extends PlatformAnalytics {
  profile?: {
    id: string
    name: string
    marketplace?: string
    seller_id?: string
  }
  posts: AmazonPostAnalytics | null
  ads: AdsAnalytics | AmazonAdsAnalytics | null // Enhanced Amazon-specific ads analytics
  posts_analytics?: AmazonPostAnalytics | { error: string; message: string; hasSellerAccess: boolean } | null // Enhanced Amazon-specific posts analytics
  ads_analytics?: AmazonAdsAnalytics | { error: string; message: string; hasAdvertiserAccess: boolean } | null // Enhanced Amazon-specific ads analytics
}

// Amazon-specific posts analytics interface based on Amazon Selling Partner API and Amazon Advertising API
export interface AmazonPostAnalytics extends PostAnalytics {
  // Amazon-specific seller metrics
  sellerMetrics: {
    total_products: number
    active_listings: number
    inactive_listings: number
    suppressed_listings: number
    products_growth: number
    products_growth_rate: number
    total_reviews: number
    avg_review_rating: number
    total_orders: number
    orders_growth: number
    seller_rank: number
    seller_level: string // Individual, Professional
    brand_registry: boolean
    fba_enabled: boolean
    storefront_enabled: boolean
  }

  // Product listing analytics
  listingAnalytics: {
    total_listing_views: number
    avg_listing_views: number
    total_listing_sessions: number
    avg_listing_sessions: number
    total_listing_clicks: number
    avg_listing_clicks: number
    total_cart_adds: number
    avg_cart_adds: number
    total_purchases: number
    avg_purchases: number
    conversion_rate: number
    cart_abandonment_rate: number
    listing_engagement_metrics: {
      view_rate: number
      click_rate: number
      cart_add_rate: number
      purchase_rate: number
      review_rate: number
    }
    performance_by_category: {
      short_listings: { count: number; avg_views: number; avg_engagement: number }
      medium_listings: { count: number; avg_views: number; avg_engagement: number }
      premium_listings: { count: number; avg_views: number; avg_engagement: number }
    }
  }

  // Brand content analytics (A+ Content, Brand Store)
  brandContentAnalytics: {
    total_brand_views: number
    avg_brand_views: number
    total_brand_sessions: number
    avg_brand_sessions: number
    total_brand_clicks: number
    avg_brand_clicks: number
    total_brand_purchases: number
    avg_brand_purchases: number
    brand_conversion_rate: number
    brand_engagement_metrics: {
      view_rate: number
      click_rate: number
      purchase_rate: number
      follow_rate: number
      share_rate: number
    }
    content_performance: {
      a_plus_content: { views: number; engagement: number; conversion_rate: number }
      brand_store: { views: number; engagement: number; conversion_rate: number }
      enhanced_content: { views: number; engagement: number; conversion_rate: number }
    }
  }

  // Enhanced content insights
  contentInsights: {
    bestPerformingType: string
    optimalPostingHours: Array<{ hour: number; avgEngagement: number }>
    avgEngagementByType: Record<string, number>
    avgReachByType: Record<string, number>
    trending_categories: Array<{
      category_id: string
      category_name: string
      product_count: number
      avg_performance: number
    }>
    trending_keywords: Array<{
      keyword: string
      search_volume: number
      competition_level: string
      avg_performance: number
    }>
    seasonal_trends: Array<{
      period: string
      category: string
      performance_index: number
      growth_rate: number
    }>
    best_performing_content_types: Array<{
      content_type: string
      performance_score: number
      engagement_rate: number
    }>
    optimal_listing_hours: Array<{
      hour: number
      day_of_week: string
      avg_engagement: number
    }>
    pricing_insights: {
      avg_price_range: { min: number; max: number }
      price_optimization_score: number
      competitive_pricing_analysis: number
    }
  }

  // Audience insights
  audienceInsights: {
    customer_demographics: {
      age_distribution: Array<{ age_range: string; percentage: number }>
      gender_distribution: Array<{ gender: string; percentage: number }>
      income_distribution: Array<{ income_range: string; percentage: number }>
    }
    geographic_distribution: Array<{
      region: string
      country: string
      state?: string
      percentage: number
      sales_volume: number
    }>
    purchase_behavior: {
      repeat_customers: number
      avg_order_value: number
      purchase_frequency: number
      seasonal_patterns: Array<{
        season: string
        sales_multiplier: number
      }>
    }
    customer_satisfaction: {
      avg_rating: number
      review_sentiment: number
      return_rate: number
      complaint_rate: number
    }
  }

  // Top performing content
  topPerformingProducts: Array<{
    asin: string
    product_name: string
    category: string
    views: number
    sales: number
    revenue: number
    rating: number
    review_count: number
    performance_score: number
  }>

  topPerformingBrandContent: Array<{
    content_id: string
    content_type: string
    title: string
    views: number
    engagement: number
    conversion_rate: number
    performance_score: number
  }>

  // Growth metrics
  growthMetrics: {
    sales_growth_trend: Array<{
      date: string
      sales_count: number
      revenue: number
      growth_rate: number
    }>
    listing_growth_trend: Array<{
      date: string
      total_listings: number
      active_listings: number
      avg_performance: number
    }>
    customer_growth_trend: Array<{
      date: string
      new_customers: number
      repeat_customers: number
      customer_retention_rate: number
    }>
  }

  // Amazon-specific engagement metrics
  amazonEngagementMetrics: {
    avg_session_duration: number
    bounce_rate: number
    pages_per_session: number
    search_ranking_avg: number
    buy_box_percentage: number
    inventory_turnover: number
    listing_quality_score: number
    customer_service_score: number
  }

  // Performance benchmarks
  performanceBenchmarks: {
    category_benchmarks: {
      avg_conversion_rate: number
      avg_order_value: number
      avg_review_rating: number
      avg_sales_velocity: number
    }
    competitive_analysis: {
      market_share: number
      ranking_position: number
      price_competitiveness: number
      feature_comparison_score: number
    }
    optimization_opportunities: {
      listing_optimization_score: number
      pricing_optimization_score: number
      inventory_optimization_score: number
      marketing_optimization_score: number
    }
    improvement_suggestions: Array<{
      category: string
      suggestion: string
      impact_level: 'high' | 'medium' | 'low'
      effort_required: 'high' | 'medium' | 'low'
    }>
  }
}

// TikTok-specific posts analytics interface based on TikTok API v2
export interface TikTokPostAnalytics extends PostAnalytics {
  // TikTok-specific profile metrics
  profileMetrics: {
    total_followers: number
    followers_growth: number
    followers_growth_rate: number
    following_count: number
    total_likes: number
    likes_growth: number
    total_videos: number
    total_photos: number
    profile_views: number
    profile_views_growth: number
    verification_status: boolean
  }

  // Video-specific analytics
  videoAnalytics: {
    total_video_views: number
    avg_video_views: number
    total_video_likes: number
    avg_video_likes: number
    total_video_comments: number
    avg_video_comments: number
    total_video_shares: number
    avg_video_shares: number
    total_downloads: number
    avg_downloads: number
    video_completion_rate: number
    avg_watch_time: number
    // Video engagement breakdown
    video_engagement_metrics: {
      like_rate: number
      comment_rate: number
      share_rate: number
      download_rate: number
      view_completion_rate: number
    }
    // Video performance by duration
    performance_by_duration: {
      short_videos: { count: number; avg_views: number; avg_engagement: number } // < 15s
      medium_videos: { count: number; avg_views: number; avg_engagement: number } // 15-60s
      long_videos: { count: number; avg_views: number; avg_engagement: number } // > 60s
    }
  }

  // Photo-specific analytics (TikTok now supports photo posts)
  photoAnalytics: {
    total_photo_views: number
    avg_photo_views: number
    total_photo_likes: number
    avg_photo_likes: number
    total_photo_comments: number
    avg_photo_comments: number
    total_photo_shares: number
    avg_photo_shares: number
    photo_engagement_rate: number
    photo_interaction_metrics: {
      like_rate: number
      comment_rate: number
      share_rate: number
      swipe_rate: number
    }
  }

  // Enhanced content insights (extends base contentInsights)
  contentInsights: {
    bestPerformingType: string
    optimalPostingHours: { hour: number; avgEngagement: number }[]
    avgEngagementByType: Record<string, number>
    avgReachByType: Record<string, number>
    // TikTok-specific content insights
    trending_sounds: Array<{
      sound_id: string
      sound_title: string
      usage_count: number
      avg_performance: number
    }>
    trending_effects: Array<{
      effect_id: string
      effect_name: string
      usage_count: number
      avg_performance: number
    }>
    trending_hashtags: Array<{
      hashtag: string
      usage_count: number
      avg_views: number
      avg_engagement: number
    }>
    optimal_posting_times: Array<{
      day_of_week: string
      hour: number
      avg_views: number
      avg_engagement_rate: number
    }>
    best_performing_content_types: Array<{
      type: 'dance' | 'comedy' | 'education' | 'lifestyle' | 'music' | 'other'
      count: number
      avg_views: number
      avg_engagement: number
    }>
  }

  // Audience insights
  audienceInsights: {
    age_distribution: Array<{
      age_range: string
      percentage: number
      engagement_rate: number
    }>
    gender_distribution: Array<{
      gender: 'male' | 'female' | 'other'
      percentage: number
      engagement_rate: number
    }>
    geographic_distribution: Array<{
      country: string
      percentage: number
      avg_views: number
      engagement_rate: number
    }>
    activity_patterns: Array<{
      hour: number
      day_of_week: string
      activity_percentage: number
    }>
    device_insights: {
      mobile_percentage: number
      tablet_percentage: number
      desktop_percentage: number
    }
  }

  // Individual post performance
  topPerformingVideos: Array<{
    video_id: string
    title: string
    description: string
    create_time: number
    view_count: number
    like_count: number
    comment_count: number
    share_count: number
    download_count: number
    duration: number
    engagement_rate: number
    reach: number
    profile_visits_from_video: number
    follows_from_video: number
    performance_score: number
  }>

  topPerformingPhotos: Array<{
    photo_id: string
    title: string
    description: string
    create_time: number
    view_count: number
    like_count: number
    comment_count: number
    share_count: number
    engagement_rate: number
    reach: number
    profile_visits_from_photo: number
    follows_from_photo: number
    performance_score: number
  }>

  // Growth and trend analytics
  growthMetrics: {
    follower_growth_trend: Array<{
      date: string
      followers_count: number
      growth_rate: number
    }>
    engagement_trend: Array<{
      date: string
      total_views: number
      total_likes: number
      total_comments: number
      total_shares: number
      engagement_rate: number
    }>
    content_volume_trend: Array<{
      date: string
      videos_posted: number
      photos_posted: number
      avg_performance: number
    }>
  }

  // TikTok-specific engagement metrics
  tiktokEngagementMetrics: {
    duets_created: number
    stitches_created: number
    sounds_used_by_others: number
    effects_used_by_others: number
    mentions_received: number
    brand_tag_mentions: number
    user_generated_content: number
    viral_coefficient: number // How often content gets shared/recreated
  }

  // Performance benchmarks
  performanceBenchmarks: {
    industry_avg_views: number
    industry_avg_engagement_rate: number
    your_vs_industry_performance: number
    percentile_ranking: number
    improvement_suggestions: Array<{
      category: 'content' | 'timing' | 'hashtags' | 'engagement'
      suggestion: string
      impact_score: number
    }>
  }
}

export type AnalyticsType = 'posts' | 'ads'
export type PlatformType = 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'amazon'
