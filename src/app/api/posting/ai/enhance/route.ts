import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { env } from "@/validations/env"

export async function POST(request: NextRequest) {
  try {
    // Get and validate session
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Validate premium access
    const premiumAccess = await validatePremiumAccess(session.userId, "ai_assistant")
    if (!premiumAccess.hasAccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: "PREMIUM_REQUIRED",
          message: "Premium subscription required for AI enhancements" 
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { content, platforms, tone = 'casual', includeEmojis = true, includeHashtags = true, maxHashtags = 5 } = body

    if (!content || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: "Content and platforms are required" },
        { status: 400 }
      )
    }

    // Enhance content with OpenAI
    const enhancement = await enhanceContentWithAI({
      content,
      platforms,
      tone,
      includeEmojis,
      includeHashtags,
      maxHashtags
    })

    return NextResponse.json({
      success: true,
      data: enhancement,
      message: "Content enhanced successfully"
    })

  } catch (error) {
    console.error("AI enhancement error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "AI_ENHANCEMENT_FAILED",
        message: "Failed to enhance content with AI" 
      },
      { status: 500 }
    )
  }
}

async function enhanceContentWithAI(params: {
  content: string
  platforms: string[]
  tone: string
  includeEmojis: boolean
  includeHashtags: boolean
  maxHashtags: number
}) {
  const { content, platforms, tone, includeEmojis, includeHashtags, maxHashtags } = params

  // Build platform-specific constraints
  const platformConstraints = platforms.map(p => {
    switch (p) {
      case 'twitter':
        return 'Twitter (280 characters max, concise and engaging)'
      case 'instagram':
        return 'Instagram (2200 characters max, visual-focused, hashtag-friendly)'
      case 'facebook':
        return 'Facebook (longer form content welcome, community-focused)'
      default:
        return p
    }
  }).join(', ')

  const systemPrompt = `You are an expert social media content creator. Your task is to enhance social media posts to maximize engagement while maintaining authenticity.

Platform constraints: ${platformConstraints}
Tone: ${tone}
Include emojis: ${includeEmojis}
Include hashtags: ${includeHashtags}
Max hashtags: ${maxHashtags}

Guidelines:
1. Enhance the content while preserving the original message
2. Add relevant emojis naturally throughout the text
3. Suggest trending and relevant hashtags
4. Optimize for engagement and readability
5. Ensure content fits platform character limits
6. Make it more engaging and shareable
7. Keep the authentic voice of the user

Return your response as a JSON object with this structure:
{
  "enhancedContent": "enhanced text with emojis",
  "suggestedHashtags": ["hashtag1", "hashtag2"],
  "improvements": {
    "addedEmojis": true/false,
    "toneAdjustment": "description of tone changes",
    "lengthOptimized": true/false,
    "platformOptimized": ["platform1", "platform2"]
  },
  "originalContent": "original text"
}`

  const userPrompt = `Please enhance this social media post: "${content}"`

  try {
    // Call OpenAI API
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
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiResult = await openaiResponse.json()
    const enhancedContent = JSON.parse(openaiResult.choices[0].message.content)

    return {
      ...enhancedContent,
      originalContent: content
    }

  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Fallback enhancement without AI
    return {
      enhancedContent: addBasicEnhancements(content, includeEmojis),
      suggestedHashtags: generateBasicHashtags(content, platforms, maxHashtags),
      improvements: {
        addedEmojis: includeEmojis,
        toneAdjustment: "Basic enhancement applied",
        lengthOptimized: false,
        platformOptimized: platforms
      },
      originalContent: content
    }
  }
}

function addBasicEnhancements(content: string, includeEmojis: boolean): string {
  let enhanced = content

  if (includeEmojis) {
    // Add basic emojis based on content
    const emojiMap: Record<string, string> = {
      'amazing': '🤩',
      'great': '👍',
      'love': '❤️',
      'excited': '🚀',
      'happy': '😊',
      'success': '✅',
      'new': '✨',
      'launch': '🚀',
      'grow': '📈',
      'team': '👥',
      'work': '💼'
    }

    Object.entries(emojiMap).forEach(([word, emoji]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      enhanced = enhanced.replace(regex, `${word} ${emoji}`)
    })
  }

  return enhanced
}

function generateBasicHashtags(content: string, platforms: string[], maxHashtags: number): string[] {
  const words = content.toLowerCase().split(/\s+/)
  const commonHashtags: Record<string, string[]> = {
    twitter: ['#SocialMedia', '#Content', '#Engagement', '#Digital', '#Marketing'],
    instagram: ['#InstagramReels', '#Content', '#Social', '#Trending', '#Viral'],
    facebook: ['#Community', '#Social', '#Engagement', '#Content', '#Digital']
  }

  const suggestions = new Set<string>()
  
  // Add platform-specific hashtags
  platforms.forEach(platform => {
    const platformTags = commonHashtags[platform] || commonHashtags['twitter']
    platformTags.slice(0, 2).forEach(tag => suggestions.add(tag))
  })

  // Add content-based hashtags
  const contentWords = words.filter(word => 
    word.length > 4 && 
    !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will'].includes(word)
  )
  
  contentWords.slice(0, 3).forEach(word => {
    suggestions.add(`#${word.charAt(0).toUpperCase() + word.slice(1)}`)
  })

  return Array.from(suggestions).slice(0, maxHashtags)
}
