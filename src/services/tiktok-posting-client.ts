/**
 * TikTok Business API Client for Direct Video Upload and Publishing
 * 
 * This service handles the complete TikTok posting workflow:
 * 1. OAuth 2.0 authentication
 * 2. Request upload URL
 * 3. Upload video file
 * 4. Publish video post
 * 
 * Based on TikTok Business Open API documentation
 */

import {
    TikTokBusinessAccount,
    TikTokVideoProperties,
    TikTokUploadUrlResponse,
    TikTokVideoUpload,
    TikTokPostContent,
    TikTokPostSubmission,
    TikTokOAuth,
    PostingErrorCodes
} from '@/validations/posting-types'

interface TikTokApiResponse<T = any> {
    code: number
    message: string
    data?: T
    request_id?: string
}

interface TikTokUploadUrlData {
    upload_url: string
    video_id: string
    headers?: Record<string, string>
}

interface TikTokVideoUploadData {
    video_id: string
    status: 'UPLOADED' | 'PROCESSING' | 'FAILED'
    processing_time?: number
}

interface TikTokPublishData {
    post_id: string
    status: 'PUBLISHED' | 'PENDING' | 'FAILED'
    published_at?: string
    video_url?: string
}

interface TikTokBusinessApiConfig {
    baseUrl: string
    version: string
    clientId: string
    clientSecret: string
    redirectUri: string
}

export class TikTokPostingClient {
    private config: TikTokBusinessApiConfig
    private accessToken: string | null = null
    private refreshToken: string | null = null
    private tokenExpiresAt: Date | null = null
    private advertiserId: string | null = null

    constructor(config?: Partial<TikTokBusinessApiConfig>) {
        this.config = {
            baseUrl: 'https://business-api.tiktok.com',
            version: 'v1.3',
            clientId: process.env.TIKTOK_CLIENT_ID || '',
            clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
            redirectUri: process.env.TIKTOK_REDIRECT_URI || '',
            ...config
        }
    }

    /**
     * Set authentication tokens
     */
    setAuth(auth: {
        accessToken: string
        refreshToken?: string
        expiresAt?: Date
        advertiserId: string
    }) {
        this.accessToken = auth.accessToken
        this.refreshToken = auth.refreshToken || null
        this.tokenExpiresAt = auth.expiresAt || null
        this.advertiserId = auth.advertiserId
    }

    /**
     * Get a valid access token, refreshing if needed
     */
    private async getValidAccessToken(): Promise<string> {
        if (!this.accessToken) {
            throw new Error('No access token available')
        }

        // Check if token is expired and needs refresh
        if (this.tokenExpiresAt && new Date() >= this.tokenExpiresAt) {
            if (this.refreshToken) {
                await this.refreshAccessToken()
            } else {
                throw new Error('Access token expired and no refresh token available')
            }
        }

        return this.accessToken || ''
    }

