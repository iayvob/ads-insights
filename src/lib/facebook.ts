// Facebook Graph API Client - Following the documentation exactly
import FB from 'fb';
import { env } from '@/validations/env';

export function initFacebook(accessToken: string) {
    (FB as any).options({ version: 'v23.0' }); // Updated to latest stable version
    (FB as any).setAccessToken(accessToken);
    return FB;
}

// Get page access token from page ID using user access token
export async function getPageAccessToken(
    pageId: string,
    userAccessToken: string
): Promise<string | null> {
    try {
        const response = await fetch(
            `https://graph.facebook.com/v23.0/${pageId}?fields=access_token&access_token=${userAccessToken}`
        );

        const data = await response.json();

        if (data.error) {
            console.error('Error getting page access token:', data.error);
            return null;
        }

        return data.access_token || null;
    } catch (error) {
        console.error('Failed to get page access token:', error);
        return null;
    }
}

export async function postTextOrLink(
    pageId: string,
    userAccessToken: string,
    message: string,
    link?: string
) {
    // First get the page access token
    const pageAccessToken = await getPageAccessToken(pageId, userAccessToken);
    if (!pageAccessToken) {
        throw new Error('Failed to get page access token');
    }

    const FacebookAPI = initFacebook(pageAccessToken);

    return new Promise((resolve, reject) => {
        FacebookAPI.api(
            `/${pageId}/feed`,
            'post',
            link ? { message, link } : { message },
            (res: any) => {
                if (!res || res.error) reject(res.error);
                else resolve(res);
            }
        );
    });
}

