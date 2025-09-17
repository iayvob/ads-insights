/**
 * Amazon Selling Partner API (SP-API) Client for Posting
 * Handles Amazon Posts creation, brand content management, and media uploads
 */

import {
    AmazonApiResponse,
    AmazonPostResponse,
    AmazonUploadResponse,
    AmazonPostContent,
    AmazonMediaAsset,
    AmazonBrandContent,
    AmazonProduct,
    AmazonOAuth,
    AmazonUploadDestination,
    PostingErrorCodes
} from '@/validations/posting-types'

// Amazon SP-API Configuration
interface AmazonSpApiConfig {
    region: 'NA' | 'EU' | 'FE' // North America, Europe, Far East
    clientId: string
    clientSecret: string
    refreshToken: string
    sellerId: string
    marketplaceId: string
    roleArn: string
    accessKeyId: string
    secretAccessKey: string
}

// Amazon Marketplace configurations
const AMAZON_MARKETPLACES = {
    'ATVPDKIKX0DER': { // US
        id: 'ATVPDKIKX0DER',
        name: 'Amazon.com',
        countryCode: 'US',
        currency: 'USD',
        domain: 'https://www.amazon.com',
        region: 'NA' as const,
        endpoint: 'https://sellingpartnerapi-na.amazon.com'
    },
    'A2EUQ1WTGCTBG2': { // Canada
        id: 'A2EUQ1WTGCTBG2',
        name: 'Amazon.ca',
        countryCode: 'CA',
        currency: 'CAD',
        domain: 'https://www.amazon.ca',
        region: 'NA' as const,
        endpoint: 'https://sellingpartnerapi-na.amazon.com'
    },
    'A1PA6795UKMFR9': { // Germany
        id: 'A1PA6795UKMFR9',
        name: 'Amazon.de',
        countryCode: 'DE',
        currency: 'EUR',
        domain: 'https://www.amazon.de',
        region: 'EU' as const,
        endpoint: 'https://sellingpartnerapi-eu.amazon.com'
    },
    'A1RKKUPIHCS9HS': { // Spain
        id: 'A1RKKUPIHCS9HS',
        name: 'Amazon.es',
        countryCode: 'ES',
        currency: 'EUR',
        domain: 'https://www.amazon.es',
        region: 'EU' as const,
        endpoint: 'https://sellingpartnerapi-eu.amazon.com'
    },
    'A13V1IB3VIYZZH': { // France
        id: 'A13V1IB3VIYZZH',
        name: 'Amazon.fr',
        countryCode: 'FR',
        currency: 'EUR',
        domain: 'https://www.amazon.fr',
        region: 'EU' as const,
        endpoint: 'https://sellingpartnerapi-eu.amazon.com'
    }
} as const

export class AmazonPostingClient {
    private config: AmazonSpApiConfig
    private accessToken?: string
    private tokenExpiresAt?: Date

    constructor(config: AmazonSpApiConfig) {
        this.config = config
    }

    /**
     * Get OAuth access token using refresh token
     */
    private async getAccessToken(): Promise<string> {
        if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
            return this.accessToken
        }

