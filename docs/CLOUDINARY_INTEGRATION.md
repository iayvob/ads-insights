Cloudinary Media Upload Integration

## Overview

All media uploads now use **Cloudinary** for persistent cloud storage. This ensures that uploaded media files are:

- ✅ Permanently stored (not deleted when serverless functions restart)
- ✅ Accessible from all serverless instances
- ✅ Delivered via global CDN for fast access
- ✅ Automatically optimized and transformed
- ✅ Compatible with all social media platforms

## How It Works

### 1. Media Upload Flow

```
User uploads file → Frontend sends to /api/posting/media
                  ↓
              Backend receives file
                  ↓
           Upload to Cloudinary
                  ↓
          Get Cloudinary URL (https://res.cloudinary.com/...)
                  ↓
         Store URL in MongoDB
                  ↓
          Return URL to frontend
```

### 2. Platform Posting Flow

```
User clicks "Publish" → Frontend sends post request with Cloudinary URLs
                      ↓
                 Backend receives request
                      ↓
              Select platform (Twitter, Facebook, Instagram, etc.)
                      ↓
           Pass Cloudinary URL to platform API
                      ↓
         Platform fetches media from Cloudinary
                      ↓
                Post published successfully
```

## Platform-Specific Implementation

### Twitter

- **Method**: Direct media upload using OAuth 1.0a
- **Process**:
  1. Fetch media file from Cloudinary URL
  2. Upload media bytes to Twitter API
  3. Get Twitter media_id
  4. Attach media_id to tweet

**Location**: `src/lib/twitter.ts` - `uploadMedia()` function

### Facebook

- **Method**: URL-based upload (preferred) with file fallback
- **Process**:
  1. Pass Cloudinary URL directly to Facebook Graph API
  2. Facebook fetches the image/video from Cloudinary
  3. Facebook processes and posts the media

**Location**: `src/lib/facebook.ts` - `postImage()` and `postVideo()` functions

**Note**: Cloudinary URLs (HTTPS) work perfectly with Facebook's URL-based upload. The file fallback methods are only used for local development URLs.

### Instagram

- **Method**: URL-based media container creation
- **Process**:
  1. Create media container with Cloudinary URL
  2. Instagram fetches and processes media from Cloudinary
  3. Wait for container status to be "FINISHED"
  4. Publish the container to create the post

**Location**: `src/lib/instagram.ts` - `postInstagramImage()`, `postInstagramVideo()`, `postInstagramCarousel()` functions

**Note**: Instagram requires publicly accessible HTTPS URLs, which Cloudinary provides perfectly.

### Amazon (Posts)

- **Method**: Direct file upload to Amazon Ads API
- **Process**:
  1. Fetch media file from Cloudinary URL
  2. Upload to Amazon's asset service
  3. Get Amazon asset ID
  4. Use asset ID in post creation

**Location**: `src/services/amazon-media-upload.ts`

### TikTok

- **Method**: Multi-step upload process
- **Process**:
  1. Fetch media file from Cloudinary URL
  2. Initialize TikTok upload session
  3. Upload chunks to TikTok
  4. Complete upload and get media_id

**Location**: `src/services/tiktok-media-upload.ts`

## Key Benefits for Each Platform

### Twitter ✅

- Cloudinary URLs are fetched server-side
- No filesystem access needed
- Works perfectly in serverless environment

### Facebook ✅

- Direct URL-based upload supported
- Facebook Graph API fetches from Cloudinary
- No file upload fallback needed for Cloudinary URLs

### Instagram ✅

- Instagram requires HTTPS URLs (✅ Cloudinary provides this)
- Media containers work seamlessly with Cloudinary URLs
- Faster processing since media is already on CDN

### Amazon ✅

- Fetches media from Cloudinary before uploading to Amazon
- Clean separation of storage and platform-specific uploads

### TikTok ✅

- Fetches media from Cloudinary before chunked upload
- Reliable access to media files

## Code Changes Made

### 1. Media Upload Route (`src/app/api/posting/media/route.ts`)

**Before**: Saved files to `/tmp` (ephemeral, unreliable)
**After**: Uploads to Cloudinary (persistent, reliable)

