# Instagram Business Ads Insights with Graph API (Next.js)

This doc explains how to fetch **Instagram Business Ads Insights** (impressions, reach, spend, clicks, conversions, etc.) via the **Facebook Graph API SDK (`fb` library)** in a Next.js application. The Instagram account must be linked to a **Facebook Page** under a Business Account.

---

## 1. Install SDK

```bash
npm install fb
```

---

## 2. Initialize SDK

```ts
import FB from 'fb';

const fb = new FB.Facebook({
  appId: process.env.FB_APP_ID!,
  appSecret: process.env.FB_APP_SECRET!,
  version: 'v21.0',
});
```

---

## 3. Authentication

- You need a **Page Access Token** tied to the Facebook Page that manages the IG Business account.
- Required permissions: `ads_read`, `pages_show_list`, `instagram_basic`.
- Flow:
  1. User logs in with Facebook Login (OAuth).
  2. Request the above permissions.
  3. Use `/{pageId}?fields=instagram_business_account` to confirm the IG Business account linkage.
  4. Use `/{businessId}/owned_ad_accounts` to get the ad account ID(s).

---

## 4. Fetch Ads Insights

```ts
export async function getInstagramAdInsights(
  pageAccessToken: string,
  adAccountId: string
) {
  fb.setAccessToken(pageAccessToken);

  return new Promise((resolve, reject) => {
    fb.api(
      `/${adAccountId}/insights`,
      'GET',
      {
        fields: [
          'impressions',
          'reach',
          'clicks',
          'ctr',
          'cpc',
          'spend',
          'actions',
          'conversions',
        ].join(','),
        date_preset: 'last_7d',
        level: 'ad', // campaign, adset, or ad
        filtering: [
          { field: 'publisher_platform', operator: 'IN', value: ['instagram'] },
        ],
      },
      (res: any) => {
        if (!res || res.error) reject(res.error);
        else resolve(res);
      }
    );
  });
}
```

---

## 5. Example Next.js API Route

```ts
// pages/api/instagram/ad-insights.ts
import { getInstagramAdInsights } from '../../../lib/instagram';

export default async function handler(req, res) {
  const { pageAccessToken, adAccountId } = req.body;

  try {
    const insights = await getInstagramAdInsights(pageAccessToken, adAccountId);
    res.status(200).json({ insights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
```

---

## 6. Example Metrics

- `impressions` → Total ad views.
- `reach` → Unique accounts reached.
- `clicks` → Ad clicks.
- `ctr` → Click-through rate.
- `cpc` → Cost per click.
- `spend` → Ad spend.
- `actions` → User actions (likes, comments, shares, etc.).
- `conversions` → Measurable conversions.

[Full Ads Insights Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-account/insights)

---

## Notes

- Always query using an **Ad Account ID** in the `act_<ID>` format.
- Must filter by `publisher_platform = instagram` to isolate Instagram-specific insights.
- Tokens must be refreshed if expired.
- Can use `time_range` instead of `date_preset` for custom ranges.

---

## Summary

- Use `fb` SDK with `ads_read` permission and Page Access Token.
- Call `/{adAccountId}/insights` with `publisher_platform=instagram` to get IG-specific metrics.
- Works at campaign, ad set, or ad level.
- Integrated cleanly in Next.js API routes.
