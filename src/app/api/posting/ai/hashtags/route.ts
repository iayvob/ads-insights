import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { env } from "@/validations/env"

export async function POST(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const premiumAccess = await validatePremiumAccess(session.userId, "ai_assistant")
    if (!premiumAccess.hasAccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: "PREMIUM_REQUIRED",
          message: "Premium subscription required for AI hashtag suggestions" 
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { content, platforms, limit = 10 } = body

    if (!content || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: "Content and platforms are required" },
        { status: 400 }
      )
    }

    const hashtags = await getTrendingHashtagsWithAI(content, platforms, limit)

    return NextResponse.json({
      success: true,
      data: hashtags,
      message: "Hashtag suggestions generated successfully"
    })

  } catch (error) {
    console.error("Hashtag suggestion error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "HASHTAG_SUGGESTION_FAILED",
        message: "Failed to generate hashtag suggestions" 
      },
      { status: 500 }
    )
  }
}

async function getTrendingHashtagsWithAI(content: string, platforms: string[], limit: number) {
  const systemPrompt = `You are a social media expert specializing in trending hashtags. Generate relevant, trending hashtags for the given content and platforms.

Consider:
1. Current trending topics (as of August 2025)
2. Platform-specific hashtag cultures
3. Content relevance and context
4. Mix of popular and niche hashtags
5. Industry-specific tags
6. Seasonal and timely relevance

For each platform:
- Twitter: Concise, trending, news-worthy hashtags
- Instagram: Visual, lifestyle, and discovery hashtags
- Facebook: Community and engagement-focused hashtags

Return a JSON array of hashtag objects with this structure:
[
  {
    "hashtag": "#ExampleTag",
    "relevance": 0.95,
    "trending": true,
    "platform": "twitter",
    "category": "trending|niche|branded|general"
  }
]

Limit: ${limit} hashtags total`

  const userPrompt = `Generate trending hashtags for this content: "${content}"\nPlatforms: ${platforms.join(', ')}`

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const result = await openaiResponse.json()
    const hashtagData = JSON.parse(result.choices[0].message.content)
    
    return hashtagData.hashtags || hashtagData || []

  } catch (error) {
    console.error('OpenAI hashtag generation error:', error)
    
    // Fallback to basic hashtag generation
    return generateFallbackHashtags(content, platforms, limit)
  }
}

function generateFallbackHashtags(content: string, platforms: string[], limit: number) {
  const contentWords = content.toLowerCase().split(/\s+/)
  const trendingHashtags2025 = [
    '#AI', '#Technology', '#Innovation', '#Sustainability', '#Digital',
    '#Community', '#Growth', '#Success', '#Inspiration', '#Future',
    '#Climate', '#Wellness', '#Productivity', '#Learning', '#Business'
  ]

  const platformSpecific: Record<string, string[]> = {
    twitter: ['#Breaking', '#News', '#Tech', '#Viral', '#Trending'],
    instagram: ['#InstaGood', '#PhotoOfTheDay', '#Aesthetic', '#Lifestyle', '#Vibes'],
    facebook: ['#Community', '#Family', '#Friends', '#Local', '#Events']
  }

  const results: Array<{
    hashtag: string
    relevance: number
    trending: boolean
    platform: string
    category: string
  }> = []

  // Add trending hashtags
  trendingHashtags2025.slice(0, Math.floor(limit / 2)).forEach(tag => {
    results.push({
      hashtag: tag,
      relevance: 0.8,
      trending: true,
      platform: 'general',
      category: 'trending'
    })
  })

  // Add platform-specific hashtags
  platforms.forEach(platform => {
    const platformTags = platformSpecific[platform] || []
    platformTags.slice(0, 2).forEach(tag => {
      results.push({
        hashtag: tag,
        relevance: 0.7,
        trending: false,
        platform,
        category: 'platform'
      })
    })
  })

  // Add content-based hashtags
  const relevantWords = contentWords.filter(word => 
    word.length > 4 && 
    !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'your', 'their'].includes(word)
  )

  relevantWords.slice(0, 3).forEach(word => {
    results.push({
      hashtag: `#${word.charAt(0).toUpperCase() + word.slice(1)}`,
      relevance: 0.6,
      trending: false,
      platform: 'general',
      category: 'content'
    })
  })

  return results.slice(0, limit)
}
