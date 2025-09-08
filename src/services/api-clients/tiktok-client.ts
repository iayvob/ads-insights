import { logger } from "@/config/logger"

// TikTok API Base URLs
const TIKTOK_API_BASE = 'https://open.tiktokapis.com'
const TIKTOK_BUSINESS_API_BASE = 'https://business-api.tiktok.com'

// TikTok API interfaces based on official documentation
export interface TikTokProfile {
  open_id: string
  union_id: string
  display_name: string
  username: string
  avatar_url: string
  follower_count: number
  following_count: number
  likes_count: number
  video_count: number
  is_verified: boolean
}

export interface TikTokVideo {
  video_id: string
  title: string
  description: string
  cover_image_url: string
  duration: number
  height: number
  width: number
  create_time: number
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
  download_count: number
  privacy_level: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'
}

export interface TikTokPhoto {
  photo_id: string
  title: string
  description: string
  image_urls: string[]
  create_time: number
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
  privacy_level: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'
}

export interface TikTokInsights {
  profile_views: number
  video_views: number
  followers_count: number
  likes_count: number
  comments_count: number
  shares_count: number
  video_count: number
  photo_count: number
}

// TikTok Marketing API for Ads Analytics
export interface TikTokAdsInsights {
  campaign_id: string
  campaign_name: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number // Click-through rate
  cpc: number // Cost per click
  cpm: number // Cost per mille
  conversion_rate: number
  cost_per_conversion: number
  reach: number
  frequency: number
  video_play_actions: number
  video_watched_2s: number
  video_watched_6s: number
  profile_visits: number
  follows: number
  likes: number
  comments: number
  shares: number
}

export interface TikTokData {
  profile: TikTokProfile
  videos: TikTokVideo[]
  photos: TikTokPhoto[]
  insights: TikTokInsights
  ads_insights?: TikTokAdsInsights[] // Only for premium users
  lastUpdated: string
}

export interface TikTokCreatorInfo {
  creator_username: string
  creator_nickname: string
  creator_avatar_url: string
  privacy_level_options: string[]
  comment_disabled: boolean
  duet_disabled: boolean
  stitch_disabled: boolean
  max_video_post_duration_sec: number
}

export interface TikTokPostResponse {
  publish_id: string
  status: 'PROCESSING' | 'PUBLISHED' | 'FAILED'
  share_url?: string
  video_id?: string
  photo_id?: string
}

export class TikTokApiClient {
  private static readonly RATE_LIMIT_DELAY = 1000 // 1 second between requests

