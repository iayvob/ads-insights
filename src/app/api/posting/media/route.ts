import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { MediaUploadResponse, PlatformConstraints } from "@/validations/posting-types"

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

    // Validate premium access for media upload
    const premiumAccess = await validatePremiumAccess(session.userId, "posting")
    if (!premiumAccess.hasAccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: "PREMIUM_REQUIRED",
          message: "Premium subscription required for media uploads" 
        },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const platforms = JSON.parse(formData.get("platforms") as string || "[]")

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      )
    }

    // Validate files
    const validationErrors = validateMediaFiles(files, platforms)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "MEDIA_VALIDATION_FAILED",
          message: "Some files failed validation",
          details: validationErrors
        },
        { status: 400 }
      )
    }

    // Process uploads
    const uploadedFiles: MediaUploadResponse[] = []
    
    for (const file of files) {
      try {
        const uploadResult = await processFileUpload(file, session.userId)
        uploadedFiles.push(uploadResult)
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error)
        return NextResponse.json(
          {
            success: false,
            error: "UPLOAD_FAILED",
            message: `Failed to upload file: ${file.name}`,
            details: error
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: uploadedFiles,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`
    })

  } catch (error) {
    console.error("Media upload API error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred during upload" 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get("id")

    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: "Media ID required" },
        { status: 400 }
      )
    }

    // Delete media file
    const deleted = await deleteMediaFile(mediaId, session.userId)
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Media not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Media file deleted successfully"
    })

  } catch (error) {
    console.error("Media delete API error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete media file" 
      },
      { status: 500 }
    )
  }
}

// Helper functions
function validateMediaFiles(files: File[], platforms: string[]): any[] {
  const errors = []
  
  // Get the most restrictive constraints across all platforms
  const allConstraints = platforms.map(p => PlatformConstraints[p as keyof typeof PlatformConstraints])
  const maxFiles = Math.min(...allConstraints.map(c => c.maxMedia))
  
  if (files.length > maxFiles) {
    errors.push({
      error: "TOO_MANY_FILES",
      message: `Too many files. Maximum allowed across selected platforms: ${maxFiles}`
    })
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fileErrors = validateSingleFile(file, platforms, i)
    errors.push(...fileErrors)
  }
  
  return errors
}

function validateSingleFile(file: File, platforms: string[], index: number): any[] {
  const errors = []
  
  // Basic file validation
  if (!file.type || !file.size) {
    errors.push({
      index,
      filename: file.name,
      error: "INVALID_FILE",
      message: "Invalid file data"
    })
    return errors
  }

  // Validate against each platform
  for (const platform of platforms) {
    const constraints = PlatformConstraints[platform as keyof typeof PlatformConstraints]
    
    // Check file type
    if (!constraints.supportedMediaTypes.includes(file.type as any)) {
      errors.push({
        index,
        filename: file.name,
        platform,
        error: "UNSUPPORTED_TYPE",
        message: `File type ${file.type} not supported on ${platform}`
      })
    }
    
    // Check file size
    const isVideo = file.type.startsWith("video/")
    const maxSize = isVideo ? constraints.maxVideoSize : constraints.maxImageSize
    
    if (file.size > maxSize) {
      errors.push({
        index,
        filename: file.name,
        platform,
        error: "FILE_TOO_LARGE",
        message: `File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds ${platform} limit of ${(maxSize / (1024 * 1024)).toFixed(2)}MB`
      })
    }
  }
  
  return errors
}

async function processFileUpload(file: File, userId: string): Promise<MediaUploadResponse> {
  // In a real implementation, this would:
  // 1. Generate unique filename
  // 2. Upload to cloud storage (AWS S3, Cloudinary, etc.)
  // 3. Generate thumbnails for images
  // 4. Extract metadata (dimensions, duration)
  // 5. Store file info in database
  
  // For now, return mock data
  const fileId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const isVideo = file.type.startsWith("video/")
  
  // Mock dimensions extraction
  const dimensions = isVideo ? undefined : {
    width: 1080,
    height: 1080
  }
  
  // Mock duration for videos
  const duration = isVideo ? 30 : undefined
  
  return {
    id: fileId,
    url: `https://cdn.example.com/uploads/${userId}/${fileId}`,
    filename: file.name,
    type: isVideo ? "video" : "image",
    size: file.size,
    dimensions,
    duration
  }
}

async function deleteMediaFile(mediaId: string, userId: string): Promise<boolean> {
  // In a real implementation, this would:
  // 1. Verify user owns the media file
  // 2. Delete from cloud storage
  // 3. Remove from database
  // 4. Clean up any associated thumbnails
  
  // For now, return true to simulate successful deletion
  return true
}
