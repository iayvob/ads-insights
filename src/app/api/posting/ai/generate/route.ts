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
          message: "Premium subscription required for AI content generation" 
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { prompt, platforms, tone = 'casual', contentType = 'post' } = body

    if (!prompt || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: "Prompt and platforms are required" },
        { status: 400 }
      )
    }

    const generatedContent = await generateContentWithAI({
      prompt,
      platforms,
      tone,
      contentType
    })

    return NextResponse.json({
      success: true,
      data: generatedContent,
      message: "Content generated successfully"
    })

  } catch (error) {
    console.error("AI generation error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "AI_GENERATION_FAILED",
        message: "Failed to generate content with AI" 
      },
      { status: 500 }
    )
  }
}

async function generateContentWithAI(params: {
  prompt: string
  platforms: string[]
  tone: string
  contentType: string
}) {
  const { prompt, platforms, tone, contentType } = params

  const platformConstraints = platforms.map(p => {
    switch (p) {
      case 'twitter':
        return 'Twitter (280 characters max, punchy and viral)'
      case 'instagram':
        return 'Instagram (engaging, visual-focused, hashtag-friendly)'
      case 'facebook':
        return 'Facebook (community engagement, storytelling welcome)'
      default:
        return p
    }
  }).join(', ')

  const systemPrompt = `You are a creative social media content creator and copywriter. Generate engaging ${contentType} content based on user prompts.

Platform targets: ${platformConstraints}
Tone: ${tone}
Content type: ${contentType}

Guidelines:
1. Create engaging, shareable content
2. Include relevant emojis naturally
3. Optimize for each platform's best practices
4. Match the requested tone perfectly
5. Make it authentic and human-like
6. Include call-to-action when appropriate
7. Ensure content fits platform character limits
8. Add trending elements when relevant

Return response as JSON:
{
  "content": "generated content with emojis",
  "variations": {
    "twitter": "twitter-optimized version",
    "instagram": "instagram-optimized version", 
    "facebook": "facebook-optimized version"
  },
  "suggestedHashtags": ["#hashtag1", "#hashtag2"],
  "callToAction": "suggested CTA",
  "engagementTips": ["tip1", "tip2"]
}`

  const userPrompt = `Create ${contentType} content for: ${prompt}`

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
        max_tokens: 1200,
        response_format: { type: 'json_object' }
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const result = await openaiResponse.json()
    return JSON.parse(result.choices[0].message.content)

  } catch (error) {
    console.error('OpenAI generation error:', error)
    
    // Fallback content generation
    return generateFallbackContent(prompt, platforms, tone)
  }
}

function generateFallbackContent(prompt: string, platforms: string[], tone: string) {
  const toneMap: Record<string, string> = {
    professional: 'We\'re excited to share',
    casual: 'Hey everyone! Check this out',
    friendly: 'Hope you\'re having a great day!',
    exciting: 'This is AMAZING! 🚀',
    informative: 'Here\'s what you need to know:'
  }

  const opener = toneMap[tone] || toneMap.casual
  const baseContent = `${opener} ${prompt} 💫`

  const variations: Record<string, string> = {}
  
  platforms.forEach(platform => {
    switch (platform) {
      case 'twitter':
        variations[platform] = baseContent.length > 280 
          ? baseContent.substring(0, 275) + '...' 
          : baseContent
        break
      case 'instagram':
        variations[platform] = `${baseContent}\n\n#Social #Content #Trending`
        break
      case 'facebook':
        variations[platform] = `${baseContent}\n\nWhat do you think? Let us know in the comments! 👇`
        break
      default:
        variations[platform] = baseContent
    }
  })

  return {
    content: baseContent,
    variations,
    suggestedHashtags: ['#Social', '#Content', '#Engagement'],
    callToAction: 'Engage with this post!',
    engagementTips: [
      'Post at optimal times for your audience',
      'Respond to comments quickly',
      'Use trending hashtags'
    ]
  }
}
