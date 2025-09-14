# TikTok OAuth 2.0 Setup in Next.js

This doc explains how to implement **TikTok OAuth 2.0** for authenticating users and obtaining access tokens in a Next.js application.

---

## 1. Create TikTok App

- Go to [TikTok for Developers](https://developers.tiktokglobalbusiness.com/).
- Create an app under your account.
- Configure **Redirect URI** (must match what you use in your Next.js app).
- Collect:
  - `client_key` (client ID)
  - `client_secret`

---

## 2. Scopes

TikTok OAuth requires declaring scopes when redirecting. Common scopes:

- `user.info.basic`
- `video.list`
- `video.upload`
- `business.basic`

---

## 3. Generate OAuth URL

```ts
const clientKey = process.env.TIKTOK_CLIENT_KEY!;
const redirectUri = encodeURIComponent(process.env.TIKTOK_REDIRECT_URI!);
const scopes = encodeURIComponent('user.info.basic,video.list');

export function getTikTokAuthUrl(state: string) {
  return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
}
```

---

## 4. Handle Redirect (Get Code)

After the user approves, TikTok redirects to your URI:

```
https://yourapp.com/api/auth/tiktok/callback?code=AUTH_CODE&state=xyz
```

---

## 5. Exchange Code for Token

```ts
import axios from 'axios';

export async function exchangeCodeForToken(code: string) {
  const res = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    code,
    grant_type: 'authorization_code',
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
  });

  return res.data; // contains access_token, refresh_token, expires_in
}
```

---

## 6. Example Next.js API Route

```ts
// pages/api/auth/tiktok/callback.ts
import { exchangeCodeForToken } from '../../../lib/tiktok';

export default async function handler(req, res) {
  const { code } = req.query;

  try {
    const tokens = await exchangeCodeForToken(code as string);
    // Save tokens to DB or session
    res.status(200).json({ tokens });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
```

---

## 7. Refresh Tokens

TikTok issues refresh tokens. Use them before expiry:

```ts
export async function refreshAccessToken(refreshToken: string) {
  const res = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  return res.data;
}
```

---

## Notes

- TikTok access tokens expire (typically in 24 hours).
- Refresh tokens may last up to 60 days.
- Always store tokens securely.

---

## Summary

- Redirect to TikTok OAuth URL with required scopes.
- Handle callback to capture `code`.
- Exchange code for tokens via TikTok API.
- Use refresh tokens to extend sessions.
- Works seamlessly inside Next.js API routes.
