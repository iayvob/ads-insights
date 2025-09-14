# Facebook Posting via Next.js (Graph API Library)

This doc explains how to **post content to Facebook Pages** through a Next.js app using the official Facebook Graph API library.

---

## Workflow Overview

1. Get a valid Facebook Page access token (requires `pages_manage_posts` + `pages_read_engagement`).
2. Use the Facebook Graph API SDK to publish posts.
3. Endpoints:
   - `/PAGE_ID/feed` → text or link posts
   - `/PAGE_ID/photos` → image posts
   - `/PAGE_ID/videos` → video posts

---

## Install Official Graph SDK

```bash
npm install fb
```

---

## Initialize Facebook SDK

```ts
// lib/facebook.ts
import FB from 'fb';

export function initFacebook(accessToken: string) {
  FB.options({ version: 'v19.0' });
  FB.setAccessToken(accessToken);
  return FB;
}
```

---

## Posting Text or Link

```ts
export async function postTextOrLink(
  pageId: string,
  accessToken: string,
  message: string,
  link?: string
) {
  const FB = initFacebook(accessToken);

  return new Promise((resolve, reject) => {
    FB.api(
      `/${pageId}/feed`,
      'post',
      link ? { message, link } : { message },
      (res) => {
        if (!res || res.error) reject(res.error);
        else resolve(res);
      }
    );
  });
}
```

---

## Posting an Image

```ts
export async function postImage(
  pageId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
) {
  const FB = initFacebook(accessToken);

  return new Promise((resolve, reject) => {
    FB.api(`/${pageId}/photos`, 'post', { url: imageUrl, caption }, (res) => {
      if (!res || res.error) reject(res.error);
      else resolve(res);
    });
  });
}
```

---

## Posting a Video

```ts
export async function postVideo(
  pageId: string,
  accessToken: string,
  videoUrl: string,
  description: string
) {
  const FB = initFacebook(accessToken);

  return new Promise((resolve, reject) => {
    FB.api(
      `/${pageId}/videos`,
      'post',
      { file_url: videoUrl, description },
      (res) => {
        if (!res || res.error) reject(res.error);
        else resolve(res);
      }
    );
  });
}
```

---

## API Route Example (Next.js)

```ts
// pages/api/post-facebook.ts
import { postImage } from '../../lib/facebook';

export default async function handler(req, res) {
  const { pageId, accessToken, imageUrl, caption } = req.body;
  try {
    const result = await postImage(pageId, accessToken, imageUrl, caption);
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

---

## Constraints

- Only **Pages** can be posted to, not personal profiles.
- Required permissions: `pages_manage_posts`, `pages_read_engagement`.
- Media URLs must be publicly accessible (Cloudinary, S3, etc.).
- Page access token must be valid and refreshed as needed.

---

## Summary

- Use `fb` Graph API SDK for clean calls.
- `/feed` → text/link posts.
- `/photos` → image posts.
- `/videos` → video posts.
- Must have proper Page access token and permissions.
