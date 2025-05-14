import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number with commas
 */
export function formatNumber(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return "0"

  return new Intl.NumberFormat().format(Math.round(num))
}

/**
 * Formats a number as currency
 */
export function formatCurrency(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return "$0.00"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Formats a number as a percentage
 */
export function formatPercentage(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return "0%"

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num / 100)
}

/**
 * Truncates text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return ""
  if (text.length <= maxLength) return text

  return `${text.substring(0, maxLength)}...`
}

/**
 * Formats a date string
 */
export function formatDate(dateString: string): string {
  if (!dateString) return ""

  const date = new Date(dateString)

  if (isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

/**
 * Calculates percentage change between two numbers
 */
export function calculatePercentageChange(current: number, previous: number): string {
  if (previous === 0) return "+∞%"

  const change = ((current - previous) / previous) * 100
  const sign = change >= 0 ? "+" : ""

  return `${sign}${change.toFixed(1)}%`
}

/**
 * Safely parses JSON
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch (error) {
    return fallback
  }
}
