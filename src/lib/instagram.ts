// Instagram Graph API Client - URL-based media upload with file fallback  
const INSTAGRAM_API_BASE = 'https://graph.facebook.com/v23.0';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { env } from '@/validations/env';

export interface InstagramMediaResponse {
    id: string;
    permalink?: string;
}

export interface InstagramContainerStatus {
    status_code: 'FINISHED' | 'IN_PROGRESS' | 'ERROR' | 'EXPIRED';
    id: string;
}

/**
 * Check the status of an Instagram media container
 */
async function checkContainerStatus(containerId: string, accessToken: string): Promise<InstagramContainerStatus> {
    const response = await fetch(
        `${INSTAGRAM_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
    );

    const result = await response.json();
    if (result.error) {
        throw new Error(`Failed to check container status: ${result.error.message}`);
    }

    return result;
}

/**
 * Wait for container to be ready for publishing (status = FINISHED)
 */
async function waitForContainerReady(containerId: string, accessToken: string, maxAttempts: number = 10): Promise<boolean> {
    console.log('🔍 Instagram: Waiting for container to be ready for publishing:', containerId);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const status = await checkContainerStatus(containerId, accessToken);
            console.log(`🔍 Instagram: Container status check ${attempt}/${maxAttempts}:`, status.status_code);

            if (status.status_code === 'FINISHED') {
                console.log('✅ Instagram: Container is ready for publishing');
                return true;
            }

            if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
                console.error('❌ Instagram: Container processing failed:', status.status_code);
                return false;
            }

            // Wait 3 seconds before next check (as recommended by Meta docs)
            if (attempt < maxAttempts) {
                console.log('⏳ Instagram: Container still processing, waiting 3 seconds...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error(`❌ Instagram: Error checking container status (attempt ${attempt}):`, error);
            if (attempt === maxAttempts) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    console.error('❌ Instagram: Container did not become ready within timeout period');
    return false;
}

/**
 * Validate access token and business account relationship, return Facebook Page ID and Page Access Token
 */
async function validateTokenAndAccount(accessToken: string, igBusinessAccountId: string): Promise<{ pageId: string, pageAccessToken: string }> {
    try {
        console.log('🔍 Instagram: Testing access token validity...');

        // First, check if the token is valid by getting user info (removing deprecated username field)
        const meResponse = await fetch(
            `${INSTAGRAM_API_BASE}/me?access_token=${accessToken}&fields=id,name`
        );

        const meResult = await meResponse.json();
        console.log('🔍 Instagram: Access token test result:', meResult);

        if (meResult.error) {
            throw new Error(`Access token invalid: ${meResult.error.message}`);
        }

        // Next, check if we can access the business account (removing deprecated username and invalid account_type fields)
        console.log('🔍 Instagram: Testing business account access...');
        const accountResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${igBusinessAccountId}?access_token=${accessToken}&fields=id,name`
        );

        const accountResult = await accountResponse.json();
        console.log('🔍 Instagram: Business account test result:', accountResult);

        if (accountResult.error) {
            console.error('❌ Instagram: Business account access failed, trying to find correct account...');

            // Try to find Instagram accounts connected to this token (removing deprecated username field)
            console.log('🔍 Instagram: Searching for accessible Instagram accounts...');
            const pagesResponse = await fetch(
                `${INSTAGRAM_API_BASE}/me/accounts?access_token=${accessToken}&fields=id,name,instagram_business_account{id,name}`
            );

            const pagesResult = await pagesResponse.json();
            console.log('🔍 Instagram: Connected pages and accounts:', JSON.stringify(pagesResult, null, 2));

            throw new Error(`Business account access denied: ${accountResult.error.message}`);
        }

        // Find the Facebook Page ID that corresponds to this Instagram Business Account
        console.log('🔍 Instagram: Finding Facebook Page ID for Instagram Business Account...');
        const pagesResponse = await fetch(
            `${INSTAGRAM_API_BASE}/me/accounts?access_token=${accessToken}&fields=id,name,instagram_business_account{id,name}`
        );

        const pagesResult = await pagesResponse.json();
        console.log('🔍 Instagram: Connected pages search result:', JSON.stringify(pagesResult, null, 2));

        if (pagesResult.error) {
            throw new Error(`Failed to find connected pages: ${pagesResult.error.message}`);
        }

        // Find the page that has the matching Instagram Business Account
        const matchingPage = pagesResult.data?.find((page: any) =>
            page.instagram_business_account?.id === igBusinessAccountId
        );

        if (!matchingPage) {
            throw new Error(`No Facebook Page found for Instagram Business Account ${igBusinessAccountId}`);
        }

        console.log('✅ Instagram: Found matching Facebook Page:', {
            pageId: matchingPage.id,
            pageName: matchingPage.name,
            igAccountId: matchingPage.instagram_business_account.id,
            igAccountName: matchingPage.instagram_business_account.name
        });

        // Get Page Access Token (this is the key step!)
        console.log('🔍 Instagram: Getting Page Access Token...');
        const pageAccessTokenResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${matchingPage.id}?fields=access_token&access_token=${accessToken}`
        );

        const pageAccessTokenResult = await pageAccessTokenResponse.json();
        console.log('🔍 Instagram: Page access token result:', pageAccessTokenResult.error ? 'ERROR' : 'SUCCESS');

        if (pageAccessTokenResult.error) {
            throw new Error(`Failed to get page access token: ${pageAccessTokenResult.error.message}`);
        }

        if (!pageAccessTokenResult.access_token) {
            throw new Error('No page access token returned');
        }

        console.log('✅ Instagram: Page access token obtained successfully');
        console.log('✅ Instagram: Token and account validation successful');

        return {
            pageId: matchingPage.id,
            pageAccessToken: pageAccessTokenResult.access_token
        };
    } catch (error) {
        console.error('❌ Instagram: Token/account validation failed:', error);
        throw error;
    }
}/**
 * Upload photo to Instagram using URL-based approach with file fallback
 */
export async function postInstagramImage(
    igBusinessAccountId: string,
    accessToken: string,
    imageUrl: string,
    caption: string = ''
): Promise<any> {
    console.log('🔍 Instagram photo upload starting...', { igBusinessAccountId, imageUrl: imageUrl.substring(0, 100) + '...' });

    try {
        // Step 1: Prepare URL for upload
        // For Cloudinary URLs (https://res.cloudinary.com/...), use them directly
        // For local URLs, convert to absolute URL
        let absoluteUrl = imageUrl;
        if (imageUrl.startsWith('/')) {
            absoluteUrl = `${env.APP_URL}${imageUrl}`;
        } else if (imageUrl.startsWith('http://localhost:') || imageUrl.startsWith('https://localhost:')) {
            // Replace localhost URLs with APP_URL
            const url = new URL(imageUrl);
            absoluteUrl = `${env.APP_URL}${url.pathname}`;
        }
        // Cloudinary URLs (and other HTTPS URLs) pass through unchanged

        console.log('🔍 Instagram: Attempting URL-based upload with:', absoluteUrl.substring(0, 100) + '...');
        console.log('🔍 Instagram: Using Instagram Business Account ID:', igBusinessAccountId);
        console.log('🔍 Instagram: Using user access token for authentication');

        const containerResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${igBusinessAccountId}/media`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_url: absoluteUrl,
                    caption: caption,
                    access_token: accessToken
                })
            }
        );

        const containerResult = await containerResponse.json();
        console.log('🔍 Instagram URL upload response:', containerResult);

        // If URL upload fails, try file upload fallback
        if (containerResult.error) {
            console.log('🔄 Instagram: URL upload failed, trying file upload fallback...');
            return await postInstagramImageFromFile(igBusinessAccountId, accessToken, imageUrl, caption);
        }

        // Step 2: Wait for container to be ready before publishing
        console.log('🔍 Instagram: Media container created, checking status before publishing:', containerResult.id);
        const isReady = await waitForContainerReady(containerResult.id, accessToken);

        if (!isReady) {
            throw new Error('Media container failed to become ready for publishing');
        }

        // Step 3: Publish the media container (now ready)
        console.log('🔍 Instagram: Publishing media container:', containerResult.id);

        const publishResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${igBusinessAccountId}/media_publish`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    creation_id: containerResult.id,
                    access_token: accessToken
                })
            }
        );

        const publishResult = await publishResponse.json();
        console.log('🔍 Instagram publish response:', publishResult);

        if (publishResult.error) {
            console.error('❌ Instagram publish failed:', publishResult.error);
            throw new Error(publishResult.error.message || 'Failed to publish Instagram media');
        }

        console.log('✅ Instagram image uploaded successfully (URL method):', publishResult.id);
        return publishResult;

    } catch (error) {
        console.error('❌ Instagram photo upload failed (both methods):', error);
        throw error;
    }
}

/**
 * Upload photo to Instagram using direct file upload (fallback method)
 */
async function postInstagramImageFromFile(
    igBusinessAccountId: string,
    accessToken: string,
    imageUrl: string,
    caption: string = ''
): Promise<any> {
    console.log('🔍 Instagram: Starting file upload fallback...');
    console.log('🔍 Instagram: Processing URL for fallback:', imageUrl.substring(0, 100) + '...');

    try {
        // Convert URL to local file path
        let filePath: string;

        if (imageUrl.startsWith('/api/uploads/')) {
            // Extract the file path from the URL: /api/uploads/userId/filename
            const urlPath = imageUrl.replace('/api/uploads/', '');
            // Use absolute path from process.cwd()
            const uploadsDir = process.env.UPLOADS_DIR || 'uploads';
            filePath = path.join(process.cwd(), uploadsDir, urlPath);
        } else if (imageUrl.startsWith(env.APP_URL)) {
            // Handle our configured APP_URL - extract the path part
            const url = new URL(imageUrl);
            if (url.pathname.startsWith('/api/uploads/')) {
                const urlPath = url.pathname.replace('/api/uploads/', '');
                const uploadsDir = process.env.UPLOADS_DIR || 'uploads';
                filePath = path.join(process.cwd(), uploadsDir, urlPath);
            } else {
                throw new Error('Invalid APP_URL path');
            }
        } else if (imageUrl.startsWith('http://localhost:') || imageUrl.startsWith('https://localhost:')) {
            // Handle localhost URLs for development - extract the path part
            const url = new URL(imageUrl);
            if (url.pathname.startsWith('/api/uploads/')) {
                const urlPath = url.pathname.replace('/api/uploads/', '');
                const uploadsDir = process.env.UPLOADS_DIR || 'uploads';
                filePath = path.join(process.cwd(), uploadsDir, urlPath);
            } else {
                throw new Error('Invalid localhost URL path');
            }
        } else if (imageUrl.startsWith('http')) {
            throw new Error('Cannot use file upload fallback for external URLs');
        } else {
            filePath = imageUrl; // Assume it's already a file path
        } console.log('🔍 Instagram: Attempting to read file from:', filePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Create form data for file upload
        const formData = new FormData();
        formData.append('image', fs.createReadStream(filePath));
        formData.append('caption', caption);
        formData.append('access_token', accessToken);

        console.log('🔍 Instagram: Uploading file directly using Instagram Business Account ID and user access token:', igBusinessAccountId);

        const uploadResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${igBusinessAccountId}/media`,
            {
                method: 'POST',
                body: formData as any
            }
        );

        const uploadResult = await uploadResponse.json();
        console.log('🔍 Instagram file upload response:', uploadResult);

        if (uploadResult.error) {
            console.error('❌ Instagram file upload failed:', uploadResult.error);
            throw new Error(uploadResult.error.message || 'Failed to upload Instagram media file');
        }

        // Wait for container to be ready before publishing
        console.log('🔍 Instagram: File upload container created, checking status before publishing:', uploadResult.id);
        const isReady = await waitForContainerReady(uploadResult.id, accessToken);

        if (!isReady) {
            throw new Error('File upload container failed to become ready for publishing');
        }

        // Publish the uploaded media (now ready)
        console.log('🔍 Instagram: Publishing file upload container:', uploadResult.id);

        const publishResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${igBusinessAccountId}/media_publish`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    creation_id: uploadResult.id,
                    access_token: accessToken
                })
            }
        );

        const publishResult = await publishResponse.json();
        console.log('🔍 Instagram file publish response:', publishResult);

        if (publishResult.error) {
            console.error('❌ Instagram file publish failed:', publishResult.error);
            throw new Error(publishResult.error.message || 'Failed to publish Instagram media');
        }

        console.log('✅ Instagram image uploaded successfully (file method):', publishResult.id);
        return publishResult;

    } catch (error) {
        console.error('❌ Instagram file upload fallback failed:', error);
        throw error;
    }
}

/**
 * Upload video to Instagram using URL-based approach  
 */
export async function postInstagramVideo(
    igBusinessAccountId: string,
    accessToken: string,
    videoUrl: string,
    caption: string = ''
): Promise<any> {
    console.log('🔍 Instagram video upload starting...', { igBusinessAccountId, videoUrl: videoUrl.substring(0, 100) + '...' });

    try {
        // Step 1: Prepare URL for upload
        // For Cloudinary URLs (https://res.cloudinary.com/...), use them directly
        // For local URLs, convert to absolute URL
        let absoluteUrl = videoUrl;
        if (videoUrl.startsWith('/')) {
            absoluteUrl = `${env.APP_URL}${videoUrl}`;
        } else if (videoUrl.startsWith('http://localhost:') || videoUrl.startsWith('https://localhost:')) {
            // Replace localhost URLs with APP_URL
            const url = new URL(videoUrl);
            absoluteUrl = `${env.APP_URL}${url.pathname}`;
        }
        // Cloudinary URLs (and other HTTPS URLs) pass through unchanged

        console.log('🔍 Instagram: Creating video container with URL:', absoluteUrl.substring(0, 100) + '...');
        console.log('🔍 Instagram: Using user access token for video upload authentication');

        const containerResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${igBusinessAccountId}/media`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    video_url: absoluteUrl,
                    caption: caption,
                    media_type: 'VIDEO',
                    access_token: accessToken
                })
            }
        );

        const containerResult = await containerResponse.json();
        console.log('🔍 Instagram video container creation response:', containerResult);

        if (containerResult.error) {
            console.error('❌ Instagram video container creation failed:', containerResult.error);
            throw new Error(containerResult.error.message || 'Failed to create Instagram video container');
        }

        // Step 2: Wait for container to be ready before publishing (videos may take longer)
        console.log('🔍 Instagram: Video container created, checking status before publishing:', containerResult.id);
        const isReady = await waitForContainerReady(containerResult.id, accessToken, 20); // Longer timeout for videos

        if (!isReady) {
            throw new Error('Video container failed to become ready for publishing');
        }

        // Step 3: Publish the video container (now ready)
        console.log('🔍 Instagram: Publishing video container:', containerResult.id);

        const publishResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${igBusinessAccountId}/media_publish`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    creation_id: containerResult.id,
                    access_token: accessToken
                })
            }
        );

        const publishResult = await publishResponse.json();
        console.log('🔍 Instagram video publish response:', publishResult);

        if (publishResult.error) {
            console.error('❌ Instagram video publish failed:', publishResult.error);
            throw new Error(publishResult.error.message || 'Failed to publish Instagram video');
        }

        console.log('✅ Instagram video uploaded successfully:', publishResult.id);
        return publishResult;

    } catch (error) {
        console.error('❌ Instagram video upload failed:', error);
        throw error;
    }
}

/**
 * Upload carousel (multiple images/videos) to Instagram
 */
export async function postInstagramCarousel(
    igBusinessAccountId: string,
    accessToken: string,
    mediaItems: Array<{ url: string; type: 'image' | 'video' }>,
    caption: string = ''
): Promise<any> {
    console.log('🔍 Instagram carousel upload starting...', { igBusinessAccountId, itemCount: mediaItems.length });

    try {
        // Step 1: Create containers for each media item
        const childContainers = [];

        console.log('🔍 Instagram: Using user access token for carousel upload authentication');

        for (let i = 0; i < mediaItems.length; i++) {
            const media = mediaItems[i];

            // Prepare URL - Cloudinary URLs pass through unchanged
            let absoluteUrl = media.url;
            if (media.url.startsWith('/')) {
                absoluteUrl = `${env.APP_URL}${media.url}`;
            }
            // Cloudinary URLs (and other HTTPS URLs) are used directly

            console.log(`🔍 Instagram: Creating carousel item ${i + 1}/${mediaItems.length}:`, absoluteUrl.substring(0, 100) + '...');

            const childContainer = await fetch(
                `${INSTAGRAM_API_BASE}/${igBusinessAccountId}/media`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        [media.type === 'video' ? 'video_url' : 'image_url']: absoluteUrl,
                        is_carousel_item: true,
                        access_token: accessToken
                    })
                }
            );

            const childResult = await childContainer.json();
            console.log(`🔍 Instagram carousel item ${i + 1} container response:`, childResult);

            if (childResult.error) {
                console.error(`❌ Instagram carousel item ${i + 1} failed:`, childResult.error);
                throw new Error(`Failed to create carousel item ${i + 1}: ${childResult.error.message}`);
            }

            childContainers.push(childResult.id);
        }

        // Step 2: Create carousel container
        console.log('🔍 Instagram: Creating carousel container with children:', childContainers);

        const carouselContainer = await fetch(
            `${INSTAGRAM_API_BASE}/${igBusinessAccountId}/media`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    media_type: 'CAROUSEL',
                    caption: caption,
                    children: childContainers,
                    access_token: accessToken
                })
            }
        );

        const containerResult = await carouselContainer.json();
        console.log('🔍 Instagram carousel container response:', containerResult);

        if (containerResult.error) {
            console.error('❌ Instagram carousel container creation failed:', containerResult.error);
            throw new Error(`Failed to create carousel container: ${containerResult.error.message}`);
        }

        // Step 3: Publish the carousel
        console.log('🔍 Instagram: Publishing carousel container:', containerResult.id);

        const publishResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${igBusinessAccountId}/media_publish`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    creation_id: containerResult.id,
                    access_token: accessToken
                })
            }
        );

        const publishResult = await publishResponse.json();
        console.log('🔍 Instagram carousel publish response:', publishResult);

        if (publishResult.error) {
            console.error('❌ Instagram carousel publish failed:', publishResult.error);
            throw new Error(`Failed to publish carousel: ${publishResult.error.message}`);
        }

        console.log('✅ Instagram carousel uploaded successfully:', publishResult.id);
        return publishResult;

    } catch (error) {
        console.error('❌ Instagram carousel upload failed:', error);
        throw error;
    }
}

