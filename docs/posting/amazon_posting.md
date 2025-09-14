# 🚀 Amazon Posting (Next.js + Amazon Ads API)

Amazon doesn’t offer a simple "social-style" posting API like Twitter/Instagram. Instead, content posting goes through **Amazon Posts** (a brand storytelling tool) which is managed via the **Amazon Selling Partner API (SP-API)**. With it, you can create and manage **brand content (posts, products, media)** that appears in Amazon stores.

Below is how to set up posting with Next.js:

---

## 1. Prerequisites

- Amazon Seller Central / Brand Registry account
- Registered SP-API developer application
- OAuth 2.0 (Login with Amazon flow) for authorization
- `amazon-sp-api` Node library

```bash
npm install amazon-sp-api
```

---

## 2. Initialize SP-API Client

```ts
import SellingPartnerAPI from 'amazon-sp-api';

const client = new SellingPartnerAPI({
  region: 'na', // or 'eu', 'fe'
  refresh_token: userRefreshToken,
  credentials: {
    SELLING_PARTNER_APP_CLIENT_ID: process.env.AMAZON_APP_CLIENT_ID!,
    SELLING_PARTNER_APP_CLIENT_SECRET: process.env.AMAZON_APP_CLIENT_SECRET!,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY!,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_KEY!,
    AWS_SELLING_PARTNER_ROLE: process.env.AWS_ROLE_ARN!,
  },
});
```

---

## 3. Upload Media (Direct to Amazon)

```ts
const upload = await client.callAPI({
  operation: 'upload:createUploadDestinationForResource',
  endpoint: 'uploads',
  body: {
    contentType: 'image/jpeg',
    marketplaceIds: ['ATVPDKIKX0DER'],
  },
});

// Use returned URL to upload image
import axios from 'axios';
await axios.put(upload.uploadDestination.url, fileBuffer, {
  headers: { 'Content-Type': 'image/jpeg' },
});
```

---

## 4. Create Post Metadata

```ts
const post = await client.callAPI({
  operation: 'posts:createPost',
  endpoint: 'posts',
  body: {
    marketplaceId: 'ATVPDKIKX0DER',
    brandEntityId: brandId,
    media: [
      {
        mediaId: upload.uploadDestination.resourceId,
        mediaType: 'IMAGE',
      },
    ],
    content: {
      headline: 'Introducing our new product!',
      body: 'High quality, durable, and eco-friendly.',
    },
    products: [
      {
        asin: 'B08XXXXXXX',
      },
    ],
  },
});

console.log('Post created:', post);
```

---

## 5. Publish Post

```ts
await client.callAPI({
  operation: 'posts:submitPost',
  endpoint: 'posts',
  path: { postId: post.postId },
});
```

---

## ✅ Summary

- Authenticate with OAuth 2.0 (Login with Amazon).
- Upload media directly to Amazon via upload destination.
- Create a post with metadata + media + product ASINs.
- Submit for publishing.

This flow enables **direct posting of branded content (posts + products + media)** to Amazon through a Next.js app.
