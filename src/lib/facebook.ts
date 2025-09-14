// Facebook Graph API Client - Following the documentation exactly
import FB from 'fb';

export function initFacebook(accessToken: string) {
    (FB as any).options({ version: 'v19.0' });
    (FB as any).setAccessToken(accessToken);
    return FB;
}

export async function postTextOrLink(
    pageId: string,
    accessToken: string,
    message: string,
    link?: string
) {
    const FacebookAPI = initFacebook(accessToken);

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
    accessToken: string,
    imageUrl: string,
    caption: string
) {
    const FacebookAPI = initFacebook(accessToken);

    return new Promise((resolve, reject) => {
        FacebookAPI.api(`/${pageId}/photos`, 'post', { url: imageUrl, caption }, (res: any) => {
            if (!res || res.error) reject(res.error);
            else resolve(res);
        });
    });
}

export async function postVideo(
    pageId: string,
    accessToken: string,
    videoUrl: string,
    description: string
) {
    const FacebookAPI = initFacebook(accessToken);

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