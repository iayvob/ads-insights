/**
 * Types for ad insights data
 */

export interface PlatformSummary {
  impressions: number
  clicks: number
  ctr: number
  spend: number
}

export interface OverviewData {
  platforms: {
    facebook: PlatformSummary
    instagram: PlatformSummary
    twitter: PlatformSummary
  }
  totalImpressions: number
  totalClicks: number
  totalSpend: number
  averageCtr: number
}

export interface InsightsData {
  impressions: number[]
  clicks: number[]
  ctr: number[]
  spend: number[]
  dates: string[]
}

export interface AdCampaign {
  id: string
  name: string
  platform: "facebook" | "instagram" | "twitter"
  status: "active" | "paused" | "completed"
  budget: number
  spent: number
  startDate: string
  endDate?: string
  impressions: number
  clicks: number
  ctr: number
}

export interface AdPerformance {
  date: string
  impressions: number
  clicks: number
  ctr: number
  spend: number
}

export type Platform = "facebook" | "instagram" | "twitter"