// Legacy functions for backward compatibility
export async function createImageContainer(
    accessToken: string,
    imageUrl: string,
    caption: string,
    businessAccountId: string
) {
    try {
        const result = await postInstagramImage(businessAccountId, accessToken, imageUrl, caption);
        return { success: true, id: result.id };
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}

export async function createVideoContainer(
    accessToken: string,
    videoUrl: string,
    caption: string,
    businessAccountId: string
) {
    try {
        const result = await postInstagramVideo(businessAccountId, accessToken, videoUrl, caption);
        return { success: true, id: result.id };
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}

export async function publishContainer(
    accessToken: string,
    containerId: string,
    businessAccountId: string
): Promise<InstagramMediaResponse | null> {
    // This function is deprecated - new functions handle publishing automatically
    console.warn('publishContainer is deprecated - use postInstagramImage/Video instead');
    return null;
}

export async function postImage(
    accessToken: string,
    imageUrl: string,
    caption: string,
    businessAccountId: string
): Promise<InstagramMediaResponse | null> {
    try {
        const result = await postInstagramImage(businessAccountId, accessToken, imageUrl, caption);
        return {
            id: result.id,
            permalink: result.permalink
        };
    } catch (error) {
        console.error('Error posting image to Instagram:', error);
        return null;
    }
}

export async function postVideo(
    accessToken: string,
    videoUrl: string,
    caption: string,
    businessAccountId: string
): Promise<InstagramMediaResponse | null> {
    try {
        const result = await postInstagramVideo(businessAccountId, accessToken, videoUrl, caption);
        return {
            id: result.id,
            permalink: result.permalink
        };
    } catch (error) {
        console.error('Error posting video to Instagram:', error);
        return null;
    }
}