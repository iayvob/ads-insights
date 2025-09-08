interface AIEnhancementRequest {
  content: string
  platforms: string[]
  tone?: 'professional' | 'casual' | 'friendly' | 'exciting' | 'informative'
  includeEmojis?: boolean
  includeHashtags?: boolean
  maxHashtags?: number
}

interface AIEnhancementResponse {
  enhancedContent: string
  suggestedHashtags: string[]
  improvements: {
    addedEmojis: boolean
    toneAdjustment: string
    lengthOptimized: boolean
    platformOptimized: string[]
  }
  originalContent: string
}

interface HashtagSuggestion {
  hashtag: string
  relevance: number
  trending: boolean
  platform: string
}

export class AIPostEnhancer {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
  
  /**
   * Enhance post content with AI
   */
  static async enhancePost(request: AIEnhancementRequest): Promise<AIEnhancementResponse> {
    try {
      const response = await fetch('/api/posting/ai/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to enhance post')
      }

      return result.data
    } catch (error) {
      console.error('AI enhancement failed:', error)
      throw new Error('Failed to enhance post with AI')
    }
  }

  /**
   * Get trending hashtags for platforms
   */
  static async getTrendingHashtags(
    content: string, 
    platforms: string[], 
    limit: number = 10
  ): Promise<HashtagSuggestion[]> {
    try {
      const response = await fetch('/api/posting/ai/hashtags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          platforms,
          limit
        }),
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get hashtag suggestions')
      }

      return result.data
    } catch (error) {
      console.error('Hashtag suggestion failed:', error)
      throw new Error('Failed to get hashtag suggestions')
    }
  }

  /**
   * Generate platform-specific content variations
   */
  static async generatePlatformVariations(
    content: string, 
    platforms: string[]
  ): Promise<Record<string, string>> {
    try {
      const response = await fetch('/api/posting/ai/variations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          platforms
        }),
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to generate variations')
      }

      return result.data
    } catch (error) {
      console.error('Platform variations failed:', error)
      throw new Error('Failed to generate platform variations')
    }
  }

  /**
   * Analyze content and suggest improvements
   */
  static async analyzeContent(content: string, platforms: string[]): Promise<{
    score: number
    suggestions: string[]
    warnings: string[]
    optimizations: string[]
  }> {
    try {
      const response = await fetch('/api/posting/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          platforms
        }),
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to analyze content')
      }

      return result.data
    } catch (error) {
      console.error('Content analysis failed:', error)
      throw new Error('Failed to analyze content')
    }
  }

  /**
   * Generate content from prompt
   */
  static async generateFromPrompt(
    prompt: string,
    platforms: string[],
    tone: string = 'casual'
  ): Promise<string> {
    try {
      const response = await fetch('/api/posting/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          platforms,
          tone
        }),
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to generate content')
      }

      return result.data.content
    } catch (error) {
      console.error('Content generation failed:', error)
      throw new Error('Failed to generate content')
    }
  }

  /**
   * Local utility functions for immediate feedback
   */
  static extractEmojis(text: string): string[] {
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu
    return text.match(emojiRegex) || []
  }

  static suggestEmojisForContent(content: string): string[] {
    const contentLower = content.toLowerCase()
    const emojiMap: Record<string, string[]> = {
      'happy': ['😊', '😄', '🎉', '✨'],
      'excited': ['🚀', '⚡', '🔥', '💪'],
      'love': ['❤️', '💕', '🥰', '😍'],
      'success': ['🎯', '✅', '🏆', '💯'],
      'money': ['💰', '💸', '💵', '📈'],
      'time': ['⏰', '⏳', '🕐', '📅'],
      'work': ['💼', '💻', '📊', '🎯'],
      'food': ['🍕', '🍔', '🥗', '🍽️'],
      'travel': ['✈️', '🌍', '🗺️', '📸'],
      'tech': ['💻', '📱', '⚡', '🔧'],
      'health': ['💪', '🏃‍♂️', '🥗', '💚'],
      'nature': ['🌱', '🌍', '🌸', '🌟']
    }

    const suggestions: string[] = []
    
    Object.entries(emojiMap).forEach(([keyword, emojis]) => {
      if (contentLower.includes(keyword)) {
        suggestions.push(...emojis.slice(0, 2))
      }
    })

    return [...new Set(suggestions)].slice(0, 5)
  }

  static validateContentLength(content: string, platform: string): {
    isValid: boolean
    remaining: number
    limit: number
  } {
    const limits: Record<string, number> = {
      twitter: 280,
      instagram: 2200,
      facebook: 63206
    }

    const limit = limits[platform] || 2200
    const remaining = limit - content.length

    return {
      isValid: remaining >= 0,
      remaining,
      limit
    }
  }
}
