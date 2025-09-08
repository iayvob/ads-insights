"use server"

import { sendVerificationEmail } from "@/services/email"

// Simple in-memory rate limiting (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(ip: string): string {
  return `email_verification:${ip}`
}

function checkRateLimit(ip: string): { allowed: boolean; resetTime?: number } {
  const key = getRateLimitKey(ip)
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxAttempts = 3

  const current = rateLimitMap.get(key)

  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true }
  }

  if (current.count >= maxAttempts) {
    return { allowed: false, resetTime: current.resetTime }
  }

  // Increment count
  current.count++
  rateLimitMap.set(key, current)
  return { allowed: true }
}

export async function sendVerificationCode(email: string, pin: string) {
  try {
    // Get client IP (simplified - in production, use proper IP detection)
    const ip = "127.0.0.1" // This should be extracted from request headers

    // Check rate limiting
    const rateLimit = checkRateLimit(ip)
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "Too many requests. Please try again later.",
        rateLimited: true,
        resetTime: rateLimit.resetTime,
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: "Invalid email address format",
      }
    }

    // Send verification email
    await sendVerificationEmail(email, pin)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error sending verification code:", error)
    return {
      success: false,
      error: "Failed to send verification code. Please try again.",
    }
  }
}
