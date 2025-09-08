import { useState, useCallback } from 'react'
import { AIPostEnhancer } from '@/services/ai-post-enhancer'
import { useToast } from '@/hooks/use-toast'

interface UseAIEnhancementReturn {
  isEnhancing: boolean
  isGeneratingHashtags: boolean
  isGeneratingContent: boolean
  enhancePost: (content: string, platforms: string[], options?: EnhancementOptions) => Promise<AIEnhancementResult | null>
  generateHashtags: (content: string, platforms: string[]) => Promise<any[]>
  generateContent: (prompt: string, platforms: string[], tone?: string) => Promise<string | null>
  analyzeContent: (content: string, platforms: string[]) => Promise<ContentAnalysis | null>
  lastEnhancement: AIEnhancementResult | null
}

interface EnhancementOptions {
  tone?: 'professional' | 'casual' | 'friendly' | 'exciting' | 'informative'
  includeEmojis?: boolean
  includeHashtags?: boolean
  maxHashtags?: number
}

interface AIEnhancementResult {
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

interface ContentAnalysis {
  score: number
  suggestions: string[]
  warnings: string[]
  optimizations: string[]
}

export function useAIEnhancement(): UseAIEnhancementReturn {
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)
  const [lastEnhancement, setLastEnhancement] = useState<AIEnhancementResult | null>(null)
  const { toast } = useToast()

  const enhancePost = useCallback(async (
    content: string, 
    platforms: string[], 
    options: EnhancementOptions = {}
  ): Promise<AIEnhancementResult | null> => {
    if (!content.trim()) {
      toast({
        title: "No content to enhance",
        description: "Please enter some content first",
        variant: "destructive"
      })
      return null
    }

    setIsEnhancing(true)
    try {
      const enhancement = await AIPostEnhancer.enhancePost({
        content,
        platforms,
        tone: options.tone || 'casual',
        includeEmojis: options.includeEmojis ?? true,
        includeHashtags: options.includeHashtags ?? true,
        maxHashtags: options.maxHashtags || 5
      })

      setLastEnhancement(enhancement)
      
      toast({
        title: "Content enhanced! ✨",
        description: "Your post has been optimized with AI",
      })

      return enhancement
    } catch (error) {
      console.error('Enhancement failed:', error)
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Failed to enhance content",
        variant: "destructive"
      })
      return null
    } finally {
      setIsEnhancing(false)
    }
  }, [toast])

  const generateHashtags = useCallback(async (
    content: string, 
    platforms: string[]
  ): Promise<any[]> => {
    if (!content.trim()) {
      toast({
        title: "No content provided",
        description: "Please enter content to generate hashtags",
        variant: "destructive"
      })
      return []
    }

    setIsGeneratingHashtags(true)
    try {
      const hashtags = await AIPostEnhancer.getTrendingHashtags(content, platforms, 10)
      
      toast({
        title: "Hashtags generated! 🏷️",
        description: `Found ${hashtags.length} relevant hashtags`,
      })

      return hashtags
    } catch (error) {
      console.error('Hashtag generation failed:', error)
      toast({
        title: "Hashtag generation failed",
        description: error instanceof Error ? error.message : "Failed to generate hashtags",
        variant: "destructive"
      })
      return []
    } finally {
      setIsGeneratingHashtags(false)
    }
  }, [toast])

  const generateContent = useCallback(async (
    prompt: string, 
    platforms: string[], 
    tone: string = 'casual'
  ): Promise<string | null> => {
    if (!prompt.trim()) {
      toast({
        title: "No prompt provided",
        description: "Please enter a prompt to generate content",
        variant: "destructive"
      })
      return null
    }

    setIsGeneratingContent(true)
    try {
      const content = await AIPostEnhancer.generateFromPrompt(prompt, platforms, tone)
      
      toast({
        title: "Content generated! 🤖",
        description: "AI has created content based on your prompt",
      })

      return content
    } catch (error) {
      console.error('Content generation failed:', error)
      toast({
        title: "Content generation failed",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive"
      })
      return null
    } finally {
      setIsGeneratingContent(false)
    }
  }, [toast])

  const analyzeContent = useCallback(async (
    content: string, 
    platforms: string[]
  ): Promise<ContentAnalysis | null> => {
    if (!content.trim()) return null

    try {
      const analysis = await AIPostEnhancer.analyzeContent(content, platforms)
      
      if (analysis.score < 0.6) {
        toast({
          title: "Content analysis complete",
          description: `Score: ${Math.round(analysis.score * 100)}%. Consider the suggestions below.`,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Great content! 👍",
          description: `Score: ${Math.round(analysis.score * 100)}%. Your content looks good!`,
        })
      }

      return analysis
    } catch (error) {
      console.error('Content analysis failed:', error)
      return null
    }
  }, [toast])

  return {
    isEnhancing,
    isGeneratingHashtags,
    isGeneratingContent,
    enhancePost,
    generateHashtags,
    generateContent,
    analyzeContent,
    lastEnhancement
  }
}
