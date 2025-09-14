# TikTok Ads Insights in Next.js

This doc explains how to fetch **TikTok Ads Insights** for a TikTok Business account after completing OAuth 2.0. We'll use the [`tiktok-business`](https://www.npmjs.com/package/tiktok-business) library.

---

## 1. Install Dependencies

```bash
npm install tiktok-business
```

---

## 2. Initialize TikTok Client

After OAuth 2.0, you will have an **access token**. Use it with the `tiktok-business` SDK:

```javascript
import TikTokAPI from 'tiktok-business';

const tiktok = new TikTokAPI({
  accessToken: process.env.TIKTOK_ACCESS_TOKEN,
});
```

---

## 3. Fetch Ads Insights

TikTok provides ad-level, campaign-level, and ad group-level insights. You need an **advertiser ID**.

```javascript
// pages/api/tiktok/ads-insights.js
import TikTokAPI from 'tiktok-business';

export default async function handler(req, res) {
  const { start_date, end_date } = req.query;

  const tiktok = new TikTokAPI({
    accessToken: process.env.TIKTOK_ACCESS_TOKEN,
  });

  try {
    const response = await tiktok.report.advertiser({
      advertiser_id: process.env.TIKTOK_ADVERTISER_ID,
      report_type: 'BASIC', // can be BASIC or ADVANCED
      dimensions: ['ad_id', 'campaign_id'],
      metrics: [
        'impressions',
        'clicks',
        'spend',
        'cpc',
        'cpm',
        'ctr',
        'conversions',
      ],
      start_date,
      end_date,
      page_size: 50,
    });

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 4. Example Frontend Fetch

```javascript
async function getTikTokAdsInsights(start, end) {
  const res = await fetch(
    `/api/tiktok/ads-insights?start_date=${start}&end_date=${end}`
  );
  return res.json();
}
```

---

## 5. Key Notes

- You need a **Business account advertiser ID**.
- TikTok distinguishes between `report.campaign`, `report.adgroup`, and `report.advertiser` for insights. Choose depending on the granularity needed.
- Time ranges must be valid (e.g., last 30 days).
- Rate limits apply.

---

✅ With this setup, your Next.js app can fetch TikTok Ads Insights (impressions, clicks, spend, CPC, CPM, CTR, conversions, etc.) for any authorized Business account.