```typescript
// Old: Local filesystem
await writeFile(filePath, buffer);

// New: Cloudinary upload
const uploadResult = await uploadToCloudinary(buffer, {
  folder: `users/${userId}`,
  resourceType: isVideo ? 'video' : 'image',
});
```

### 2. Cloudinary Configuration (`src/config/cloudinary.ts`)

New file with helper functions:

- `uploadToCloudinary()` - Upload buffer to Cloudinary
- `deleteFromCloudinary()` - Delete media from Cloudinary
- `getCloudinaryThumbnail()` - Generate thumbnail URLs

### 3. Facebook Library (`src/lib/facebook.ts`)

**Updated**: Added comments clarifying Cloudinary URL handling

- Cloudinary URLs (HTTPS) skip local file handling
- URL-based upload is used for Cloudinary
- File upload fallback only for local development

### 4. Instagram Library (`src/lib/instagram.ts`)

**Updated**: Added comments clarifying Cloudinary URL handling

- Cloudinary URLs pass through to Instagram API unchanged
- Instagram fetches media directly from Cloudinary
- File upload fallback only for local development

### 5. File Serving Routes

**Note**: These routes (`src/app/api/uploads/**`) are now only used for:

- Local development testing
- Backward compatibility
- They are NOT used in production with Cloudinary

## Environment Variables Required

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Get these from**: https://cloudinary.com/console

## Database Schema

The `MediaFile` model stores Cloudinary metadata:

```typescript
{
  id: string              // MongoDB ObjectId
  userId: string          // Owner of the media
  filename: string        // Original filename
  fileKey: string         // Cloudinary public_id (e.g., "users/123/abc...")
  fileType: string        // MIME type
  fileSize: number        // Size in bytes
  url: string            // Cloudinary secure URL (https://res.cloudinary.com/...)
  isVideo: boolean       // Type indicator
  width?: number         // Image/video dimensions
  height?: number
  duration?: number      // Video duration
  thumbnailUrl: string   // Cloudinary thumbnail URL
  resourceType: string   // 'image' or 'video'
  createdAt: Date
  updatedAt: Date
}
```

## Testing Checklist

### ✅ Media Upload

- [ ] Upload image file
- [ ] Upload video file
- [ ] Verify Cloudinary dashboard shows uploaded files
- [ ] Verify database stores Cloudinary URLs

### ✅ Platform Posting

- [ ] Post image to Facebook
- [ ] Post video to Facebook
- [ ] Post image to Instagram
- [ ] Post video to Instagram
- [ ] Post carousel to Instagram
- [ ] Post with media to Twitter
- [ ] Verify all platforms successfully fetch from Cloudinary

### ✅ Production Deployment

- [ ] Cloudinary credentials added to Vercel
- [ ] Media upload works on production
- [ ] Media persists across deployments
- [ ] All platform posts work on production

## Troubleshooting

### Media upload fails with 500 error

- **Check**: Cloudinary credentials in environment variables
- **Verify**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` are set
- **Test**: Try uploading directly in Cloudinary dashboard

### Platform posting fails to fetch media

- **Check**: Media URL is publicly accessible HTTPS
- **Verify**: Open Cloudinary URL in browser - should show the media
- **Test**: Use Cloudinary URL directly in platform's API tester

### Images don't display in preview

- **Check**: Frontend is using the Cloudinary URL from API response
- **Verify**: Network tab shows successful fetch from Cloudinary
- **Test**: Open media URL directly in browser

## Best Practices

1. **Always use Cloudinary secure URLs** (`https://res.cloudinary.com/...`)
2. **Set appropriate folder structure** (`users/{userId}/filename`)
3. **Use transformations** for thumbnails and optimization
4. **Clean up unused media** to stay within free tier limits
5. **Monitor Cloudinary usage** in dashboard

## Free Tier Limits

Cloudinary Free Tier includes:

- **25 GB** storage
- **25 GB** bandwidth per month
- **25,000** transformations per month
- **1 hour** of HD video storage

**Monitor usage**: https://cloudinary.com/console/usage

## Support Resources

- **Cloudinary Docs**: https://cloudinary.com/documentation
- **Node.js SDK**: https://cloudinary.com/documentation/node_integration
- **Upload API**: https://cloudinary.com/documentation/upload_images
- **Transformation**: https://cloudinary.com/documentation/transformation_reference
