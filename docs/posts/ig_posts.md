# Instagram Business Account Posts Analytics with Graph API (Next.js)

This doc explains how to fetch **Instagram Business Account post analytics** (impressions, reach, engagement, etc.) via the **Facebook Graph API SDK (`fb` library)** in a Next.js application. The Instagram account must be linked to a **Facebook Page** that belongs to a Business Account.

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
- Required permissions: `instagram_basic`, `pages_show_list`, `instagram_manage_insights`.
- Flow:
  1. User logs in with Facebook Login (OAuth).
  2. Request the above permissions.
  3. Use `/{pageId}?fields=instagram_business_account` to get the IG Business Account ID.

---

## 4. Fetch Post Analytics

```ts
export async function getInstagramPostInsights(
  pageAccessToken: string,
  igBusinessId: string,
  mediaId: string
) {
  fb.setAccessToken(pageAccessToken);

  return new Promise((resolve, reject) => {
    fb.api(
      `/${mediaId}/insights`,
      'GET',
      {
        metric: [
          'impressions',
          'reach',
          'engagement',
          'saved',
          'video_views',
        ].join(','),
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
// pages/api/instagram/post-analytics.ts
import { getInstagramPostInsights } from '../../../lib/instagram';

export default async function handler(req, res) {
  const { pageAccessToken, igBusinessId, mediaId } = req.body;

  try {
    const insights = await getInstagramPostInsights(
      pageAccessToken,
      igBusinessId,
      mediaId
    );
    res.status(200).json({ insights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
```

---

## 6. Example Metrics

- `impressions` → Total views of the post.
- `reach` → Unique accounts reached.
- `engagement` → Likes + comments + shares + saves.
- `saved` → Saves of the post.
- `video_views` → Video views (if applicable).

[Full Instagram Insights Reference](https://developers.facebook.com/docs/instagram-api/reference/ig-media/insights)

---

## Notes

- The `mediaId` is the IG media object ID, not the shortcode.
- Always use a **Page Access Token** with `instagram_manage_insights`.
- Insights availability depends on media type (photos, videos, reels, etc.).
- Batch queries possible if you want analytics for multiple posts.

---

## Summary

- Use `fb` SDK with a Page Access Token and IG Business Account ID.
- Call `/{mediaId}/insights` for post metrics.
- Works for photo, video, carousel, and reel posts.
- Designed for Next.js API integration.
