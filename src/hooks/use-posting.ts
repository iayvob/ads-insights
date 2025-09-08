import { useState, useCallback } from "react"
import { PostingService } from "@/services/posting"
import { PostRequest, PostResponse, MediaUploadResponse, SocialPlatform } from "@/validations/posting-types"
import { useToast } from "@/hooks/use-toast"

interface UsePostingReturn {
  // State
  isLoading: boolean
  isUploading: boolean
  uploadedMedia: MediaUploadResponse[]
  posts: PostResponse[]
  connectedPlatforms: SocialPlatform[]
  
  // Actions
  uploadMedia: (files: File[], platforms: SocialPlatform[]) => Promise<MediaUploadResponse[]>
  removeMedia: (mediaId: string) => Promise<void>
  createPost: (postData: PostRequest) => Promise<PostResponse>
  loadPosts: (options?: { status?: string; platform?: string }) => Promise<void>
  loadConnectedPlatforms: () => Promise<void>
  validateContent: (content: string, platforms: SocialPlatform[]) => { isValid: boolean; errors: string[] }
  
  // Utils
  extractHashtags: (content: string) => string[]
  extractMentions: (content: string) => string[]
  formatContentForPlatform: (content: string, platform: SocialPlatform) => string
}

export function usePosting(): UsePostingReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedMedia, setUploadedMedia] = useState<MediaUploadResponse[]>([])
  const [posts, setPosts] = useState<PostResponse[]>([])
  const [connectedPlatforms, setConnectedPlatforms] = useState<SocialPlatform[]>([])
  const { toast } = useToast()

  const uploadMedia = useCallback(async (files: File[], platforms: SocialPlatform[]): Promise<MediaUploadResponse[]> => {
    setIsUploading(true)
    try {
      const uploadedFiles = await PostingService.uploadMedia(files, platforms)
      setUploadedMedia(prev => [...prev, ...uploadedFiles])
      
      toast({
        title: "Media Uploaded",
        description: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      })
      
      return uploadedFiles
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload media"
      toast({
        title: "Upload Failed",
        description: message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [toast])

  const removeMedia = useCallback(async (mediaId: string): Promise<void> => {
    try {
      await PostingService.deleteMedia(mediaId)
      setUploadedMedia(prev => prev.filter(media => media.id !== mediaId))
      
      toast({
        title: "Media Removed",
        description: "Media file has been removed",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove media"
      toast({
        title: "Removal Failed",
        description: message,
        variant: "destructive",
      })
      throw error
    }
  }, [toast])

  const createPost = useCallback(async (postData: PostRequest): Promise<PostResponse> => {
    setIsLoading(true)
    try {
      const post = await PostingService.createPost(postData)
      
      // Add to local posts list if it's published
      if (post.status === "published" || post.status === "scheduled") {
        setPosts(prev => [post, ...prev])
      }
      
      // Clear uploaded media if post was created successfully
      setUploadedMedia([])
      
      const statusMessage = post.status === "draft" 
        ? "Post saved as draft"
        : post.status === "scheduled" 
        ? "Post scheduled successfully"
        : "Post published successfully"
      
      toast({
        title: "Success",
        description: statusMessage,
      })
      
      return post
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create post"
      toast({
        title: "Posting Failed",
        description: message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const loadPosts = useCallback(async (options?: { status?: string; platform?: string }): Promise<void> => {
    setIsLoading(true)
    try {
      const loadedPosts = await PostingService.getPosts(options)
      setPosts(loadedPosts)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load posts"
      toast({
        title: "Loading Failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const loadConnectedPlatforms = useCallback(async (): Promise<void> => {
    try {
      const platforms = await PostingService.getConnectedPlatforms()
      setConnectedPlatforms(platforms)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load connected platforms"
      toast({
        title: "Connection Check Failed",
        description: message,
        variant: "destructive",
      })
      throw error
    }
  }, [toast])

  const validateContent = useCallback((content: string, platforms: SocialPlatform[]) => {
    return PostingService.validateContent(content, platforms)
  }, [])

  const extractHashtags = useCallback((content: string) => {
    return PostingService.extractHashtags(content)
  }, [])

  const extractMentions = useCallback((content: string) => {
    return PostingService.extractMentions(content)
  }, [])

  const formatContentForPlatform = useCallback((content: string, platform: SocialPlatform) => {
    return PostingService.formatContentForPlatform(content, platform)
  }, [])

  return {
    // State
    isLoading,
    isUploading,
    uploadedMedia,
    posts,
    connectedPlatforms,
    
    // Actions
    uploadMedia,
    removeMedia,
    createPost,
    loadPosts,
    loadConnectedPlatforms,
    validateContent,
    
    // Utils
    extractHashtags,
    extractMentions,
    formatContentForPlatform,
  }
}
