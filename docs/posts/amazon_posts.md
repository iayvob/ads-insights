# Amazon Advertising Posts (Sponsored Products) Analytics in Next.js

This doc explains how to fetch **campaign, ad group, and product (post) level analytics** from the Amazon Advertising API in a Next.js app after completing OAuth 2.0 authentication.

---

## 1. Prerequisites

- Completed **Amazon Ads OAuth 2.0** flow (access token + refresh token)
- `profileId` (Amazon Advertising profile ID)
- Installed dependency:

```bash
npm install axios
```

---

## 2. Get Amazon Ads Profiles

Before fetching analytics, retrieve the `profileId` (each Amazon Advertising account has profiles per region).

```javascript
// pages/api/amazon/profiles.js
import axios from 'axios';

export default async function handler(req, res) {
  try {
    const response = await axios.get(
      'https://advertising-api.amazon.com/v2/profiles',
      {
        headers: {
          Authorization: `Bearer ${process.env.AMAZON_ACCESS_TOKEN}`,
          'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
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

## 3. Request Report (Posts Analytics)

Amazon Ads reporting is **asynchronous**. You must:

1. Create a report request
2. Poll until the report is ready
3. Download the report

### Create Report Request

```javascript
// pages/api/amazon/create-report.js
import axios from 'axios';

export default async function handler(req, res) {
  const { profileId, startDate, endDate } = req.body;

  try {
    const response = await axios.post(
      'https://advertising-api.amazon.com/v2/sp/campaigns/report',
      {
        reportDate: startDate, // YYYYMMDD
        metrics:
          'impressions,clicks,cost,attributedConversions1d,attributedSales1d',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AMAZON_ACCESS_TOKEN}`,
          'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
          'Amazon-Advertising-API-Scope': profileId,
        },
      }
    );

    res.status(200).json(response.data); // { reportId }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 4. Poll Report Status

```javascript
// pages/api/amazon/report-status.js
import axios from 'axios';

export default async function handler(req, res) {
  const { profileId, reportId } = req.query;

  try {
    const response = await axios.get(
      `https://advertising-api.amazon.com/v2/reports/${reportId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AMAZON_ACCESS_TOKEN}`,
          'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
          'Amazon-Advertising-API-Scope': profileId,
        },
      }
    );

    res.status(200).json(response.data); // includes status + location (download URL)
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 5. Download Report

```javascript
// pages/api/amazon/download-report.js
import axios from 'axios';

export default async function handler(req, res) {
  const { location } = req.query;

  try {
    const response = await axios.get(location);
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 6. Example Frontend Usage

```javascript
async function fetchAmazonPostsAnalytics(profileId, startDate, endDate) {
  // Step 1: Create report
  const createRes = await fetch('/api/amazon/create-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, startDate, endDate }),
  });
  const { reportId } = await createRes.json();

  // Step 2: Poll status until SUCCESS
  let status;
  let location;
  do {
    const statusRes = await fetch(
      `/api/amazon/report-status?profileId=${profileId}&reportId=${reportId}`
    );
    const data = await statusRes.json();
    status = data.status;
    location = data.location;
  } while (status !== 'SUCCESS');

  // Step 3: Download report
  const reportRes = await fetch(
    `/api/amazon/download-report?location=${encodeURIComponent(location)}`
  );
  return reportRes.json();
}
```

---

## 7. Key Notes

- Metrics available: impressions, clicks, cost, attributedConversions, attributedSales.
- Reports are generated asynchronously.
- Always pass the correct `profileId`.
- Dates must be in `YYYYMMDD` format.

---

✅ With this setup, your Next.js app can fetch **Amazon Ads campaign/post analytics** for Sponsored Products, Sponsored Brands, and Sponsored Display campaigns.
