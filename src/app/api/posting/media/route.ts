import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { MediaUploadResponse, PlatformConstraints } from "@/validations/posting-types"
import sharp from "sharp"
import { MediaFileUtils } from "@/utils/media-file-utils"
import { uploadToCloudinary, deleteFromCloudinary, getCloudinaryThumbnail } from "@/config/cloudinary"

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
    let formData: FormData;
    try {
      formData = await request.formData()
    } catch (formError) {
      console.error('❌ MEDIA UPLOAD: Failed to parse form data:', formError);
      return NextResponse.json(
        { success: false, error: "Invalid form data" },
        { status: 400 }
      )
    }

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
        // Continue processing other files instead of failing the entire request
        console.log('🔄 MEDIA UPLOAD: Continuing with other files after error');
      }
    }

    if (uploadedFiles.length === 0) {
      console.log('❌ MEDIA UPLOAD: No files were successfully uploaded');
      return NextResponse.json(
        {
          success: false,
          error: "UPLOAD_FAILED",
          message: "All file uploads failed"
        },
        { status: 500 }
      )
    }

    console.log('✅ MEDIA UPLOAD: Upload process completed', {
      totalFiles: files.length,
      successfulUploads: uploadedFiles.length
    });

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
  console.log('🔍 MEDIA UPLOAD: Processing file for Cloudinary', file.name);

  const isVideo = file.type.startsWith("video/")

  // 1. Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  console.log('🔍 MEDIA UPLOAD: File converted to buffer, size:', buffer.length);

  try {
    // 2. Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(buffer, {
      folder: `users/${userId}`,
      resourceType: isVideo ? 'video' : 'image',
    });

    console.log('✅ MEDIA UPLOAD: File uploaded to Cloudinary', {
      publicId: uploadResult.publicId,
      url: uploadResult.secureUrl,
      width: uploadResult.width,
      height: uploadResult.height,
    });

    // 3. Extract metadata
    let dimensions: { width: number; height: number } | undefined
    let duration: number | undefined

    if (!isVideo && uploadResult.width && uploadResult.height) {
      dimensions = {
        width: uploadResult.width,
        height: uploadResult.height
      }
    }

    if (isVideo && uploadResult.duration) {
      duration = uploadResult.duration
    }

    // 4. Generate thumbnail URL
    let thumbnailUrl: string
    if (!isVideo) {
      // For images, use Cloudinary's thumbnail transformation
      thumbnailUrl = getCloudinaryThumbnail(uploadResult.publicId, {
        width: 300,
        height: 300,
        crop: 'fill',
        quality: 80
      })
    } else {
      // For videos, Cloudinary automatically generates video thumbnails
      thumbnailUrl = getCloudinaryThumbnail(uploadResult.publicId, {
        width: 300,
        height: 300,
        crop: 'fill',
      })
    }

    console.log('🔍 MEDIA UPLOAD: Cloudinary upload complete', {
      url: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      thumbnailUrl,
    });

    // 5. Store file info in the database
    const mediaFile = await MediaFileUtils.create({
      userId,
      filename: file.name,
      fileKey: uploadResult.publicId, // Store Cloudinary public_id as fileKey
      fileType: file.type,
      fileSize: file.size,
      url: uploadResult.secureUrl, // Cloudinary secure URL
      isVideo,
      width: dimensions?.width,
      height: dimensions?.height,
      duration,
      thumbnailUrl,
      resourceType: uploadResult.resourceType
    })

    console.log('✅ MEDIA UPLOAD: Database record created', { mediaId: mediaFile.id });

    // 6. Return media upload response
    return {
      id: mediaFile.id,
      url: uploadResult.secureUrl,
      filename: file.name,
      type: isVideo ? "video" : "image",
      size: file.size,
      dimensions,
      duration
    }
  } catch (error) {
    console.error('❌ MEDIA UPLOAD: Cloudinary upload failed:', error);
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
    try {
      const resourceType = mediaFile.isVideo ? 'video' : 'image'
      await deleteFromCloudinary(mediaFile.fileKey, resourceType)
      console.log('✅ File deleted from Cloudinary:', mediaFile.fileKey)
    } catch (error) {
      console.warn(`Failed to delete file from Cloudinary: ${mediaFile.fileKey}`, error)
      // Continue with database cleanup even if Cloudinary delete fails
    }

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