  /**
   * Fetch comprehensive TikTok data for dashboard
   */
  static async fetchData(accessToken: string): Promise<TikTokData> {
    try {
      logger.info("Starting TikTok data fetch", { hasToken: !!accessToken })

      const [profile, videos, photos, insights] = await Promise.allSettled([
        this.getUserProfile(accessToken),
        this.getUserVideos(accessToken),
        this.getUserPhotos(accessToken),
        this.getInsights(accessToken),
      ])

      const profileData = profile.status === 'fulfilled' ? profile.value : this.getDefaultProfile()
      const videosData = videos.status === 'fulfilled' ? videos.value : []
      const photosData = photos.status === 'fulfilled' ? photos.value : []
      const insightsData = insights.status === 'fulfilled' ? insights.value : this.getDefaultInsights()

      // Log any failures
      const failures = [profile, videos, photos, insights]
        .map((result, index) => ({ result, name: ['profile', 'videos', 'photos', 'insights'][index] }))
        .filter(({ result }) => result.status === 'rejected')

      if (failures.length > 0) {
        logger.warn("Some TikTok API calls failed", {
          failures: failures.map(({ name, result }) => ({
            endpoint: name,
            error: result.status === 'rejected' ? (result.reason?.message || 'Unknown error') : 'Unknown error'
          }))
        })
      }

      const data: TikTokData = {
        profile: profileData,
        videos: videosData,
        photos: photosData,
        insights: insightsData,
        lastUpdated: new Date().toISOString(),
      }

      logger.info("TikTok data fetch completed", {
        videosCount: videosData.length,
        photosCount: photosData.length,
        totalFollowers: profileData.follower_count,
      })

      return data

    } catch (error) {
      logger.error("Failed to fetch TikTok data", { error })
      throw new Error(`TikTok API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetch TikTok ads insights (Premium feature)
   */
  static async fetchAdsData(accessToken: string, advertiser_id: string): Promise<TikTokAdsInsights[]> {
    try {
      logger.info("Fetching TikTok ads insights", { advertiser_id })

      const response = await this.makeRequest(
        'GET',
        `${TIKTOK_BUSINESS_API_BASE}/open_api/v1.3/report/integrated/get/`,
        {
          'Access-Token': accessToken,
        },
        {
          advertiser_id,
          report_type: 'BASIC',
          data_level: 'AUCTION_CAMPAIGN',
          dimensions: ['campaign_id'],
          metrics: [
            'spend', 'impressions', 'clicks', 'conversions', 'ctr', 'cpc', 'cpm',
            'conversion_rate', 'cost_per_conversion', 'reach', 'frequency',
            'video_play_actions', 'video_watched_2s', 'video_watched_6s',
            'profile_visits', 'follows', 'likes', 'comments', 'shares'
          ],
          start_date: this.getDateDaysAgo(30),
          end_date: this.getDateToday(),
          page: 1,
          page_size: 1000,
        }
      )

      const insights: TikTokAdsInsights[] = response.data?.list?.map((item: any) => ({
        campaign_id: item.dimensions?.campaign_id || '',
        campaign_name: item.dimensions?.campaign_name || '',
        spend: parseFloat(item.metrics?.spend || '0'),
        impressions: parseInt(item.metrics?.impressions || '0'),
        clicks: parseInt(item.metrics?.clicks || '0'),
        conversions: parseInt(item.metrics?.conversions || '0'),
        ctr: parseFloat(item.metrics?.ctr || '0'),
        cpc: parseFloat(item.metrics?.cpc || '0'),
        cpm: parseFloat(item.metrics?.cpm || '0'),
        conversion_rate: parseFloat(item.metrics?.conversion_rate || '0'),
        cost_per_conversion: parseFloat(item.metrics?.cost_per_conversion || '0'),
        reach: parseInt(item.metrics?.reach || '0'),
        frequency: parseFloat(item.metrics?.frequency || '0'),
        video_play_actions: parseInt(item.metrics?.video_play_actions || '0'),
        video_watched_2s: parseInt(item.metrics?.video_watched_2s || '0'),
        video_watched_6s: parseInt(item.metrics?.video_watched_6s || '0'),
        profile_visits: parseInt(item.metrics?.profile_visits || '0'),
        follows: parseInt(item.metrics?.follows || '0'),
        likes: parseInt(item.metrics?.likes || '0'),
        comments: parseInt(item.metrics?.comments || '0'),
        shares: parseInt(item.metrics?.shares || '0'),
      })) || []

      logger.info("TikTok ads insights fetched successfully", { campaignsCount: insights.length })
      return insights

    } catch (error) {
      logger.error("Failed to fetch TikTok ads insights", { error, advertiser_id })
      throw new Error(`TikTok Ads API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get user profile information
   */
  private static async getUserProfile(accessToken: string): Promise<TikTokProfile> {
    const response = await this.makeRequest(
      'GET',
      `${TIKTOK_API_BASE}/v2/user/info/`,
      {
        'Authorization': `Bearer ${accessToken}`,
      },
      {
        fields: 'open_id,union_id,avatar_url,display_name,username,follower_count,following_count,likes_count,video_count,is_verified'
      }
    )

    await this.delay()

    return {
      open_id: response.data?.user?.open_id || '',
      union_id: response.data?.user?.union_id || '',
      display_name: response.data?.user?.display_name || '',
      username: response.data?.user?.username || '',
      avatar_url: response.data?.user?.avatar_url || '',
      follower_count: response.data?.user?.follower_count || 0,
      following_count: response.data?.user?.following_count || 0,
      likes_count: response.data?.user?.likes_count || 0,
      video_count: response.data?.user?.video_count || 0,
      is_verified: response.data?.user?.is_verified || false,
    }
  }

  /**
   * Get user videos
   */
  private static async getUserVideos(accessToken: string, limit = 20): Promise<TikTokVideo[]> {
    const response = await this.makeRequest(
      'POST',
      `${TIKTOK_API_BASE}/v2/video/list/`,
      {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      {
        max_count: limit,
        cursor: 0,
        fields: 'video_id,title,cover_image_url,duration,height,width,create_time,view_count,like_count,comment_count,share_count,download_count'
      }
    )

    await this.delay()

    return response.data?.videos?.map((video: any) => ({
      video_id: video.video_id || '',
      title: video.title || '',
      description: video.description || '',
      cover_image_url: video.cover_image_url || '',
      duration: video.duration || 0,
      height: video.height || 0,
      width: video.width || 0,
      create_time: video.create_time || 0,
      view_count: video.view_count || 0,
      like_count: video.like_count || 0,
      comment_count: video.comment_count || 0,
      share_count: video.share_count || 0,
      download_count: video.download_count || 0,
      privacy_level: video.privacy_level || 'PUBLIC_TO_EVERYONE',
    })) || []
  }

  /**
   * Get user photos (TikTok now supports photo posts)
   */
  private static async getUserPhotos(accessToken: string, limit = 20): Promise<TikTokPhoto[]> {
    try {
      // Note: Photo content API might not be available for all developers yet
      const response = await this.makeRequest(
        'POST',
        `${TIKTOK_API_BASE}/v2/content/list/`,
        {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        {
          max_count: limit,
          cursor: 0,
          content_type: 'PHOTO',
          fields: 'content_id,title,description,image_urls,create_time,view_count,like_count,comment_count,share_count'
        }
      )

      await this.delay()

      return response.data?.content?.map((photo: any) => ({
        photo_id: photo.content_id || '',
        title: photo.title || '',
        description: photo.description || '',
        image_urls: photo.image_urls || [],
        create_time: photo.create_time || 0,
        view_count: photo.view_count || 0,
        like_count: photo.like_count || 0,
        comment_count: photo.comment_count || 0,
        share_count: photo.share_count || 0,
        privacy_level: photo.privacy_level || 'PUBLIC_TO_EVERYONE',
      })) || []

    } catch (error) {
      // Photo API might not be available, return empty array
      logger.info("TikTok photo API not available", { error })
      return []
    }
  }

  /**
   * Get aggregated insights
   */
  private static async getInsights(accessToken: string): Promise<TikTokInsights> {
    // TikTok doesn't have a direct insights endpoint like other platforms
    // We'll aggregate from profile and content data
    try {
      const profile = await this.getUserProfile(accessToken)
      const videos = await this.getUserVideos(accessToken, 100) // Get more for better analytics
      const photos = await this.getUserPhotos(accessToken, 100)

      const videoViews = videos.reduce((sum, video) => sum + video.view_count, 0)
      const totalLikes = videos.reduce((sum, video) => sum + video.like_count, 0) +
                        photos.reduce((sum, photo) => sum + photo.like_count, 0)
      const totalComments = videos.reduce((sum, video) => sum + video.comment_count, 0) +
                           photos.reduce((sum, photo) => sum + photo.comment_count, 0)
      const totalShares = videos.reduce((sum, video) => sum + video.share_count, 0) +
                         photos.reduce((sum, photo) => sum + photo.share_count, 0)

      return {
        profile_views: Math.floor(videoViews * 0.1), // Estimate profile views
        video_views: videoViews,
        followers_count: profile.follower_count,
        likes_count: totalLikes,
        comments_count: totalComments,
        shares_count: totalShares,
        video_count: videos.length,
        photo_count: photos.length,
      }

    } catch (error) {
      logger.warn("Failed to get TikTok insights, using defaults", { error })
      return this.getDefaultInsights()
    }
  }

  /**
   * Query creator info (required before posting)
   */
  static async getCreatorInfo(accessToken: string): Promise<TikTokCreatorInfo> {
    const response = await this.makeRequest(
      'POST',
      `${TIKTOK_API_BASE}/v2/post/publish/creator_info/query/`,
      {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    )

    return {
      creator_username: response.data?.creator_username || '',
      creator_nickname: response.data?.creator_nickname || '',
      creator_avatar_url: response.data?.creator_avatar_url || '',
      privacy_level_options: response.data?.privacy_level_options || ['PUBLIC_TO_EVERYONE'],
      comment_disabled: response.data?.comment_disabled || false,
      duet_disabled: response.data?.duet_disabled || false,
      stitch_disabled: response.data?.stitch_disabled || false,
      max_video_post_duration_sec: response.data?.max_video_post_duration_sec || 300,
    }
  }

  /**
   * Post video to TikTok
   */
  static async postVideo(accessToken: string, params: {
    title: string
    videoUrl?: string
    videoFile?: Buffer
    privacyLevel?: string
    disableComment?: boolean
    disableDuet?: boolean
    disableStitch?: boolean
  }): Promise<TikTokPostResponse> {
    const postInfo = {
      title: params.title,
      privacy_level: params.privacyLevel || 'PUBLIC_TO_EVERYONE',
      disable_comment: params.disableComment || false,
      disable_duet: params.disableDuet || false,
      disable_stitch: params.disableStitch || false,
    }

    let sourceInfo: any

    if (params.videoUrl) {
      // Post from URL
      sourceInfo = {
        source: 'PULL_FROM_URL',
        video_url: params.videoUrl
      }
    } else if (params.videoFile) {
      // Post from file upload
      sourceInfo = {
        source: 'FILE_UPLOAD',
        video_size: params.videoFile.length,
        chunk_size: 10000000, // 10MB chunks
        total_chunk_count: Math.ceil(params.videoFile.length / 10000000)
      }
    } else {
      throw new Error('Either videoUrl or videoFile must be provided')
    }

    const response = await this.makeRequest(
      'POST',
      `${TIKTOK_API_BASE}/v2/post/publish/video/init/`,
      {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      {
        post_info: postInfo,
        source_info: sourceInfo
      }
    )

    return {
      publish_id: response.data?.publish_id || '',
      status: 'PROCESSING',
      video_id: response.data?.video_id,
    }
  }

  /**
   * Post photos to TikTok
   */
  static async postPhotos(accessToken: string, params: {
    title: string
    description?: string
    imageUrls: string[]
    privacyLevel?: string
    disableComment?: boolean
    autoAddMusic?: boolean
  }): Promise<TikTokPostResponse> {
    const response = await this.makeRequest(
      'POST',
      `${TIKTOK_API_BASE}/v2/post/publish/content/init/`,
      {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      {
        post_info: {
          title: params.title,
          description: params.description || '',
          privacy_level: params.privacyLevel || 'PUBLIC_TO_EVERYONE',
          disable_comment: params.disableComment || false,
          auto_add_music: params.autoAddMusic || true,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          photo_cover_index: 1,
          photo_images: params.imageUrls,
        },
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO'
      }
    )

    return {
      publish_id: response.data?.publish_id || '',
      status: 'PROCESSING',
      photo_id: response.data?.photo_id,
    }
  }

  /**
   * Check post status
   */
  static async getPostStatus(accessToken: string, publishId: string): Promise<TikTokPostResponse> {
    const response = await this.makeRequest(
      'POST',
      `${TIKTOK_API_BASE}/v2/post/publish/status/fetch/`,
      {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      {
        publish_id: publishId
      }
    )

    return {
      publish_id: publishId,
      status: response.data?.status || 'PROCESSING',
      share_url: response.data?.share_url,
      video_id: response.data?.video_id,
      photo_id: response.data?.photo_id,
    }
  }

  // Helper methods
  private static async makeRequest(
    method: 'GET' | 'POST',
    url: string,
    headers: Record<string, string>,
    params?: any
  ): Promise<any> {
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    let finalUrl = url

    if (method === 'GET' && params) {
      const searchParams = new URLSearchParams(params)
      finalUrl = `${url}?${searchParams.toString()}`
    } else if (method === 'POST' && params) {
      config.body = JSON.stringify(params)
    }

    const response = await fetch(finalUrl, config)
    const data = await response.json()

    if (!response.ok) {
      const error = data.error || data
      throw new Error(`TikTok API error: ${error.message || error.code || 'Unknown error'}`)
    }

    if (data.error && data.error.code !== 'ok') {
      throw new Error(`TikTok API error: ${data.error.message || data.error.code}`)
    }

    return data
  }

  private static async delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY))
  }

  private static getDefaultProfile(): TikTokProfile {
    return {
      open_id: '',
      union_id: '',
      display_name: 'TikTok User',
      username: '',
      avatar_url: '',
      follower_count: 0,
      following_count: 0,
      likes_count: 0,
      video_count: 0,
      is_verified: false,
    }
  }

  private static getDefaultInsights(): TikTokInsights {
    return {
      profile_views: 0,
      video_views: 0,
      followers_count: 0,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      video_count: 0,
      photo_count: 0,
    }
  }

  private static getDateDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  private static getDateToday(): string {
    return new Date().toISOString().split('T')[0]
  }
}
