// Instagram Graph API Client - Direct HTTP implementation following documentation
import axios from 'axios';

const INSTAGRAM_API_BASE = 'https://graph.facebook.com/v18.0';

export interface InstagramMediaResponse {
    id: string;
    permalink?: string;
}

export async function createImageContainer(
    accessToken: string,
    imageUrl: string,
    caption: string,
    businessAccountId: string
) {
    try {
        const response = await axios.post(`${INSTAGRAM_API_BASE}/${businessAccountId}/media`, {
            image_url: imageUrl,
            caption: caption,
            access_token: accessToken
        });

        return { success: true, id: response.data.id };
    } catch (error: any) {
        console.error('Error creating Instagram image container:', error);
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message
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
        const response = await axios.post(`${INSTAGRAM_API_BASE}/${businessAccountId}/media`, {
            video_url: videoUrl,
            caption: caption,
            media_type: 'VIDEO',
            access_token: accessToken
        });

        return { success: true, id: response.data.id };
    } catch (error: any) {
        console.error('Error creating Instagram video container:', error);
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message
        };
    }
}

export async function publishContainer(
    accessToken: string,
    containerId: string,
    businessAccountId: string
): Promise<InstagramMediaResponse | null> {
    try {
        const response = await axios.post(`${INSTAGRAM_API_BASE}/${businessAccountId}/media_publish`, {
            creation_id: containerId,
            access_token: accessToken
        });

        return {
            id: response.data.id,
            permalink: response.data.permalink
        };
    } catch (error: any) {
        console.error('Error publishing Instagram media:', error);
        return null;
    }
}

export async function postImage(
    accessToken: string,
    imageUrl: string,
    caption: string,
    businessAccountId: string
): Promise<InstagramMediaResponse | null> {
    try {
        // Step 1: Create media container
        const containerResult = await createImageContainer(
            accessToken,
            imageUrl,
            caption,
            businessAccountId
        );

        if (!containerResult.success || !containerResult.id) {
            throw new Error(containerResult.error || 'Failed to create image container');
        }

        // Step 2: Publish the container
        return await publishContainer(accessToken, containerResult.id, businessAccountId);
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
        // Step 1: Create media container
        const containerResult = await createVideoContainer(
            accessToken,
            videoUrl,
            caption,
            businessAccountId
        );

        if (!containerResult.success || !containerResult.id) {
            throw new Error(containerResult.error || 'Failed to create video container');
        }

        // Step 2: Publish the container
        return await publishContainer(accessToken, containerResult.id, businessAccountId);
    } catch (error) {
        console.error('Error posting video to Instagram:', error);
        return null;
    }
}