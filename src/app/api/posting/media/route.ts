import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { MediaUploadResponse, PlatformConstraints } from "@/validations/posting-types"
import { v2 as cloudinary } from 'cloudinary'
import sharp from "sharp"
import { createHash } from "crypto"
import { writeFile } from "fs/promises"
import { unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { MediaFileUtils } from "@/utils/media-file-utils"
import { env } from "@/validations/env"

// Initialize Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME || "",
  api_key: env.CLOUDINARY_API_KEY || "",
  api_secret: env.CLOUDINARY_API_SECRET || "",
  secure: true
});

// Debug Cloudinary configuration
console.log('Cloudinary config:', {
  hasCloudName: !!env.CLOUDINARY_CLOUD_NAME,
  hasApiKey: !!env.CLOUDINARY_API_KEY,
  hasApiSecret: !!env.CLOUDINARY_API_SECRET,
  cloudName: env.CLOUDINARY_CLOUD_NAME?.substring(0, 5) + '...' || 'NOT_SET'
});

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
            details: error instanceof Error ? error.message : String(error)
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

    // Delete media file from storage and database
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

/**
 * Process and upload a file to Cloudinary and store metadata in database
 */
async function processFileUpload(file: File, userId: string): Promise<MediaUploadResponse> {
  // 1. Generate unique filename with user ID prefix for security
  const fileHash = createHash('md5')
    .update(`${file.name}-${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 10)

  const uniqueFilename = `${userId}/${fileHash}-${Date.now()}`
  const isVideo = file.type.startsWith("video/")

  // 2. Convert File to Buffer and save temporarily
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Save the file temporarily to disk (needed for Cloudinary upload)
  const tempFilePath = join(tmpdir(), `upload-${fileHash}.tmp`)
  await writeFile(tempFilePath, buffer)

  try {
    // 3. Extract metadata from file
    let dimensions: { width: number; height: number } | undefined
    let duration: number | undefined
    let thumbnailUrl: string | undefined

    if (!isVideo) {
      // For images, use sharp to extract dimensions
      try {
        const metadata = await sharp(buffer).metadata()
        if (metadata.width && metadata.height) {
          dimensions = {
            width: metadata.width,
            height: metadata.height
          }
        }
      } catch (error) {
        console.error('Error processing image metadata:', error)
      }
    }

    // 4. Upload to Cloudinary
    const uploadOptions = {
      folder: `adinsights/${userId}`,
      public_id: fileHash,
      resource_type: isVideo ? "video" : "image",
      overwrite: true,
      use_filename: false,
    }

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: any, result: any) => {
          if (error) return reject(error)
          return resolve(result)
        }
      )

      // Use file stream to upload
      const fs = require('fs')
      const readStream = fs.createReadStream(tempFilePath)
      readStream.pipe(uploadStream)
    })

    // 5. Clean up temp file
    await unlink(tempFilePath)

    console.log('Cloudinary upload result:', {
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      url: uploadResult.url,
      resource_type: uploadResult.resource_type,
      hasSecureUrl: !!uploadResult.secure_url
    });

    // 6. Extract dimensions and metadata from Cloudinary response
    if (uploadResult.width && uploadResult.height) {
      dimensions = {
        width: uploadResult.width,
        height: uploadResult.height
      }
    }

    if (isVideo && uploadResult.duration) {
      duration = uploadResult.duration
    }

    // Generate thumbnail URL for images and videos
    if (isVideo) {
      thumbnailUrl = cloudinary.url(uploadResult.public_id, {
        resource_type: 'video',
        format: 'jpg',
        secure: true,
        transformation: [
          { width: 300, height: 300, crop: 'fill' }
        ]
      })
    } else {
      thumbnailUrl = cloudinary.url(uploadResult.public_id, {
        secure: true,
        transformation: [
          { width: 300, height: 300, crop: 'fill' }
        ]
      })
    }

    // 7. Store file info in the database using our utility
    const mediaFile = await MediaFileUtils.create({
      userId,
      filename: file.name,
      fileKey: uploadResult.public_id,
      fileType: file.type,
      fileSize: file.size,
      url: uploadResult.secure_url,
      isVideo,
      width: dimensions?.width,
      height: dimensions?.height,
      duration,
      thumbnailUrl,
      resourceType: uploadResult.resource_type
    })

    // 8. Return media upload response
    return {
      id: mediaFile.id,
      url: uploadResult.secure_url,
      filename: file.name,
      type: isVideo ? "video" : "image",
      size: file.size,
      dimensions,
      duration
    }
  } catch (error) {
    // Clean up temp file in case of error
    try {
      await unlink(tempFilePath)
    } catch { }
    throw error
  }
}

/**
 * Delete a media file from Cloudinary and remove from database
 */
async function deleteMediaFile(mediaId: string, userId: string): Promise<boolean> {
  try {
    // 1. Verify user owns the media file and get file info
    const mediaFile = await MediaFileUtils.findById(mediaId)

    if (!mediaFile || mediaFile.userId !== userId) {
      return false // Not found or not authorized
    }

    // 2. Delete from Cloudinary
    await cloudinary.uploader.destroy(
      mediaFile.fileKey,
      {
        resource_type: (mediaFile.resourceType as 'image' | 'video' | 'raw') ||
          (mediaFile.isVideo ? 'video' : 'image')
      }
    )

    // 3. Remove from database using utility
    await MediaFileUtils.deleteById(mediaId)

    return true
  } catch (error) {
    console.error("Error deleting media file:", error)
    return false
  }
}/**
 * Get all media files for a user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get pagination parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    // Retrieve media files using our utility
    const { files, total } = await MediaFileUtils.findByUserId(session.userId, {
      limit,
      skip: offset
    });

    // Format response
    const formattedFiles: MediaUploadResponse[] = files.map(file => ({
      id: file.id,
      url: file.url,
      filename: file.filename,
      type: file.isVideo ? "video" : "image",
      size: file.fileSize,
      dimensions: file.width && file.height ? {
        width: file.width,
        height: file.height
      } : undefined,
      duration: file.duration || undefined
    }));

    return NextResponse.json({
      success: true,
      data: formattedFiles,
      pagination: {
        total,
        limit,
        offset
      }
    })

  } catch (error) {
    console.error("Media GET API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve media files"
      },
      { status: 500 }
    )
  }
}