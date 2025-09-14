# Facebook Page Posts Analytics (Business Account) with Graph API (Next.js)

This doc explains how to fetch **post-level analytics for a Facebook Page** that is linked to a **Business Account**, using the **Facebook Graph API SDK (`fb` library)** in a Next.js application.

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

- You need a **Page Access Token** that belongs to the **Business-managed Page**.
- Required permission: `read_insights`.
- Flow:
  1. User logs in via Facebook Login (OAuth).
  2. Request `pages_show_list` and `read_insights` permissions.
  3. Use `/{userId}/accounts` to fetch all Pages the user manages.
  4. Select the business Page and store its `access_token`.

---

## 4. Fetch Page Post Insights

```ts
export async function getPagePostAnalytics(
  pageAccessToken: string,
  postId: string
) {
  fb.setAccessToken(pageAccessToken);

  return new Promise((resolve, reject) => {
    fb.api(
      `/${postId}/insights`,
      'GET',
      {
        metric: [
          'post_impressions',
          'post_impressions_unique',
          'post_clicks',
          'post_engaged_users',
          'post_reactions_by_type_total',
          'post_video_views',
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
// pages/api/facebook/page-post-analytics.ts
import { getPagePostAnalytics } from '../../../lib/facebook';

export default async function handler(req, res) {
  const { pageToken, postId } = req.body;

  try {
    const analytics = await getPagePostAnalytics(pageToken, postId);
    res.status(200).json({ analytics });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
```

---

## 6. Available Metrics

Some common metrics for business Page posts:

- `post_impressions` → Total impressions.
- `post_impressions_unique` → Unique reach.
- `post_clicks` → Number of clicks.
- `post_engaged_users` → Unique engaged users.
- `post_reactions_by_type_total` → Breakdown of reactions.
- `post_video_views` → Video views.

[Full metrics list](https://developers.facebook.com/docs/graph-api/reference/v21.0/insights)

---

## Notes

- Always use the **Page Access Token** for insights — not the user token.
- Tokens expire; use long-lived tokens where possible.
- Batch requests recommended for multiple posts.

---

## Summary

- Use `fb` SDK with a **Page Access Token** tied to the business Page.
- Call `/{postId}/insights` to fetch analytics.
- Metrics cover impressions, reach, engagement, clicks, reactions, and views.
- Fully compatible with Next.js API routes.