        try {
            const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.config.refreshToken,
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                }),
            })

            if (!tokenResponse.ok) {
                throw new Error(`Token refresh failed: ${tokenResponse.statusText}`)
            }

            const tokenData = await tokenResponse.json()
            this.accessToken = tokenData.access_token
            this.tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

            return this.accessToken || ''
        } catch (error) {
            console.error('Failed to refresh Amazon access token:', error)
            throw new Error('Amazon authentication failed')
        }
    }

    /**
     * Make authenticated request to Amazon SP-API
     */
    private async makeSpApiRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        body?: any,
        additionalHeaders?: Record<string, string>
    ): Promise<AmazonApiResponse<T>> {
        const accessToken = await this.getAccessToken()
        const marketplace = AMAZON_MARKETPLACES[this.config.marketplaceId as keyof typeof AMAZON_MARKETPLACES]

        if (!marketplace) {
            throw new Error(`Unsupported marketplace: ${this.config.marketplaceId}`)
        }

        const url = `${marketplace.endpoint}${endpoint}`
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'x-amz-access-token': accessToken,
            'Content-Type': 'application/json',
            'User-Agent': 'AdsInsights/1.0 (Language=JavaScript)',
            ...additionalHeaders,
        }

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            })

            const responseData = await response.json()

            if (!response.ok) {
                console.error('Amazon SP-API Error:', responseData)
                throw new Error(`SP-API request failed: ${response.status} ${response.statusText}`)
            }

            return responseData as AmazonApiResponse<T>
        } catch (error) {
            console.error('SP-API Request failed:', error)
            throw error
        }
    }

    /**
     * Create upload destination for media
     */
    async createUploadDestination(
        contentType: string,
        fileName?: string
    ): Promise<AmazonUploadDestination> {
        try {
            const response = await this.makeSpApiRequest<AmazonUploadResponse>(
                '/uploads/2020-11-01/uploadDestinations',
                'POST',
                {
                    resource: 'BRAND_CONTENT_IMAGE',
                    contentType,
                    contentMD5: '', // Will be calculated by client
                    marketplaceIds: [this.config.marketplaceId],
                    ...(fileName && { fileName })
                }
            )

            if (response.errors || !response.payload) {
                throw new Error(`Upload destination creation failed: ${response.errors?.[0]?.message || 'Unknown error'}`)
            }

            return {
                uploadDestinationId: response.payload.uploadDestinationId,
                url: response.payload.uploadUrl,
                headers: response.payload.uploadHeaders,
                contentType,
                marketplace: this.config.marketplaceId,
                expires: new Date(response.payload.expiresAt),
            }
        } catch (error) {
            console.error('Failed to create upload destination:', error)
            throw new Error('Amazon media upload destination creation failed')
        }
    }

    /**
     * Upload media file to Amazon
     */
    async uploadMedia(
        file: Buffer | Blob,
        uploadDestination: AmazonUploadDestination,
        fileName: string
    ): Promise<AmazonMediaAsset> {
        try {
            // Handle different file types for body
            let body: BodyInit
            if (file instanceof Blob) {
                body = file
            } else {
                // Convert Buffer to Uint8Array for fetch compatibility
                body = new Uint8Array(file)
            }

            // Upload file to Amazon's provided URL
            const uploadResponse = await fetch(uploadDestination.url, {
                method: 'PUT',
                headers: uploadDestination.headers,
                body: body,
            })

            if (!uploadResponse.ok) {
                throw new Error(`Media upload failed: ${uploadResponse.statusText}`)
            }

            // Get file metadata
            const fileSize = file instanceof Buffer ? file.length : (file as Blob).size

            // For now, return a basic asset - in production you'd get this from Amazon's response
            return {
                assetId: uploadDestination.uploadDestinationId,
                mediaType: uploadDestination.contentType.startsWith('image/') ? 'IMAGE' : 'VIDEO',
                url: uploadDestination.url,
                fileName,
                fileSize,
                dimensions: { width: 800, height: 600 }, // Would be determined from actual file
                mimeType: uploadDestination.contentType,
                status: 'READY',
            }
        } catch (error) {
            console.error('Failed to upload media to Amazon:', error)
            throw new Error('Amazon media upload failed')
        }
    }

    /**
     * Get product details by ASIN
     */
    async getProductByAsin(asin: string): Promise<AmazonProduct> {
        try {
            const response = await this.makeSpApiRequest<any>(
                `/catalog/2022-04-01/items/${asin}?marketplaceIds=${this.config.marketplaceId}&includedData=attributes,images,productTypes,relationships,salesRanks,summaries`
            )

            if (response.errors || !response.payload) {
                throw new Error(`Product lookup failed: ${response.errors?.[0]?.message || 'Product not found'}`)
            }

            const product = response.payload
            const attributes = product.attributes || {}
            const images = product.images || []
            const summaries = product.summaries || []

            return {
                asin,
                title: attributes.item_name?.[0]?.value || attributes.title?.[0]?.value || 'Unknown Product',
                brand: attributes.brand?.[0]?.value,
                category: summaries[0]?.itemClassification?.value,
                imageUrl: images[0]?.images?.[0]?.link,
                price: {
                    amount: 0, // Price would come from pricing API
                    currency: AMAZON_MARKETPLACES[this.config.marketplaceId as keyof typeof AMAZON_MARKETPLACES].currency,
                },
                availability: 'UNKNOWN',
                rating: undefined,
                reviewCount: undefined,
            }
        } catch (error) {
            console.error('Failed to get product details:', error)
            throw new Error(`Failed to retrieve product details for ASIN: ${asin}`)
        }
    }

    /**
     * Create Amazon Post
     */
    async createPost(postContent: AmazonPostContent, mediaAssets: AmazonMediaAsset[]): Promise<AmazonPostResponse> {
        try {
            // Amazon Posts API endpoint (this is a simplified version)
            // In reality, this would use the Amazon Content API or Brand Content API
            const postData = {
                marketplaceId: this.config.marketplaceId,
                brandEntityId: postContent.brandContent?.brandEntityId,
                headline: postContent.headline,
                bodyText: postContent.bodyText,
                callToAction: postContent.callToAction,
                mediaAssets: mediaAssets.map(asset => ({
                    assetId: asset.assetId,
                    assetType: asset.mediaType,
                    url: asset.url,
                })),
                products: postContent.products.map(product => ({
                    asin: product.asin,
                    title: product.title,
                })),
                tags: postContent.tags || [],
                targetAudience: {
                    marketplace: postContent.targetMarketplace.id,
                },
            }

            // For now, simulate post creation since Amazon doesn't have a public Posts API
            // In production, this would be replaced with actual Amazon API calls
            const mockResponse: AmazonPostResponse = {
                postId: `amazon_post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                status: 'PENDING_REVIEW',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metrics: {
                    views: 0,
                    clicks: 0,
                    engagement: 0,
                },
                moderationStatus: 'PENDING',
            }

            console.log('Amazon Post created (simulated):', postData)
            return mockResponse
        } catch (error) {
            console.error('Failed to create Amazon post:', error)
            throw new Error('Amazon post creation failed')
        }
    }

    /**
     * Submit post for publication
     */
    async submitPost(postId: string): Promise<{ success: boolean; submissionId?: string }> {
        try {
            // Simulate post submission
            const submissionId = `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

            console.log(`Amazon Post ${postId} submitted for review with submission ID: ${submissionId}`)

            return {
                success: true,
                submissionId,
            }
        } catch (error) {
            console.error('Failed to submit Amazon post:', error)
            throw new Error('Amazon post submission failed')
        }
    }

    /**
     * Get post status and metrics
     */
    async getPostStatus(postId: string): Promise<AmazonPostResponse> {
        try {
            // Simulate getting post status
            return {
                postId,
                status: 'PUBLISHED',
                createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                updatedAt: new Date().toISOString(),
                publishedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                metrics: {
                    views: Math.floor(Math.random() * 1000),
                    clicks: Math.floor(Math.random() * 50),
                    engagement: Math.floor(Math.random() * 25),
                },
                moderationStatus: 'APPROVED',
            }
        } catch (error) {
            console.error('Failed to get post status:', error)
            throw new Error('Failed to retrieve Amazon post status')
        }
    }

    /**
     * Search for products by keyword
     */
    async searchProducts(
        keyword: string,
        limit: number = 10
    ): Promise<AmazonProduct[]> {
        try {
            const response = await this.makeSpApiRequest<any>(
                `/catalog/2022-04-01/items?marketplaceIds=${this.config.marketplaceId}&keywords=${encodeURIComponent(keyword)}&pageSize=${limit}`
            )

            if (response.errors || !response.payload?.items) {
                throw new Error(`Product search failed: ${response.errors?.[0]?.message || 'No products found'}`)
            }

            return response.payload.items.map((item: any) => ({
                asin: item.asin,
                title: item.summaries?.[0]?.itemName || 'Unknown Product',
                brand: item.attributes?.brand?.[0]?.value,
                category: item.summaries?.[0]?.itemClassification?.value,
                imageUrl: item.images?.[0]?.images?.[0]?.link,
                price: {
                    amount: 0, // Would come from pricing API
                    currency: AMAZON_MARKETPLACES[this.config.marketplaceId as keyof typeof AMAZON_MARKETPLACES].currency,
                },
                availability: 'UNKNOWN',
            }))
        } catch (error) {
            console.error('Failed to search products:', error)
            throw new Error('Product search failed')
        }
    }

    /**
     * Get brand information
     */
    async getBrandInfo(brandEntityId: string): Promise<AmazonBrandContent> {
        try {
            // Simulate brand info retrieval
            // In production, this would use the Brand Registry API
            return {
                brandEntityId,
                brandName: 'Sample Brand',
                brandStoryTitle: 'Our Brand Story',
                brandStoryContent: 'We are committed to providing quality products...',
                brandDescription: 'A leading brand in our category',
                brandWebsiteUrl: 'https://example.com',
                brandValues: ['Quality', 'Innovation', 'Sustainability'],
            }
        } catch (error) {
            console.error('Failed to get brand info:', error)
            throw new Error('Failed to retrieve brand information')
        }
    }

    /**
     * Validate ASIN format and existence
     */
    async validateAsin(asin: string): Promise<boolean> {
        try {
            // Basic format validation
            const asinRegex = /^[A-Z0-9]{10}$/
            if (!asinRegex.test(asin)) {
                return false
            }

            // Check if product exists
            await this.getProductByAsin(asin)
            return true
        } catch (error) {
            console.error('ASIN validation failed:', error)
            return false
        }
    }

    /**
     * Get supported marketplaces for the seller
     */
    async getSupportedMarketplaces(): Promise<Array<{ id: string; name: string; countryCode: string }>> {
        try {
            // Return configured marketplaces
            return Object.values(AMAZON_MARKETPLACES).map(marketplace => ({
                id: marketplace.id,
                name: marketplace.name,
                countryCode: marketplace.countryCode,
            }))
        } catch (error) {
            console.error('Failed to get supported marketplaces:', error)
            throw new Error('Failed to retrieve supported marketplaces')
        }
    }
}

// Helper function to create Amazon SP-API client from environment
export function createAmazonPostingClient(config: Partial<AmazonSpApiConfig>): AmazonPostingClient {
    const fullConfig: AmazonSpApiConfig = {
        region: (config.region || process.env.AMAZON_SP_API_REGION || 'NA') as 'NA' | 'EU' | 'FE',
        clientId: config.clientId || process.env.AMAZON_SP_API_CLIENT_ID || '',
        clientSecret: config.clientSecret || process.env.AMAZON_SP_API_CLIENT_SECRET || '',
        refreshToken: config.refreshToken || process.env.AMAZON_SP_API_REFRESH_TOKEN || '',
        sellerId: config.sellerId || process.env.AMAZON_SELLER_ID || '',
        marketplaceId: config.marketplaceId || process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
        roleArn: config.roleArn || process.env.AWS_SELLING_PARTNER_ROLE || '',
        accessKeyId: config.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '',
    }

    return new AmazonPostingClient(fullConfig)
}

// Export marketplace configurations for frontend use
export { AMAZON_MARKETPLACES }