export async function postImage(
    pageId: string,
    userAccessToken: string,
    imageUrl: string,
    caption: string
) {
    // First get the page access token
    const pageAccessToken = await getPageAccessToken(pageId, userAccessToken);
    if (!pageAccessToken) {
        throw new Error('Failed to get page access token');
    }

    // Check if this is a Cloudinary URL (external HTTPS) or local file URL
    // Cloudinary URLs (https://res.cloudinary.com/...) will skip the local file handling
    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('/api/uploads/') || imageUrl.startsWith('http://localhost')) {
        // Try URL-based upload first (simpler approach)
        console.log('🔍 Facebook: Trying URL-based photo upload...');

        const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${env.APP_URL}${imageUrl}`;
        console.log('🔍 Facebook: Full image URL:', fullImageUrl);

        const FacebookAPI = initFacebook(pageAccessToken);
        return new Promise((resolve, reject) => {
            FacebookAPI.api(`/${pageId}/photos`, 'post', {
                url: fullImageUrl,
                message: caption,
                published: true
            }, (res: any) => {
                console.log('🔍 Facebook URL upload response:', res);
                if (!res || res.error) {
                    console.error('❌ Facebook URL upload failed, trying file upload...', res?.error);
                    // Fall back to file upload
                    postImageFromLocalFile(pageId, pageAccessToken, imageUrl, caption)
                        .then(resolve)
                        .catch(reject);
                } else {
                    console.log('✅ Facebook URL upload successful:', res.id);
                    resolve(res);
                }
            });
        });
    }

    // For Cloudinary URLs (or any external HTTPS URL), use direct URL upload
    // This is the preferred method and works reliably
    console.log('🔍 Facebook: Using URL-based photo upload for external URL');
    const FacebookAPI = initFacebook(pageAccessToken);

    return new Promise((resolve, reject) => {
        FacebookAPI.api(`/${pageId}/photos`, 'post', { url: imageUrl, caption }, (res: any) => {
            if (!res || res.error) reject(res.error);
            else resolve(res);
        });
    });
}

export async function postVideo(
    pageId: string,
    userAccessToken: string,
    videoUrl: string,
    description: string
) {
    // First get the page access token
    const pageAccessToken = await getPageAccessToken(pageId, userAccessToken);
    if (!pageAccessToken) {
        throw new Error('Failed to get page access token');
    }

    // Check if this is a Cloudinary URL (external HTTPS) or local file URL
    // Cloudinary URLs will skip the local file handling
    if (videoUrl.startsWith('/uploads/') || videoUrl.startsWith('/api/uploads/') || videoUrl.startsWith(env.APP_URL)) {
        // This is a local file, we need to upload it directly
        return await postVideoFromLocalFile(pageId, pageAccessToken, videoUrl, description);
    }

    // For Cloudinary URLs (or any external HTTPS URL), use direct URL upload
    // This is the preferred method for cloud-hosted videos
    console.log('🔍 Facebook: Using URL-based video upload for external URL');
    const FacebookAPI = initFacebook(pageAccessToken);

    return new Promise((resolve, reject) => {
        FacebookAPI.api(
            `/${pageId}/videos`,
            'post',
            { file_url: videoUrl, description },
            (res: any) => {
                if (!res || res.error) reject(res.error);
                else resolve(res);
            }
        );
    });
}

// Helper function to upload image directly from local file
async function postImageFromLocalFile(
    pageId: string,
    pageAccessToken: string,
    localImageUrl: string,
    caption: string
) {
    try {
        console.log('🔍 Facebook local file upload:', { pageId, localImageUrl, caption });

        // Extract the file path from the URL
        let urlParts: string | null = null;
        if (localImageUrl.startsWith(env.APP_URL)) {
            // Handle configured APP_URL
            const url = new URL(localImageUrl);
            const pathMatch = url.pathname.match(/\/(api\/)?uploads\/(.+)/);
            urlParts = pathMatch ? pathMatch[2] : null;
        } else if (localImageUrl.startsWith('http://localhost') || localImageUrl.startsWith('https://localhost')) {
            // Handle localhost URLs for development
            const url = new URL(localImageUrl);
            const pathMatch = url.pathname.match(/\/(api\/)?uploads\/(.+)/);
            urlParts = pathMatch ? pathMatch[2] : null;
        } else {
            // Handle relative URLs
            const pathMatch = localImageUrl.match(/\/(api\/)?uploads\/(.+)/);
            urlParts = pathMatch ? pathMatch[2] : null;
        }

        if (!urlParts) {
            throw new Error('Invalid local file URL format');
        }

        const pathSegments = urlParts.split('/');
        if (pathSegments.length < 2) {
            throw new Error('Invalid file path structure');
        }

        const [userId, filename] = pathSegments;
        const fs = require('fs');
        const path = require('path');
        const formData = require('form-data');

        const uploadsDir = path.join(process.cwd(), 'uploads');
        const filePath = path.join(uploadsDir, userId, filename);

        console.log('🔍 Facebook file check:', { uploadsDir, userId, filename, filePath });

        if (!fs.existsSync(filePath)) {
            console.error('❌ Facebook local file not found:', filePath);
            throw new Error(`Local file not found: ${filePath}`);
        }

        console.log('✅ Facebook file exists, uploading to Facebook...');

        // First test if basic posting works to verify the access token
        console.log('🧪 Testing Facebook access token with simple post first...');
        try {
            const testResponse = await fetch(`https://graph.facebook.com/v23.0/${pageId}/feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Test: File upload attempt for ${filename}`,
                    access_token: pageAccessToken
                })
            });
            const testResult = await testResponse.json();
            console.log('🧪 Facebook access token test result:', testResult.error ? 'FAILED' : 'SUCCESS');

            if (testResult.error) {
                throw new Error(`Access token test failed: ${testResult.error.message}`);
            }
        } catch (testError) {
            console.error('❌ Facebook access token test failed:', testError);
            throw testError;
        }

        console.log('🔍 Facebook API details:', {
            pageId,
            pageAccessToken: pageAccessToken ? `${pageAccessToken.substring(0, 20)}...` : 'null',
            caption,
            apiUrl: `https://graph.facebook.com/v23.0/${pageId}/photos`
        });

        // Try using the Facebook SDK approach instead of raw fetch
        const FacebookAPI = initFacebook(pageAccessToken);

        console.log('🔍 Facebook uploading via SDK...');

        try {
            const result = await new Promise((resolve, reject) => {
                FacebookAPI.api(`/${pageId}/photos`, 'post', {
                    source: fs.createReadStream(filePath),
                    message: caption,
                    published: true
                }, (res: any) => {
                    console.log('🔍 Facebook SDK upload response:', res);
                    if (!res || res.error) {
                        console.error('❌ Facebook SDK error:', res?.error);
                        reject(res?.error || new Error('Facebook SDK upload failed'));
                    } else {
                        console.log('✅ Facebook image uploaded successfully via SDK:', res.id);
                        resolve(res);
                    }
                });
            });
            return result;
        } catch (sdkError) {
            console.error('🔄 SDK approach failed, trying direct API approach...', sdkError);

            // Fallback to direct API with different parameters
            return await uploadPhotoDirectAPI(pageId, pageAccessToken, filePath, caption);
        }
    } catch (error) {
        console.error('Error uploading image to Facebook:', error);
        throw error;
    }
}

