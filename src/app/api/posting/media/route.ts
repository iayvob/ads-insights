import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { MediaUploadResponse, PlatformConstraints } from "@/validations/posting-types"
import sharp from "sharp"
import { createHash } from "crypto"
import { writeFile, readFile } from "fs/promises"
import { unlink, mkdir } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { MediaFileUtils } from "@/utils/media-file-utils"
import { existsSync } from "fs"

// Create uploads directory if it doesn't exist
const uploadsDir = join(process.cwd(), 'uploads')
if (!existsSync(uploadsDir)) {
  mkdir(uploadsDir, { recursive: true }).catch(console.error)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 MEDIA UPLOAD: Starting media upload request');

    // Get and validate session
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      console.log('❌ MEDIA UPLOAD: No session found');
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    console.log('✅ MEDIA UPLOAD: Session found', { userId: session.userId, plan: session.plan });

    // Validate premium access for media upload
    const premiumAccess = await validatePremiumAccess(session.userId, "posting")
    console.log('🔍 MEDIA UPLOAD: Premium access check result', premiumAccess);

    if (!premiumAccess.hasAccess) {
      console.log('❌ MEDIA UPLOAD: Premium access denied');
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

    console.log('🔍 MEDIA UPLOAD: Parsed form data', {
      filesCount: files.length,
      platforms,
      fileSizes: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    if (!files || files.length === 0) {
      console.log('❌ MEDIA UPLOAD: No files provided');
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      )
    }

    // Validate files
    const validationErrors = validateMediaFiles(files, platforms)
    console.log('🔍 MEDIA UPLOAD: File validation result', {
      validationErrors: validationErrors.length,
      errors: validationErrors
    });

    if (validationErrors.length > 0) {
      console.log('❌ MEDIA UPLOAD: File validation failed');
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
    console.log('🔍 MEDIA UPLOAD: Starting file processing for', files.length, 'files');

    for (const file of files) {
      try {
        console.log('🔍 MEDIA UPLOAD: Processing file', file.name);
        const uploadResult = await processFileUpload(file, session.userId)
        console.log('✅ MEDIA UPLOAD: File uploaded successfully', {
          filename: file.name,
          uploadId: uploadResult.id
        });
        uploadedFiles.push(uploadResult)
      } catch (error) {
        console.error(`❌ MEDIA UPLOAD: Failed to upload file ${file.name}:`, error)
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
 * Process and upload a file locally and store metadata in database
 */
async function processFileUpload(file: File, userId: string): Promise<MediaUploadResponse> {
  // 1. Generate unique filename with user ID prefix for security
  const fileHash = createHash('md5')
    .update(`${file.name}-${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 10)

  const uniqueFilename = `${userId}-${fileHash}-${Date.now()}.${file.name.split('.').pop()}`
  const isVideo = file.type.startsWith("video/")

  // 2. Create user directory and save file permanently
  const userUploadsDir = join(uploadsDir, userId)
  if (!existsSync(userUploadsDir)) {
    await mkdir(userUploadsDir, { recursive: true })
  }

  const filePath = join(userUploadsDir, uniqueFilename)

  // 3. Convert File to Buffer and save to local filesystem
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  console.log('🔍 MEDIA UPLOAD: Writing file to:', filePath, 'Size:', buffer.length);
  await writeFile(filePath, buffer)

  console.log('🔍 MEDIA UPLOAD: File written, checking existence...');
  const fileExists = existsSync(filePath);
  console.log('🔍 MEDIA UPLOAD: File exists after write:', fileExists);

  try {
    // 4. Extract metadata from file
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

    // 5. Generate local file URL that matches our working file serving route
    const fileUrl = `/api/uploads/${userId}/${uniqueFilename}`

    // 6. Generate thumbnail for display (optional)
    if (!isVideo && dimensions) {
      // Create a thumbnail using sharp for images
      try {
        const thumbnailFilename = `thumb-${uniqueFilename}`
        const thumbnailPath = join(userUploadsDir, thumbnailFilename)

        await sharp(buffer)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath)

        thumbnailUrl = `/api/uploads/${userId}/${thumbnailFilename}`
      } catch (error) {
        console.error('Error creating thumbnail:', error)
        thumbnailUrl = fileUrl // Fallback to original image
      }
    } else {
      thumbnailUrl = fileUrl // For videos, use original file as thumbnail for now
    }

    console.log('Local file upload result:', {
      fileKey: uniqueFilename,
      url: fileUrl,
      filePath,
      thumbnailUrl,
      hasFile: existsSync(filePath)
    });

    // 7. Store file info in the database using our utility
    const mediaFile = await MediaFileUtils.create({
      userId,
      filename: file.name,
      fileKey: uniqueFilename, // Store local filename instead of Cloudinary public_id
      fileType: file.type,
      fileSize: file.size,
      url: fileUrl, // Local file URL
      isVideo,
      width: dimensions?.width,
      height: dimensions?.height,
      duration,
      thumbnailUrl,
      resourceType: isVideo ? 'video' : 'image'
    })

    // 8. Return media upload response
    return {
      id: mediaFile.id,
      url: fileUrl,
      filename: file.name,
      type: isVideo ? "video" : "image",
      size: file.size,
      dimensions,
      duration
    }
  } catch (error) {
    // Clean up file in case of error
    try {
      await unlink(filePath)
    } catch { }
    throw error
  }
}

/**
 * Delete a media file from local storage and remove from database
 */
async function deleteMediaFile(mediaId: string, userId: string): Promise<boolean> {
  try {
    // 1. Verify user owns the media file and get file info
    const mediaFile = await MediaFileUtils.findById(mediaId)

    if (!mediaFile || mediaFile.userId !== userId) {
      return false // Not found or not authorized
    }

    // 2. Delete from local filesystem
    const userUploadsDir = join(uploadsDir, userId)
    const filePath = join(userUploadsDir, mediaFile.fileKey)

    try {
      await unlink(filePath)
    } catch (error) {
      console.warn(`File not found on disk: ${filePath}`)
      // Continue with database cleanup even if file doesn't exist
    }

    // 3. Delete thumbnail if it exists
    if (mediaFile.thumbnailUrl && mediaFile.thumbnailUrl.includes('thumb-')) {
      const thumbnailFilename = mediaFile.thumbnailUrl.split('/').pop()
      if (thumbnailFilename) {
        const thumbnailPath = join(userUploadsDir, thumbnailFilename)
        try {
          await unlink(thumbnailPath)
        } catch (error) {
          console.warn(`Thumbnail not found on disk: ${thumbnailPath}`)
        }
      }
    }

    // 4. Remove from database using utility
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