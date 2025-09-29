// Facebook Graph API Client - Following the documentation exactly
import FB from 'fb';

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