// Direct API upload as fallback
async function uploadPhotoDirectAPI(pageId: string, pageAccessToken: string, filePath: string, caption: string) {
    try {
        const fs = require('fs');
        const formData = require('form-data');

        console.log('🔍 Facebook: Trying direct API approach...');

        // Try without the published parameter first
        const form = new formData();
        form.append('source', fs.createReadStream(filePath));
        form.append('message', caption);
        form.append('access_token', pageAccessToken);

        const response = await fetch(`https://graph.facebook.com/v23.0/${pageId}/photos`, {
            method: 'POST',
            body: form,
        });

        const result = await response.json();
        console.log('🔍 Facebook direct API response:', result);

        if (result.error) {
            // Try alternate approach: upload unpublished first, then publish
            console.log('🔄 Trying unpublished upload approach...');
            return await uploadPhotoUnpublished(pageId, pageAccessToken, filePath, caption);
        }

        console.log('✅ Facebook direct API upload successful:', result.id);
        return result;
    } catch (error) {
        console.error('Direct API upload failed:', error);
        throw error;
    }
}

// Try uploading as unpublished first
async function uploadPhotoUnpublished(pageId: string, pageAccessToken: string, filePath: string, caption: string) {
    try {
        const fs = require('fs');
        const formData = require('form-data');

        console.log('🔍 Facebook: Trying unpublished upload...');

        const form = new formData();
        form.append('source', fs.createReadStream(filePath));
        form.append('message', caption);
        form.append('published', 'false');
        form.append('access_token', pageAccessToken);

        const response = await fetch(`https://graph.facebook.com/v23.0/${pageId}/photos`, {
            method: 'POST',
            body: form,
        });

        const result = await response.json();
        console.log('🔍 Facebook unpublished upload response:', result);

        if (result.error) {
            throw new Error(result.error.message || 'All upload methods failed');
        }

        // If successful, publish the photo
        if (result.id) {
            console.log('🔍 Facebook: Publishing photo...', result.id);
            const publishResponse = await fetch(`https://graph.facebook.com/v23.0/${result.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_published: true,
                    access_token: pageAccessToken
                })
            });

            const publishResult = await publishResponse.json();
            console.log('🔍 Facebook publish response:', publishResult);
        }

        console.log('✅ Facebook unpublished upload successful:', result.id);
        return result;
    } catch (error) {
        console.error('Error uploading image to Facebook:', error);
        throw error;
    }
}

// Helper function to upload video directly from local file  
async function postVideoFromLocalFile(
    pageId: string,
    pageAccessToken: string,
    localVideoUrl: string,
    description: string
) {
    try {
        console.log('🔍 Facebook local video upload:', { pageId, localVideoUrl, description });

        // Extract the file path from the URL
        let urlParts: string | null = null;
        if (localVideoUrl.startsWith(env.APP_URL)) {
            // Handle configured APP_URL
            const url = new URL(localVideoUrl);
            const pathMatch = url.pathname.match(/\/(api\/)?uploads\/(.+)/);
            urlParts = pathMatch ? pathMatch[2] : null;
        } else if (localVideoUrl.startsWith('http://localhost') || localVideoUrl.startsWith('https://localhost')) {
            // Handle localhost URLs for development
            const url = new URL(localVideoUrl);
            const pathMatch = url.pathname.match(/\/(api\/)?uploads\/(.+)/);
            urlParts = pathMatch ? pathMatch[2] : null;
        } else {
            // Handle relative URLs
            const pathMatch = localVideoUrl.match(/\/(api\/)?uploads\/(.+)/);
            urlParts = pathMatch ? pathMatch[2] : null;
        }

        if (!urlParts) {
            throw new Error('Invalid local video URL format');
        }

        const pathSegments = urlParts.split('/');
        if (pathSegments.length < 2) {
            throw new Error('Invalid video file path structure');
        }

        const [userId, filename] = pathSegments;
        const fs = require('fs');
        const path = require('path');
        const formData = require('form-data');

        const uploadsDir = path.join(process.cwd(), 'uploads');
        const filePath = path.join(uploadsDir, userId, filename);

        console.log('🔍 Facebook video file check:', { uploadsDir, userId, filename, filePath });

        if (!fs.existsSync(filePath)) {
            console.error('❌ Facebook local video file not found:', filePath);
            throw new Error(`Local video file not found: ${filePath}`);
        }

        console.log('✅ Facebook video file exists, uploading to Facebook...');

        // Create form data and upload directly to Facebook
        const form = new formData();
        form.append('source', fs.createReadStream(filePath));
        form.append('description', description);
        form.append('access_token', pageAccessToken);

        const response = await fetch(`https://graph.facebook.com/v23.0/${pageId}/videos`, {
            method: 'POST',
            body: form,
        });

        const result = await response.json();
        console.log('🔍 Facebook video upload response:', result);

        if (result.error) {
            console.error('❌ Facebook video API error:', result.error);
            throw new Error(result.error.message || 'Facebook video upload failed');
        }

        console.log('✅ Facebook video uploaded successfully:', result.id);
        return result;
    } catch (error) {
        console.error('Error uploading video to Facebook:', error);
        throw error;
    }
}