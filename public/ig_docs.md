# Instagram Posting via Next.js

This doc focuses strictly on how to **post content to Instagram** through a Next.js app once you already have user authentication and access tokens.

---

## Workflow Overview

1. Get a valid Instagram Graph API access token (user must be a business or creator account).
2. Upload media container (image or video).
3. Publish the container.

---

## Install Helpers

```bash
npm install instagram-graph-api axios
```

---

## Posting an Image

### Step 1: Create Media Container

```ts
import InstagramGraphApi from 'instagram-graph-api';

export async function createImageContainer(
  accessToken: string,
  imageUrl: string,
  caption: string
) {
  const ig = new InstagramGraphApi({ access_token: accessToken });

  const container = await ig.createMediaObject({
    image_url: imageUrl,
    caption: caption,
  });

  return container.id;
}
```

### Step 2: Publish Container

```ts
export async function publishContainer(
  accessToken: string,
  containerId: string
) {
  const ig = new InstagramGraphApi({ access_token: accessToken });
  return await ig.publishMedia(containerId);
}
```

### Combined Example

```ts
export async function postImage(
  accessToken: string,
  imageUrl: string,
  caption: string
) {
  const containerId = await createImageContainer(
    accessToken,
    imageUrl,
    caption
  );
  return await publishContainer(accessToken, containerId);
}
```

---

## Posting a Video

Instagram requires **chunked upload** for videos. With `instagram-graph-api`, you can:

```ts
export async function postVideo(
  accessToken: string,
  videoUrl: string,
  caption: string
) {
  const ig = new InstagramGraphApi({ access_token: accessToken });

  const container = await ig.createMediaObject({
    video_url: videoUrl,
    caption: caption,
    media_type: 'VIDEO',
  });

  return await ig.publishMedia(container.id);
}
```

---

## API Route Example (Next.js)

```ts
// pages/api/post-instagram.ts
import { postImage } from '../../lib/instagram';

export default async function handler(req, res) {
  const { accessToken, imageUrl, caption } = req.body;
  try {
    const result = await postImage(accessToken, imageUrl, caption);
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

---

## Constraints

- Instagram **does not allow text-only posts**. Must include media.
- Access token must be valid and tied to a **business or creator account**.
- Videos: limited to certain formats and durations (check Instagram Graph docs).
- Rate limits apply (200 calls per user per hour typical).

---

## Summary

- Always upload media first (image or video) → get container ID.
- Then publish container.
- Use helper libraries (`instagram-graph-api`) to simplify the process.
- Ensure you store/refresh access tokens properly.
