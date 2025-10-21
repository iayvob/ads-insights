# Cloudinary Setup Guide

## What is Cloudinary?
Cloudinary is a cloud-based media management service that provides:
- **Persistent storage** for images and videos
- **CDN delivery** for fast global access
- **Automatic optimization** and format conversion
- **Free tier**: 25GB storage, 25GB bandwidth/month

## Setup Steps

### 1. Create a Cloudinary Account
1. Go to https://cloudinary.com/users/register_free
2. Sign up for a free account
3. Verify your email address

### 2. Get Your Credentials
1. Log in to your Cloudinary dashboard
2. Go to **Dashboard** → **Account Details**
3. Copy these three values:
   - **Cloud Name** (e.g., `dxxxxxxxxxxxxx`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Add to Environment Variables

#### Local Development (.env.local)
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

#### Production (Vercel)
1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add these three variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Click **Save**
5. Redeploy your application

### 4. Test the Integration

1. **Deploy to Vercel** (automatic after pushing)
2. **Test media upload**:
   - Navigate to `/posting` page
   - Upload an image or video
   - Verify the upload succeeds
   - Check your Cloudinary Media Library to see the uploaded file

## How It Works

### Upload Flow
1. User selects a file in the frontend
2. File is sent to `/api/posting/media` endpoint
3. Backend uploads file to Cloudinary
4. Cloudinary returns a secure URL
5. URL and metadata are stored in MongoDB
6. Frontend displays the Cloudinary-hosted image

### File Organization
- Files are organized by user: `users/{userId}/filename`
- Thumbnails are auto-generated with transformations
- Files persist permanently until deleted

### Benefits Over Local Storage
- ✅ **Persistent**: Files don't disappear on serverless function restart
- ✅ **Scalable**: No filesystem size limits
- ✅ **Fast**: Global CDN delivery
- ✅ **Optimized**: Automatic format conversion and compression
- ✅ **Shared**: All serverless instances access the same files

## Cloudinary Free Tier Limits
- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month
- **Videos**: Up to 1 hour of HD video

If you exceed these limits, you'll need to upgrade to a paid plan.

## Troubleshooting

### "Upload failed" errors
- Check that all three environment variables are set correctly
- Verify credentials in Cloudinary dashboard
- Check Vercel deployment logs for specific error messages

### Files not appearing
- Verify the upload succeeded (check browser console)
- Check Cloudinary Media Library for the uploaded file
- Ensure the database has the correct URL stored

### Rate limiting
- Cloudinary has API rate limits on free tier
- If you hit limits, wait a few minutes and try again

## Next Steps
1. Add Cloudinary credentials to your environment
2. Test upload in development: `npm run dev`
3. Commit and push changes
4. Add credentials to Vercel
5. Test in production

## Support
- Cloudinary Docs: https://cloudinary.com/documentation
- Cloudinary Support: https://support.cloudinary.com
