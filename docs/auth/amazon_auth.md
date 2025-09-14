# Amazon Advertising OAuth 2.0 in Next.js

This doc explains how to implement **OAuth 2.0 for Amazon Advertising API** in a Next.js app. This authentication flow allows your app to obtain and refresh access tokens on behalf of users to access Amazon Ads features.

---

## 1. Prerequisites

- Amazon Developer account
- Register your app in **Amazon Advertising Console**
- Get **Client ID** and **Client Secret**
- Add a redirect URI (e.g., `http://localhost:3000/api/auth/callback/amazon`)

---

## 2. Configure Environment Variables

```bash
AMAZON_CLIENT_ID=your_client_id
AMAZON_CLIENT_SECRET=your_client_secret
AMAZON_REDIRECT_URI=http://localhost:3000/api/auth/callback/amazon
```

---

## 3. Build Authorization URL

Amazon OAuth base URL:

```
https://www.amazon.com/ap/oa
```

Example URL builder:

```javascript
// lib/amazonAuth.js
export function getAmazonAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.AMAZON_CLIENT_ID,
    scope: 'advertising::campaign_management',
    response_type: 'code',
    redirect_uri: process.env.AMAZON_REDIRECT_URI,
  });

  return `https://www.amazon.com/ap/oa?${params.toString()}`;
}
```

---

## 4. Handle OAuth Callback

When the user authorizes, Amazon will redirect to your callback with a `code`.

```javascript
// pages/api/auth/callback/amazon.js
import axios from 'axios';

export default async function handler(req, res) {
  const { code } = req.query;

  try {
    const response = await axios.post(
      'https://api.amazon.com/auth/o2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.AMAZON_CLIENT_ID,
        client_secret: process.env.AMAZON_CLIENT_SECRET,
        redirect_uri: process.env.AMAZON_REDIRECT_URI,
      })
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Save tokens securely (DB or session)

    res.status(200).json({ access_token, refresh_token, expires_in });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 5. Refresh Tokens

Amazon access tokens expire (usually in 1 hour). Use the refresh token to renew:

```javascript
// lib/refreshAmazonToken.js
import axios from 'axios';

export async function refreshAmazonToken(refresh_token) {
  const response = await axios.post(
    'https://api.amazon.com/auth/o2/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: process.env.AMAZON_CLIENT_ID,
      client_secret: process.env.AMAZON_CLIENT_SECRET,
    })
  );

  return response.data; // { access_token, expires_in }
}
```

---

## 6. Example Usage

```javascript
import { getAmazonAuthUrl } from '@/lib/amazonAuth';

export default function LoginAmazon() {
  return <a href={getAmazonAuthUrl()}>Connect Amazon Advertising</a>;
}
```

---

## 7. Key Notes

- Scope `advertising::campaign_management` is needed for ads API.
- Tokens must be stored securely (not in frontend).
- Refresh token remains valid long-term unless revoked.

---

✅ With this setup, your Next.js app can authenticate with Amazon Advertising API using OAuth 2.0, store tokens, and refresh them for continuous access.
