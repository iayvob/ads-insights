# Guide: Posting Tweets with Text and Media via a Next.js App

This document explains how to build a **Next.js app** that lets users:

1. Authenticate with Twitter/X using OAuth.
2. Post tweets either with **text only** or with **media (images/videos)**.

---

## 1. Prerequisites

- Twitter/X Developer account with **Elevated access**.
- App created in [Twitter Developer Portal](https://developer.twitter.com).
- API keys and tokens:
  - Consumer Key (API Key)
  - Consumer Secret (API Secret)
  - Access Token & Secret will be obtained **per user** after OAuth login.

- `twitter-api-v2` library installed:

  ```bash
  npm install twitter-api-v2
  ```

---

## 2. Project Structure

```
/lib/twitter.ts      → Twitter client setup
/pages/api/twitter-auth.ts    → Starts OAuth flow
/pages/api/twitter-callback.ts → Handles OAuth callback
/pages/api/post-tweet.ts      → Posts tweets (text + optional media)
/components/TweetForm.tsx     → Frontend form for posting
```

---

## 3. Twitter Client Setup

`/lib/twitter.ts`

```ts
import { TwitterApi } from 'twitter-api-v2';

export function getTwitterAppClient() {
  return new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY!,
    appSecret: process.env.TWITTER_CONSUMER_SECRET!,
  });
}
```

---

## 4. User Authentication (OAuth 1.0a)

### Step 1: Start Auth

`/pages/api/twitter-auth.ts`

```ts
import { getTwitterAppClient } from '../../lib/twitter';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = getTwitterAppClient();
  const callbackUrl = 'http://localhost:3000/api/twitter-callback'; // update in prod

  const { url, oauth_token, oauth_token_secret } =
    await client.generateAuthLink(callbackUrl);

  // TODO: Store oauth_token_secret temporarily (DB/session)

  res.redirect(url);
}
```

### Step 2: Handle Callback

`/pages/api/twitter-callback.ts`

```ts
import { getTwitterAppClient } from '../../lib/twitter';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { oauth_token, oauth_verifier } = req.query;

  const client = getTwitterAppClient();
  const {
    client: loggedClient,
    accessToken,
    accessSecret,
  } = await client.login(oauth_token as string, oauth_verifier as string);

  // 🔑 Save accessToken & accessSecret in DB per user
  // e.g. db.user.update({ twitterAccess: accessToken, twitterSecret: accessSecret })

  res.send('Twitter connected! You can now post.');
}
```

---

## 5. Posting Tweets

`/pages/api/post-tweet.ts`

```ts
import { TwitterApi } from 'twitter-api-v2';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { userId, text, mediaBase64, mediaType } = req.body;

    // Fetch user tokens from DB
    const { twitterAccess, twitterSecret } = await db.user.findUnique({
      where: { id: userId },
    });

    const client = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY!,
      appSecret: process.env.TWITTER_CONSUMER_SECRET!,
      accessToken: twitterAccess,
      accessSecret: twitterSecret,
    });

    let mediaId;
    if (mediaBase64) {
      mediaId = await client.v1.uploadMedia(mediaBase64, { type: mediaType });
    }

    const tweet = await client.v2.tweet({
      text,
      ...(mediaId ? { media: { media_ids: [mediaId] } } : {}),
    });

    res.status(200).json({ success: true, tweet });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 6. Frontend Tweet Form

`/components/TweetForm.tsx`

```tsx
'use client';
import { useState } from 'react';

export default function TweetForm() {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let base64 = null;
    let mediaType = null;

    if (file) {
      base64 = await toBase64(file);
      mediaType = file.type.includes('video') ? 'video/mp4' : 'png';
    }

    await fetch('/api/post-tweet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '123',
        text,
        mediaBase64: base64,
        mediaType,
      }),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button type="submit">Tweet</button>
    </form>
  );
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });
}
```

---

## 7. Notes

- **Text-only tweets:** send `{ text }` without `mediaBase64`.
- **Images/GIFs:** base64 upload works directly.
- **Videos:** `twitter-api-v2` handles chunked upload, but only for proper formats (MP4/H264, AAC). Max 512MB, 140s.
- **Security:** store tokens encrypted; never expose API keys in frontend.
- **Rate limits:** respect Twitter API rate limits.

---

✅ With this setup, users authenticate with Twitter, and can publish **text-only tweets** or **tweets with media** directly from your Next.js app.
