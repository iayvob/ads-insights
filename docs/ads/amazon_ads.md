# Amazon Advertising Ads Insights in Next.js

This doc explains how to fetch **Amazon Ads Insights** (campaign/ad group/ad-level metrics like impressions, clicks, spend, sales) using the Amazon Advertising API in a Next.js app after completing OAuth 2.0 authentication.

---

## 1. Prerequisites

- Completed **Amazon Ads OAuth 2.0** flow (access + refresh tokens)
- `profileId` (Amazon Advertising profile ID)
- Installed dependency:

```bash
npm install axios
```

---

## 2. Insights Workflow

Amazon Ads provides insights through the **Reports API**, which is asynchronous:

1. Create a report request (specify entity type and metrics)
2. Poll report status until ready
3. Download report file (JSON or GZIP)

---

## 3. Create Ads Insights Report

```javascript
// pages/api/amazon/create-ads-report.js
import axios from 'axios';

export default async function handler(req, res) {
  const { profileId, startDate, endDate, level } = req.body; // level: campaign, adGroup, keyword

  try {
    const response = await axios.post(
      `https://advertising-api.amazon.com/v2/sp/${level}s/report`,
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
// pages/api/amazon/ads-report-status.js
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

    res.status(200).json(response.data); // includes { status, location }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 5. Download Ads Insights

```javascript
// pages/api/amazon/download-ads-report.js
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
async function fetchAmazonAdsInsights(
  profileId,
  startDate,
  level = 'campaign'
) {
  // Step 1: Create report
  const createRes = await fetch('/api/amazon/create-ads-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, startDate, level }),
  });
  const { reportId } = await createRes.json();

  // Step 2: Poll until ready
  let status;
  let location;
  do {
    const statusRes = await fetch(
      `/api/amazon/ads-report-status?profileId=${profileId}&reportId=${reportId}`
    );
    const data = await statusRes.json();
    status = data.status;
    location = data.location;
  } while (status !== 'SUCCESS');

  // Step 3: Download report
  const reportRes = await fetch(
    `/api/amazon/download-ads-report?location=${encodeURIComponent(location)}`
  );
  return reportRes.json();
}
```

---

## 7. Key Notes

- Supported entities: `campaigns`, `adGroups`, `keywords`, `productAds`
- Metrics vary per entity but generally include impressions, clicks, spend, conversions, sales.
- Reports are asynchronous, allow batching.
- Dates must be `YYYYMMDD`.

---

✅ With this setup, your Next.js app can fetch **Amazon Ads Insights** for campaigns, ad groups, or ads, including spend, impressions, clicks, CTR, conversions, and attributed sales.
