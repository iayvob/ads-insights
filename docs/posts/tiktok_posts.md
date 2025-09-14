# TikTok Posts Analytics in Next.js

This doc explains how to fetch TikTok **posts (video) analytics** for a TikTok Business account after completing OAuth 2.0. We'll use the [`tiktok-business`](https://www.npmjs.com/package/tiktok-business) library where possible.

---

## 1. Install Dependencies

```bash
npm install tiktok-business
```

---

## 2. Initialize TikTok Client

After OAuth 2.0, you will have an **access token**. Use it with the `tiktok-business` SDK:

```javascript
import TikTokAPI from 'tiktok-business';

const tiktok = new TikTokAPI({
  accessToken: process.env.TIKTOK_ACCESS_TOKEN,
});
```

---

## 3. Fetch User's Video List

You need video IDs to fetch analytics.

```javascript
// pages/api/tiktok/videos.js
import TikTokAPI from 'tiktok-business';

export default async function handler(req, res) {
  const tiktok = new TikTokAPI({
    accessToken: process.env.TIKTOK_ACCESS_TOKEN,
  });

  try {
    const response = await tiktok.video.list({
      advertiser_id: process.env.TIKTOK_ADVERTISER_ID, // required for business accounts
      page_size: 10,
    });

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 4. Fetch Video Analytics

Once you have video IDs, you can request analytics (views, likes, comments, shares, CTR, etc.):

```javascript
// pages/api/tiktok/analytics.js
import TikTokAPI from 'tiktok-business';

export default async function handler(req, res) {
  const { video_id } = req.query;

  const tiktok = new TikTokAPI({
    accessToken: process.env.TIKTOK_ACCESS_TOKEN,
  });

  try {
    const response = await tiktok.video.analytics({
      advertiser_id: process.env.TIKTOK_ADVERTISER_ID,
      video_id,
    });

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 5. Example Frontend Fetch

```javascript
async function getTikTokAnalytics(videoId) {
  const res = await fetch(`/api/tiktok/analytics?video_id=${videoId}`);
  return res.json();
}
```

---

## 6. Key Notes

- You **must use a TikTok Business account** to access analytics.
- The advertiser ID is required for most endpoints.
- TikTok rate limits apply.
- If the library does not cover a specific endpoint, you can call the TikTok **Business Open API** directly using `fetch` or `axios`.

---

✅ With this setup, your Next.js app can fetch TikTok posts analytics (views, likes, comments, shares, etc.) for a linked Business account.
