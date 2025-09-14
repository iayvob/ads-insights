# Facebook Ads Insights (Business Account) with Graph API (Next.js)

This doc explains how to fetch **Ads Insights** (campaign/adset/ad-level performance) for a **Business-managed Ad Account** using the **Facebook Graph API SDK (`fb` library)** in a Next.js application.

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

- You need an **Ad Account Access Token** tied to the **Business Account**.
- Required permission: `ads_read`.
- Flow:
  1. User logs in via Facebook Login (OAuth).
  2. Request `ads_read` permission.
  3. Use `/{businessId}/owned_ad_accounts` to list ad accounts under the Business.
  4. Select the Ad Account and store its `access_token`.

---

## 4. Fetch Ads Insights

```ts
export async function getBusinessAdInsights(
  accessToken: string,
  adAccountId: string
) {
  fb.setAccessToken(accessToken);

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
        level: 'campaign', // can be campaign, adset, or ad
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
// pages/api/facebook/business-ad-insights.ts
import { getBusinessAdInsights } from '../../../lib/facebook';

export default async function handler(req, res) {
  const { adAccountId, token } = req.body;

  try {
    const insights = await getBusinessAdInsights(token, adAccountId);
    res.status(200).json({ insights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
```

---

## 6. Example Metrics

Some useful fields for business ad accounts:

- `impressions` → Ad impressions.
- `reach` → Unique reach.
- `clicks` → Clicks.
- `ctr` → Click-through rate.
- `cpc` → Cost per click.
- `spend` → Total ad spend.
- `actions` → Conversion actions.
- `conversions` → Conversion events.

[Full Ads Insights Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-account/insights)

---

## Notes

- Always query with a **Business-managed Ad Account ID** (`act_<ID>` format).
- Tokens must be refreshed if expired.
- You can use `time_range` instead of `date_preset` for custom ranges.
- Batch queries recommended for multiple ad accounts.

---

## Summary

- Use `fb` SDK with `ads_read` permission and a Business-managed token.
- Call `/{adAccountId}/insights` for performance data.
- Works at campaign, ad set, or ad level.
- Integrated cleanly in Next.js API routes.