    /**
     * Refresh the access token using refresh token
     */
    private async refreshAccessToken(): Promise<void> {
        if (!this.refreshToken) {
            throw new Error('No refresh token available')
        }

        try {
            const response = await fetch(`${this.config.baseUrl}/oauth2/access_token/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken
                })
            })

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`)
            }

            const tokenData = await response.json()

            if (tokenData.code !== 0) {
                throw new Error(`Token refresh failed: ${tokenData.message}`)
            }

            this.accessToken = tokenData.data.access_token
            this.refreshToken = tokenData.data.refresh_token || this.refreshToken
            this.tokenExpiresAt = new Date(Date.now() + (tokenData.data.expires_in * 1000))
        } catch (error) {
            console.error('Token refresh error:', error)
            throw new Error('Failed to refresh access token')
        }
    }

    /**
     * Get advertiser account information
     */
    async getAdvertiserInfo(): Promise<TikTokBusinessAccount> {
        const accessToken = await this.getValidAccessToken()

        try {
            const response = await fetch(`${this.config.baseUrl}/open_api/${this.config.version}/advertiser/info/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Failed to get advertiser info: ${response.status} ${response.statusText}`)
            }

            const result: TikTokApiResponse = await response.json()

            if (result.code !== 0) {
                throw new Error(`TikTok API error: ${result.message}`)
            }

            return {
                advertiserId: result.data.advertiser_id,
                accountName: result.data.advertiser_name,
                accountType: result.data.role || 'BUSINESS',
                industry: result.data.industry,
                companyName: result.data.company,
                contactEmail: result.data.email
            }
        } catch (error) {
            console.error('Failed to get advertiser info:', error)
            throw error
        }
    }

    /**
     * Request upload URL for video upload (Step 1)
     */
    async requestUploadUrl(videoSize: number, videoFormat: string = 'mp4'): Promise<TikTokUploadUrlResponse> {
        const accessToken = await this.getValidAccessToken()

        if (!this.advertiserId) {
            throw new Error('Advertiser ID is required')
        }

        try {
            const response = await fetch(`${this.config.baseUrl}/open_api/${this.config.version}/file/video/ad/upload/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    advertiser_id: this.advertiserId,
                    file_size: videoSize,
                    file_type: videoFormat.toUpperCase(),
                    upload_type: 'DIRECT'
                })
            })

            if (!response.ok) {
                throw new Error(`Upload URL request failed: ${response.status} ${response.statusText}`)
            }

            const result: TikTokApiResponse<TikTokUploadUrlData> = await response.json()

            if (result.code !== 0) {
                throw new Error(`TikTok API error: ${result.message}`)
            }

            const data = result.data!
            return {
                uploadUrl: data.upload_url,
                videoId: data.video_id,
                uploadHeaders: data.headers || {},
                expiresAt: new Date(Date.now() + (30 * 60 * 1000)) // URLs typically expire in 30 minutes
            }
        } catch (error) {
            console.error('Failed to request upload URL:', error)
            throw error
        }
    }

    /**
     * Upload video file to TikTok (Step 2)
     */
    async uploadVideo(
        file: Buffer | Blob,
        uploadDestination: TikTokUploadUrlResponse,
        fileName: string
    ): Promise<TikTokVideoUpload> {
        try {
            // Handle different file types for body
            let body: BodyInit
            if (file instanceof Blob) {
                body = file
            } else {
                // Convert Buffer to Uint8Array for fetch compatibility
                body = new Uint8Array(file)
            }

            // Upload file to TikTok's provided URL
            const uploadResponse = await fetch(uploadDestination.uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'video/mp4',
                    ...uploadDestination.uploadHeaders
                },
                body: body,
            })

            if (!uploadResponse.ok) {
                throw new Error(`Video upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`)
            }

            // Get file metadata
            const fileSize = file instanceof Buffer ? file.length : (file as Blob).size

            // Return upload information
            return {
                videoId: uploadDestination.videoId,
                uploadUrl: uploadDestination.uploadUrl,
                fileName,
                fileSize,
                duration: 0, // Will be determined by TikTok during processing
                format: 'mp4',
                resolution: {
                    width: 1080, // Default, actual values determined by TikTok
                    height: 1920
                },
                frameRate: 30
            }
        } catch (error) {
            console.error('Video upload failed:', error)
            throw error
        }
    }

    /**
     * Check video upload status
     */
    async checkUploadStatus(videoId: string): Promise<TikTokVideoUploadData> {
        const accessToken = await this.getValidAccessToken()

        try {
            const response = await fetch(`${this.config.baseUrl}/open_api/${this.config.version}/file/video/get/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Upload status check failed: ${response.status} ${response.statusText}`)
            }

            const result: TikTokApiResponse = await response.json()

            if (result.code !== 0) {
                throw new Error(`TikTok API error: ${result.message}`)
            }

            return {
                video_id: videoId,
                status: result.data.status,
                processing_time: result.data.processing_time
            }
        } catch (error) {
            console.error('Failed to check upload status:', error)
            throw error
        }
    }

    /**
     * Publish video post (Step 3)
     */
    async publishPost(postSubmission: TikTokPostSubmission): Promise<TikTokPublishData> {
        const accessToken = await this.getValidAccessToken()

        try {
            const postData = {
                advertiser_id: postSubmission.advertiserId,
                video_id: postSubmission.postContent.videoId,
                text: postSubmission.postContent.caption || '',
                privacy_type: postSubmission.postContent.privacy || 'PUBLIC',
                comment_disabled: !postSubmission.postContent.allowComments,
                duet_disabled: !postSubmission.postContent.allowDuet,
                stitch_disabled: !postSubmission.postContent.allowStitch,
                branded_content_toggle: postSubmission.postContent.brandedContent,
                auto_add_music: false,
                ...(postSubmission.scheduledPublishTime && {
                    publish_time: Math.floor(postSubmission.scheduledPublishTime.getTime() / 1000)
                })
            }

            const response = await fetch(`${this.config.baseUrl}/open_api/${this.config.version}/post/publish/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            })

            if (!response.ok) {
                throw new Error(`Post publish failed: ${response.status} ${response.statusText}`)
            }

            const result: TikTokApiResponse = await response.json()

            if (result.code !== 0) {
                throw new Error(`TikTok API error: ${result.message}`)
            }

            return {
                post_id: result.data.post_id,
                status: result.data.status || 'PUBLISHED',
                published_at: result.data.published_at,
                video_url: result.data.video_url
            }
        } catch (error) {
            console.error('Failed to publish post:', error)
            throw error
        }
    }

    /**
     * Complete posting workflow: upload and publish
     */
    async createPost(
        videoFile: Buffer | Blob,
        fileName: string,
        postContent: TikTokPostContent,
        videoProperties?: TikTokVideoProperties
    ): Promise<{
        postId: string
        videoId: string
        status: string
        publishedAt?: string
        videoUrl?: string
    }> {
        try {
            // Step 1: Request upload URL
            const fileSize = videoFile instanceof Buffer ? videoFile.length : (videoFile as Blob).size
            const uploadDestination = await this.requestUploadUrl(fileSize)

            // Step 2: Upload video
            const uploadResult = await this.uploadVideo(videoFile, uploadDestination, fileName)

            // Wait for processing (optional - TikTok can handle this asynchronously)
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Step 3: Publish post
            const publishResult = await this.publishPost({
                advertiserId: this.advertiserId!,
                postContent,
                videoProperties,
                autoPublish: true
            })

            return {
                postId: publishResult.post_id,
                videoId: uploadResult.videoId,
                status: publishResult.status,
                publishedAt: publishResult.published_at,
                videoUrl: publishResult.video_url
            }
        } catch (error) {
            console.error('Complete posting workflow failed:', error)
            throw error
        }
    }

    /**
     * Get post analytics (if available)
     */
    async getPostAnalytics(postId: string): Promise<any> {
        const accessToken = await this.getValidAccessToken()

        try {
            const response = await fetch(`${this.config.baseUrl}/open_api/${this.config.version}/report/integrated/get/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Analytics request failed: ${response.status} ${response.statusText}`)
            }

            const result: TikTokApiResponse = await response.json()

            if (result.code !== 0) {
                throw new Error(`TikTok API error: ${result.message}`)
            }

            return result.data
        } catch (error) {
            console.error('Failed to get post analytics:', error)
            throw error
        }
    }

    /**
     * Validate video file against TikTok requirements
     */
    static validateVideoFile(file: File | Buffer): {
        isValid: boolean
        errors: string[]
    } {
        const errors: string[] = []
        const fileSize = file instanceof File ? file.size : file.length
        const fileName = file instanceof File ? file.name : 'video.mp4'

        // File size validation (500MB max)
        if (fileSize > 500 * 1024 * 1024) {
            errors.push('Video file size exceeds 500MB limit')
        }

        // File format validation
        if (file instanceof File) {
            const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm']
            if (!allowedTypes.includes(file.type)) {
                errors.push(`Unsupported video format. Allowed: ${allowedTypes.join(', ')}`)
            }

            const allowedExtensions = ['.mp4', '.mov', '.webm']
            const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
            if (!allowedExtensions.includes(fileExtension)) {
                errors.push(`Unsupported file extension. Allowed: ${allowedExtensions.join(', ')}`)
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }
}

export default TikTokPostingClient