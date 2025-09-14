import { TwitterApi } from 'twitter-api-v2';

export function getTwitterAppClient() {
    return new TwitterApi({
        appKey: process.env.TWITTER_CONSUMER_KEY!,
        appSecret: process.env.TWITTER_CONSUMER_SECRET!,
    });
}

export function getTwitterUserClient(accessToken: string, accessSecret: string) {
    return new TwitterApi({
        appKey: process.env.TWITTER_CONSUMER_KEY!,
        appSecret: process.env.TWITTER_CONSUMER_SECRET!,
        accessToken,
        accessSecret,
    });
}