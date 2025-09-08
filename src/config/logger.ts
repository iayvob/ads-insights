// Avoid importing server-only env validation on the client to prevent Zod errors

import { env } from "@/validations/env"

type LogLevel = "info" | "warn" | "error" | "debug"

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  userId?: string
  provider?: string
  details?: any
}

class Logger {
  private log(level: LogLevel, message: string, details?: any, userId?: string, provider?: string) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      userId,
      provider,
      details,
    }

    // In production, you'd send this to a logging service
  if (env.NODE_ENV === "development") {
      console.log(JSON.stringify(entry, null, 2))
    }
  }

  info(message: string, details?: any, userId?: string, provider?: string) {
    this.log("info", message, details, userId, provider)
  }

  warn(message: string, details?: any, userId?: string, provider?: string) {
    this.log("warn", message, details, userId, provider)
  }

  error(message: string, details?: any, userId?: string, provider?: string) {
    this.log("error", message, details, userId, provider)
  }

  debug(message: string, details?: any, userId?: string, provider?: string) {
  if (env.NODE_ENV === "development") {
      this.log("debug", message, details, userId, provider)
    }
  }
}

export const logger = new Logger()
