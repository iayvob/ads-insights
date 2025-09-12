# Media API Documentation

This document outlines the implementation of the media upload and management API for the AdInsights platform.

## Overview

The Media API allows users to:

- Upload media files (images and videos)
- Retrieve uploaded media
- Delete media files
- Validate media files against platform-specific constraints

## API Endpoints

### Upload Media

**Endpoint**: `POST /api/posting/media`

**Required Headers**:

- Authorization: Bearer token

**Request Body**:

- Form data containing:
  - `files`: One or more media files
  - `platforms`: JSON string array of target platforms (e.g., ["facebook", "instagram"])

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": "media_file_id",
      "url": "https://s3-url-to-file.com/path",
      "filename": "original_filename.jpg",
      "type": "image", // or "video"
      "size": 123456, // in bytes
      "dimensions": {
        "width": 1080,
        "height": 1080
      },
      "duration": null // for videos only
    }
  ],
  "message": "Successfully uploaded 1 file(s)"
}
```

### Get Media Files

**Endpoint**: `GET /api/posting/media?limit=20&offset=0`

**Required Headers**:

- Authorization: Bearer token

**Query Parameters**:

- `limit`: Number of items to return (default: 20)
- `offset`: Pagination offset (default: 0)

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": "media_file_id",
      "url": "https://s3-url-to-file.com/path",
      "filename": "original_filename.jpg",
      "type": "image",
      "size": 123456,
      "dimensions": {
        "width": 1080,
        "height": 1080
      }
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

### Delete Media

**Endpoint**: `DELETE /api/posting/media?id=media_file_id`

**Required Headers**:

- Authorization: Bearer token

**Query Parameters**:

- `id`: ID of the media file to delete

**Response**:

```json
{
  "success": true,
  "message": "Media file deleted successfully"
}
```

## Implementation Details

1. **Storage**: Media files are stored in AWS S3
2. **Metadata**: File metadata is stored in MongoDB
3. **Image Processing**: Sharp is used for image resizing and thumbnail generation
4. **Access Control**: Files are stored with user-specific prefixes for security
5. **Validation**: Files are validated against platform-specific constraints before uploading

## Platform Constraints

Each social media platform has specific constraints for media files:

- **Instagram**:
  - Max files: 10
  - Supported types: JPEG, PNG, MP4
  - Max image size: 8MB
  - Max video size: 100MB

- **Facebook**:
  - Max files: 30
  - Supported types: JPEG, PNG, GIF, MP4
  - Max image size: 4MB
  - Max video size: 10GB

- **Twitter**:
  - Max files: 4
  - Supported types: JPEG, PNG, GIF, MP4
  - Max image size: 5MB
  - Max video size: 512MB

## Database Schema

The `MediaFile` model in the database contains:

- ID
- User ID (owner)
- Filename
- S3 file key
- File type (MIME)
- File size
- URL (signed)
- Video flag
- Width/height dimensions
- Duration (for videos)
- Thumbnail URL
- Creation/update timestamps
