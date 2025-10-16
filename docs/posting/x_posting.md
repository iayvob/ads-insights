# Guide: Posting to X (Twitter) with Text and Media via a Next.js App

This document explains how to build a **Next.js app** that lets users:

1. Authenticate with X using **OAuth 2.0 Authorization Code with PKCE**.
2. Post tweets either with **text only** or with **media (images/videos)** using the **X API v2**.

---

## 1. Prerequisites

- X Developer account with **Elevated access**.
- App created in [X Developer Portal](https://developer.x.com).
- **OAuth 2.0** enabled in your app's authentication settings.
- API credentials:
  - Client ID (for OAuth 2.0)
  - Client Secret (for confidential clients only)
  - Access tokens will be obtained **per user** after OAuth 2.0 flow.

- `twitter-api-v2` library installed:

  ```bash
  npm install twitter-api-v2
  ```

---

## 2. Project Structure

```
/lib/x-client.ts             → X API v2 client setup
/pages/api/x-auth.ts         → Starts OAuth 2.0 flow
/pages/api/x-callback.ts     → Handles OAuth 2.0 callback
/pages/api/post-tweet.ts     → Posts tweets using X API v2
/components/TweetForm.tsx    → Frontend form for posting
```

---

## 3. X API v2 Client Setup

`/lib/x-client.ts`

```ts
import { TwitterApi } from 'twitter-api-v2';

export function getXApiClient() {
  return new TwitterApi({
    clientId: process.env.X_CLIENT_ID!,
    clientSecret: process.env.X_CLIENT_SECRET!, // Only for confidential clients
  });
}

export function getAuthenticatedXClient(accessToken: string) {
  return new TwitterApi(accessToken);
}
```

---

## 4. User Authentication (OAuth 2.0 with PKCE)

### Step 1: Start Auth Flow

`/pages/api/x-auth.ts`

```ts
import { getXApiClient } from '../../lib/x-client';
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = getXApiClient();

  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const scopes = [
    'tweet.read',
    'tweet.write',
    'users.read',
    'media.write', // Required for media upload
    'offline.access', // For refresh tokens
  ];

  const authUrl = client.generateOAuth2AuthLink(
    process.env.X_CALLBACK_URL!, // e.g., 'http://localhost:3000/api/x-callback'
    {
      scope: scopes,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: crypto.randomBytes(16).toString('hex'),
    }
  );

  // TODO: Store codeVerifier and state temporarily (Redis/DB/session)
  // You'll need these in the callback

  res.redirect(authUrl.url);
}
```

### Step 2: Handle Callback

`/pages/api/x-callback.ts`

```ts
import { getXApiClient } from '../../lib/x-client';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code, state } = req.query;

  // TODO: Verify state parameter against stored value
  // TODO: Retrieve stored codeVerifier
  const codeVerifier = 'stored_code_verifier'; // Get from storage

  const client = getXApiClient();

  try {
    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await client.loginWithOAuth2({
      code: code as string,
      codeVerifier,
      redirectUri: process.env.X_CALLBACK_URL!,
    });

    // 🔑 Save accessToken, refreshToken in DB per user
    // Access tokens expire in 2 hours without offline.access scope
    // With offline.access, use refreshToken to get new access tokens

    res.send('X connected! You can now post.');
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(400).send('Authentication failed');
  }
}
```

---

## 5. Posting Tweets with X API v2

`/pages/api/post-tweet.ts`

```ts
import { getAuthenticatedXClient } from '../../lib/x-client';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { userId, text, mediaBase64, mediaType } = req.body;

    // Fetch user access token from DB
    const { accessToken } = await db.user.findUnique({
      where: { id: userId },
    });

    const client = getAuthenticatedXClient(accessToken);

    let mediaIds: string[] = [];

    // Upload media if provided
    if (mediaBase64) {
      const mediaId = await client.v1.uploadMedia(
        Buffer.from(mediaBase64, 'base64'),
        {
          mimeType: mediaType,
          target: 'tweet', // Specify this is for tweet
        }
      );
      mediaIds.push(mediaId);
    }

    // Create tweet using X API v2
    const tweetResponse = await client.v2.tweet({
      text,
      ...(mediaIds.length > 0 && {
        media: {
          media_ids: mediaIds,
          // Optional: tag users in media
          // tagged_user_ids: ['123456789']
        },
      }),
      // Optional: other v2 parameters
      // reply_settings: 'following', // Who can reply
      // geo: { place_id: 'place_id' }, // Location
      // poll: { options: ['Yes', 'No'], duration_minutes: 60 }, // Poll
    });

    res.status(200).json({
      success: true,
      tweet: tweetResponse.data,
    });
  } catch (error: any) {
    console.error('Tweet posting error:', error);
    res.status(500).json({
      error: error.message,
      details: error.data || error.errors,
    });
  }
}
```

---

## 6. Frontend Tweet Form with X API v2

`/components/TweetForm.tsx`

```tsx
'use client';
import { useState } from 'react';

export default function TweetForm() {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPosting(true);

    try {
      let base64 = null;
      let mediaType = null;

      if (file) {
        base64 = await toBase64(file);
        mediaType = file.type;
      }

      const response = await fetch('/api/post-tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '123', // Get from auth context
          text,
          mediaBase64: base64,
          mediaType,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Tweet posted successfully!');
        setText('');
        setFile(null);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert('Failed to post tweet');
      console.error(error);
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's happening?"
        maxLength={280}
        className="w-full p-3 border rounded-lg resize-none"
        rows={4}
      />

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          {280 - text.length} characters remaining
        </span>
      </div>

      <input
        type="file"
        accept="image/*,video/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      {file && (
        <div className="text-sm text-gray-600">
          Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </div>
      )}

      <button
        type="submit"
        disabled={isPosting || (!text.trim() && !file)}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
      >
        {isPosting ? 'Posting...' : 'Post'}
      </button>
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

## 7. Environment Variables

Create a `.env.local` file with:

```bash
# X API v2 Credentials
X_CLIENT_ID=your_client_id_here
X_CLIENT_SECRET=your_client_secret_here  # Only for confidential clients
X_CALLBACK_URL=http://localhost:3000/api/x-callback

# Database connection for storing user tokens
DATABASE_URL=your_database_url
```

---

## 8. Required Scopes and Permissions

Ensure your X app has the following **OAuth 2.0 scopes** enabled:

- `tweet.read` - Read tweets
- `tweet.write` - **Required for posting tweets**
- `users.read` - Read user information
- `media.write` - **Required for uploading media**
- `offline.access` - **Required for refresh tokens**

You can configure these in your app settings in the X Developer Portal.

---

## 9. Token Management and Refresh

Since X API v2 access tokens expire in **2 hours** (unless using `offline.access`), implement token refresh:

```ts
// /lib/token-refresh.ts
import { getXApiClient } from './x-client';

export async function refreshAccessToken(refreshToken: string) {
  const client = getXApiClient();

  try {
    const { accessToken, refreshToken: newRefreshToken } =
      await client.refreshOAuth2Token(refreshToken);

    // Update tokens in database
    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
}
```

---

## 10. Rate Limits and Best Practices

### Rate Limits (X API v2)

- **POST /2/tweets**: 200 requests per 15 minutes (per user)
- **DELETE /2/tweets/:id**: 50 requests per 15 minutes (per user)
- **Media upload**: Depends on media size and type

### Best Practices

- **Handle errors gracefully**: X API returns detailed error information
- **Respect rate limits**: Implement proper rate limiting in your app
- **Validate media**: Check file size, type, and format before upload
- **Secure token storage**: Store access/refresh tokens encrypted
- **Monitor API status**: Check [X API status page](https://status.x.com)

---

## 11. Media Upload Specifications

### Supported Media Types

**Images:**

- Formats: JPEG, PNG, GIF, WebP
- Max size: 5MB per image
- Max dimensions: 8192x8192 pixels

**Videos:**

- Formats: MP4, MOV
- Max size: 512MB
- Max duration: 2 minutes 20 seconds
- Codecs: H.264 video, AAC audio

**GIFs:**

- Max size: 15MB
- Max duration: 60 seconds

---

## 12. Error Handling

```ts
// Enhanced error handling for X API v2
try {
  const tweet = await client.v2.tweet({ text: 'Hello world!' });
} catch (error: any) {
  if (error.code === 429) {
    // Rate limit exceeded
    console.log('Rate limit exceeded, retry after:', error.rateLimit?.reset);
  } else if (error.code === 401) {
    // Authentication error - token may be expired
    console.log('Authentication failed, refresh token needed');
  } else if (error.errors) {
    // X API specific errors
    console.log('API errors:', error.errors);
  }
}
```

---

## 13. Advanced Features

### Posting with Polls

```ts
const tweet = await client.v2.tweet({
  text: "What's your favorite programming language?",
  poll: {
    options: ['JavaScript', 'Python', 'TypeScript', 'Other'],
    duration_minutes: 1440, // 24 hours
  },
});
```

### Posting with Location

```ts
const tweet = await client.v2.tweet({
  text: 'Posting from the office!',
  geo: {
    place_id: 'place_id_from_geo_search',
  },
});
```

### Reply Settings

```ts
const tweet = await client.v2.tweet({
  text: 'This tweet is only for my followers to reply',
  reply_settings: 'following', // 'everyone', 'following', 'mentioned_users'
});
```

---

## 14. Notes and Migration from v1.1

- **OAuth 2.0 is preferred**: More secure and modern than OAuth 1.0a
- **Better rate limits**: v2 with OAuth 2.0 provides higher rate limits for some endpoints
- **Enhanced error responses**: v2 provides more detailed error information
- **New features**: Polls, reply settings, improved media handling
- **Token expiration**: Unlike v1.1, v2 tokens expire (2 hours default)
- **Scopes**: Fine-grained permissions vs v1.1's all-or-nothing approach

---

✅ With this setup, users can authenticate with X using modern OAuth 2.0, and publish **text-only posts** or **posts with media** using the latest **X API v2** endpoints with enhanced features and better security.
