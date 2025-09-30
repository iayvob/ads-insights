import { env } from '@/validations/env';
import { TwitterApi } from 'twitter-api-v2';

export function getTwitterAppClient() {
    return new TwitterApi({
        appKey: env.TWITTER_API_KEY!,
        appSecret: env.TWITTER_API_SECRET!,
    });
}

export function getTwitterUserClient(accessToken: string, accessSecret?: string) {
    // For OAuth 2.0 Bearer token authentication (Twitter API v2)
    if (!accessSecret) {
        return new TwitterApi(accessToken);
    }

    // For OAuth 1.0a authentication (legacy support)
    return new TwitterApi({
        appKey: env.TWITTER_API_KEY!,
        appSecret: env.TWITTER_API_SECRET!,
        accessToken,
        accessSecret,
    });
}

export function getTwitterV2Client(bearerToken: string) {
    return new TwitterApi(bearerToken);
}