# TikTok Posting (Direct Upload) in Next.js

This doc explains how to post/upload videos directly to TikTok from a Next.js app (without Cloudinary or external media hosts). We'll rely on the **TikTok Business Open API** since the `tiktok-business` SDK has limited support for direct uploads.

---

## 1. Prerequisites

- TikTok Business account
- Completed OAuth 2.0 (access token available)
- `advertiser_id`
- Local video file (e.g., `.mp4`) to upload

---

## 2. Upload Workflow

Direct upload to TikTok involves **3 steps**:

1. **Request an upload URL**
2. **Upload the video file to TikTok's server**
3. **Publish the uploaded video**

---

## 3. Request an Upload URL

```javascript
// pages/api/tiktok/upload-url.js
import axios from 'axios';

export default async function handler(req, res) {
  try {
    const response = await axios.post(
      'https://business-api.tiktokglobalshop.com/open_api/v1.3/file/video/ad/upload/',
      {
        advertiser_id: process.env.TIKTOK_ADVERTISER_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

This will return an `upload_url` and a `video_id`.

---

## 4. Upload Video File

Use the `upload_url` to upload the binary file directly:

```javascript
// pages/api/tiktok/upload-video.js
import axios from 'axios';
import fs from 'fs';

export default async function handler(req, res) {
  const { upload_url, filePath } = req.body;

  try {
    const fileStream = fs.createReadStream(filePath);

    await axios.put(upload_url, fileStream, {
      headers: {
        'Content-Type': 'video/mp4',
      },
    });

    res.status(200).json({ message: 'Upload successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 5. Publish Video

Once uploaded, publish the video using the `video_id`:

```javascript
// pages/api/tiktok/publish.js
import axios from 'axios';

export default async function handler(req, res) {
  const { video_id, caption } = req.body;

  try {
    const response = await axios.post(
      'https://business-api.tiktokglobalshop.com/open_api/v1.3/video/ad/create/',
      {
        advertiser_id: process.env.TIKTOK_ADVERTISER_ID,
        video_id,
        ad_name: caption,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 6. Key Notes

- TikTok **requires business authorization** for direct uploads.
- File size and format limits apply (MP4, ≤500MB recommended).
- Videos are uploaded in two steps: request URL → PUT upload.
- The `video_id` from the upload must be used in the publish call.

---

✅ With this setup, your Next.js app can upload and publish TikTok videos directly from a local computer to a TikTok Business account.
