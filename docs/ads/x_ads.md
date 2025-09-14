# Twitter Ads Insights with Twitter Ads API (Next.js)

This doc explains how to fetch **Twitter Ads Insights** (impressions, spend, clicks, engagements, conversions, etc.) using the **Twitter Ads API** with the **`twitter-api-v2` library** in a Next.js application.

---

## 1. Install Library

```bash
npm install twitter-api-v2
```

---

## 2. Initialize Client

```ts
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID!,
  clientSecret: process.env.TWITTER_CLIENT_SECRET!,
});
```

---

## 3. Authentication

- Twitter Ads API requires **OAuth 1.0a user context** with ads permissions.
- Required scopes: `ads.read`.
- Flow:
  1. User authenticates with Twitter OAuth 1.0a.
  2. Obtain **access token** and **access token secret**.
  3. Use them to authenticate API calls.

```ts
const adsClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: userAccessToken,
  accessSecret: userAccessSecret,
});
```

---

## 4. Fetch Ads Insights

The Ads API uses **accounts** and **stats endpoints**.

```ts
export async function getTwitterAdsInsights(
  accountId: string,
  adsClient: TwitterApi
) {
  const endpoint = `https://ads-api.twitter.com/12/stats/accounts/${accountId}`;

  const response = await adsClient.get(endpoint, {
    entity: 'CAMPAIGN', // or LINE_ITEM, PROMOTED_TWEET
    entity_ids: 'all',
    start_time: '2024-09-01T00:00:00Z',
    end_time: '2024-09-07T23:59:59Z',
    granularity: 'DAY',
    metric_groups: 'ENGAGEMENT,BILLING,WEB_CONVERSION',
  });

  return response;
}
```

---

## 5. Example Next.js API Route

```ts
// pages/api/twitter/ads-insights.ts
import { getTwitterAdsInsights } from '../../../lib/twitter-ads';
import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  const { accountId, accessToken, accessSecret } = req.body;

  const adsClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken,
    accessSecret,
  });

  try {
    const insights = await getTwitterAdsInsights(accountId, adsClient);
    res.status(200).json({ insights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
```

---

## 6. Example Metrics

- `impressions` → Ad impressions.
- `engagements` → Total engagements.
- `clicks` → Clicks on promoted content.
- `billed_charge_local_micro` → Spend in local currency (micro-units).
- `conversions` → Web conversions (if tracking enabled).

[Full Twitter Ads Metrics Reference](https://developer.twitter.com/en/docs/twitter-ads-api/analytics/overview)

---

## Notes

- Ads API requires **Elevated Ads Developer access**.
- OAuth 1.0a is required (OAuth 2.0 does not support Ads API yet).
- Rate limits differ from standard Twitter API v2.

---

## Summary

- Use `twitter-api-v2` with OAuth 1.0a user tokens.
- Call Ads API `/stats/accounts/:account_id` endpoint.
- Fetch campaign/adset/ad-level insights.
- Works in Next.js API routes with secure token handling.
