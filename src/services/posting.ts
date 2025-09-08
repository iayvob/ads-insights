import { PostRequest, PostResponse, MediaUploadResponse, SocialPlatform } from "@/validations/posting-types"
export class PostingService {
  private static readonly BASE_URL = "/api/posting"

  /**
   * Create and publish a new post
   */
  static async createPost(postData: PostRequest): Promise<PostResponse> {
    const response = await fetch(this.BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    })

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || "Failed to create post")
    }

    return result.data
  }

  /**
   * Upload media files
   */
  static async uploadMedia(files: File[], platforms: SocialPlatform[]): Promise<MediaUploadResponse[]> {
    const formData = new FormData()
    
    files.forEach(file => {
      formData.append("files", file)
    })
    
    formData.append("platforms", JSON.stringify(platforms))

    const response = await fetch(`${this.BASE_URL}/media`, {
      method: "POST",
      body: formData,
    })

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || "Failed to upload media")
    }

    return result.data
  }

  /**
   * Delete uploaded media
   */
  static async deleteMedia(mediaId: string): Promise<void> {
    const response = await fetch(`${this.BASE_URL}/media?id=${mediaId}`, {
      method: "DELETE",
    })

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || "Failed to delete media")
    }
  }

  /**
   * Get user's posts
   */
  static async getPosts(options?: {
    status?: string
    platform?: string
    limit?: number
    offset?: number
  }): Promise<PostResponse[]> {
    const params = new URLSearchParams()
    
    if (options?.status) params.append("status", options.status)
    if (options?.platform) params.append("platform", options.platform)
    if (options?.limit) params.append("limit", options.limit.toString())
    if (options?.offset) params.append("offset", options.offset.toString())

    const response = await fetch(`${this.BASE_URL}?${params}`)
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || "Failed to fetch posts")
    }

    return result.data
  }

  /**
   * Get connected platforms for the current user
   */
  static async getConnectedPlatforms(): Promise<SocialPlatform[]> {
    try {
      const response = await fetch("/api/user/connected-platforms", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      
      if (!result.success) {
        return []
      }

      return result.data.platforms || []
    } catch (error) {
      console.error("Failed to fetch connected platforms:", error)
      return []
    }
  }

  /**
   * Check if a platform is connected
   */
  static async isPlatformConnected(platform: SocialPlatform): Promise<boolean> {
    const connectedPlatforms = await this.getConnectedPlatforms()
    return connectedPlatforms.includes(platform)
  }

  /**
   * Post to specific platform
   */
  static async postToPlatform(
    platform: SocialPlatform, 
    content: string, 
    media?: MediaUploadResponse[]
  ): Promise<any> {
    const response = await fetch(`${this.BASE_URL}/platforms/${platform}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        media: media?.map(m => ({
          id: m.id,
          url: m.url,
          type: m.type
        }))
      }),
    })

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || `Failed to post to ${platform}`)
    }

    return result.data
  }

  /**
   * Validate post content for platforms
   */
  static validateContent(content: string, platforms: SocialPlatform[]): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Check character limits for each platform
    for (const platform of platforms) {
      switch (platform) {
        case "twitter":
          if (content.length > 280) {
            errors.push(`Twitter: Content exceeds 280 character limit (${content.length} characters)`)
          }
          break
        case "instagram":
          if (content.length > 2200) {
            errors.push(`Instagram: Content exceeds 2200 character limit (${content.length} characters)`)
          }
          break
        case "facebook":
          if (content.length > 63206) {
            errors.push(`Facebook: Content exceeds character limit (${content.length} characters)`)
          }
          break
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Extract hashtags from content
   */
  static extractHashtags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g
    const hashtags: string[] = []
    let match

    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.push(match[1])
    }

    return hashtags
  }

  /**
   * Extract mentions from content
   */
  static extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1])
    }

    return mentions
  }

  /**
   * Format content for specific platform
   */
  static formatContentForPlatform(content: string, platform: SocialPlatform): string {
    switch (platform) {
      case "twitter":
        // Truncate if too long
        return content.length > 280 ? content.substring(0, 277) + "..." : content
      
      case "instagram":
        // Instagram allows more characters, keep as is
        return content
      
      case "facebook":
        // Facebook has high limit, keep as is
        return content
      
      default:
        return content
    }
  }
}
