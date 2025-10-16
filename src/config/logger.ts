// Enhanced logging system for better debugging and monitoring

import { env } from "@/validations/env"

type LogLevel = "info" | "warn" | "error" | "debug" | "trace" | "api" | "auth" | "analytics"

interface LogContext {
  userId?: string
  sessionId?: string
  provider?: string
  platform?: string
  operation?: string
  requestId?: string
  userAgent?: string
  ipAddress?: string
  route?: string
  method?: string
  statusCode?: number
  duration?: number
  errorCode?: string
  stack?: string
  // Allow additional custom properties for enhanced logging
  [key: string]: any
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  details?: any
  tags?: string[]
  correlationId?: string
}

interface APICallDetails {
  url: string
  method: string
  statusCode?: number
  duration?: number
  requestSize?: number
  responseSize?: number
  rateLimitRemaining?: number
  errorType?: string
}

interface AnalyticsDetails {
  platform: string
  dataType: 'posts' | 'ads' | 'profile' | 'insights'
  recordCount?: number
  timeRange?: string
  success: boolean
  errorReason?: string
}

interface AuthDetails {
  action: 'login' | 'logout' | 'token_refresh' | 'oauth_callback' | 'token_exchange'
  provider: string
  success: boolean
  errorType?: string
  tokenType?: string
}

class EnhancedLogger {
  private correlationId: string = this.generateCorrelationId()

  // ANSI color codes for fancy console output
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case 'error': return this.colors.red
      case 'warn': return this.colors.yellow
      case 'info': return this.colors.blue
      case 'debug': return this.colors.gray
      case 'trace': return this.colors.dim
      case 'api': return this.colors.cyan
      case 'auth': return this.colors.magenta
      case 'analytics': return this.colors.green
      default: return this.colors.white
    }
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case 'error': return '🚨'
      case 'warn': return '⚠️'
      case 'info': return 'ℹ️'
      case 'debug': return '🐛'
      case 'trace': return '🔍'
      case 'api': return '🌐'
      case 'auth': return '🔐'
      case 'analytics': return '📊'
      default: return '📝'
    }
  }

  private formatConsoleOutput(entry: LogEntry): void {
    const { level, message, timestamp, context, details, tags } = entry
    const color = this.getLevelColor(level)
    const emoji = this.getLevelEmoji(level)
    const reset = this.colors.reset
    const bright = this.colors.bright
    const dim = this.colors.dim

    // Format timestamp
    const time = new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })

    // Main log line
    console.log(
      `${color}${bright}${emoji} [${level.toUpperCase()}]${reset} ` +
      `${dim}${time}${reset} ` +
      `${bright}${message}${reset}`
    )

    // Context information
    if (context) {
      const contextItems = []
      if (context.provider) contextItems.push(`Provider: ${context.provider}`)
      if (context.platform) contextItems.push(`Platform: ${context.platform}`)
      if (context.operation) contextItems.push(`Operation: ${context.operation}`)
      if (context.userId) contextItems.push(`User: ${context.userId.substring(0, 8)}...`)
      if (context.route) contextItems.push(`Route: ${context.method} ${context.route}`)
      if (context.statusCode) contextItems.push(`Status: ${context.statusCode}`)
      if (context.duration) contextItems.push(`Duration: ${context.duration}ms`)

      if (contextItems.length > 0) {
        console.log(`${dim}   📋 Context: ${contextItems.join(' | ')}${reset}`)
      }
    }

    // Tags
    if (tags && tags.length > 0) {
      console.log(`${dim}   🏷️  Tags: ${tags.join(', ')}${reset}`)
    }

    // Details (formatted nicely)
    if (details) {
      console.log(`${dim}   📄 Details:${reset}`)
      if (typeof details === 'object') {
        // Pretty print objects with indentation
        const detailsStr = JSON.stringify(details, null, 2)
          .split('\n')
          .map(line => `${dim}      ${line}${reset}`)
          .join('\n')
        console.log(detailsStr)
      } else {
        console.log(`${dim}      ${details}${reset}`)
      }
    }

    // Error stack (if present)
    if (context?.stack && level === 'error') {
      console.log(`${this.colors.red}${dim}   📚 Stack Trace:${reset}`)
      const stackLines = context.stack.split('\n').slice(0, 10) // Limit stack trace
      stackLines.forEach(line => {
        console.log(`${this.colors.red}${dim}      ${line.trim()}${reset}`)
      })
    }

    console.log('') // Empty line for readability
  }

  private log(level: LogLevel, message: string, context?: LogContext, details?: any, tags?: string[]) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      details,
      tags,
      correlationId: this.correlationId,
    }

    // In development, show fancy console output
    if (env.NODE_ENV === "development") {
      this.formatConsoleOutput(entry)
    } else {
      // In production, use structured JSON for log aggregation services
      console.log(JSON.stringify(entry))
    }
  }

  // Standard logging methods
  info(message: string, context?: LogContext, details?: any, tags?: string[]) {
    this.log("info", message, context, details, tags)
  }

  warn(message: string, context?: LogContext, details?: any, tags?: string[]) {
    this.log("warn", message, context, details, tags)
  }

  error(message: string, context?: LogContext, details?: any, tags?: string[]) {
    // Auto-capture stack trace for errors
    if (context && !context.stack && details instanceof Error) {
      context.stack = details.stack
    }
    this.log("error", message, context, details, tags)
  }

  debug(message: string, context?: LogContext, details?: any, tags?: string[]) {
    if (env.NODE_ENV === "development") {
      this.log("debug", message, context, details, tags)
    }
  }

  trace(message: string, context?: LogContext, details?: any, tags?: string[]) {
    if (env.NODE_ENV === "development") {
      this.log("trace", message, context, details, tags)
    }
  }

  // Specialized logging methods for different domains

  /**
   * Log API calls with detailed information
   */
  api(message: string, apiDetails: APICallDetails, context?: LogContext, tags?: string[]) {
    const enhancedContext = {
      ...context,
      operation: 'api_call',
      method: apiDetails.method,
      statusCode: apiDetails.statusCode,
      duration: apiDetails.duration
    }

    const enhancedDetails = {
      ...apiDetails,
      success: apiDetails.statusCode ? apiDetails.statusCode < 400 : false
    }

    const apiTags = ['api', ...(tags || [])]
    this.log("api", message, enhancedContext, enhancedDetails, apiTags)
  }

  /**
   * Log authentication events
   */
  auth(message: string, authDetails: AuthDetails, context?: LogContext, tags?: string[]) {
    const enhancedContext = {
      ...context,
      operation: authDetails.action,
      provider: authDetails.provider
    }

    const authTags = ['auth', authDetails.provider, ...(tags || [])]
    this.log("auth", message, enhancedContext, authDetails, authTags)
  }

  /**
   * Log analytics operations
   */
  analytics(message: string, analyticsDetails: AnalyticsDetails, context?: LogContext, tags?: string[]) {
    const enhancedContext = {
      ...context,
      operation: 'analytics_fetch',
      platform: analyticsDetails.platform,
      provider: analyticsDetails.platform
    }

    const analyticsTags = ['analytics', analyticsDetails.platform, analyticsDetails.dataType, ...(tags || [])]
    this.log("analytics", message, enhancedContext, analyticsDetails, analyticsTags)
  }

  /**
   * Performance monitoring
   */
  performance(operation: string, duration: number, context?: LogContext, details?: any) {
    const perfContext = {
      ...context,
      operation,
      duration
    }

    const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug'
    const emoji = duration > 5000 ? '🐌' : duration > 1000 ? '⏱️' : '⚡'

    this.log(level as LogLevel, `${emoji} ${operation} completed in ${duration}ms`, perfContext, details, ['performance'])
  }

  /**
   * Business logic events
   */
  business(event: string, context?: LogContext, details?: any, tags?: string[]) {
    const businessTags = ['business', ...(tags || [])]
    this.log("info", `📈 ${event}`, context, details, businessTags)
  }

  /**
   * Security events
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext, details?: any) {
    const level = severity === 'critical' || severity === 'high' ? 'error' :
      severity === 'medium' ? 'warn' : 'info'

    const securityContext = {
      ...context,
      operation: 'security_event'
    }

    this.log(level as LogLevel, `🛡️ SECURITY [${severity.toUpperCase()}]: ${event}`, securityContext, details, ['security', severity])
  }

  /**
   * Create a child logger with default context
   */
  createChild(defaultContext: LogContext): EnhancedLogger {
    const childLogger = new EnhancedLogger()

    // Override methods to include default context
    const originalLog = childLogger.log.bind(childLogger)
    childLogger.log = (level: LogLevel, message: string, context?: LogContext, details?: any, tags?: string[]) => {
      const mergedContext = { ...defaultContext, ...context }
      return originalLog(level, message, mergedContext, details, tags)
    }

    return childLogger
  }

  /**
   * Log function execution time
   */
  time<T>(operation: string, fn: () => T | Promise<T>, context?: LogContext): Promise<T> {
    const startTime = Date.now()
    this.trace(`⏳ Starting ${operation}`, context, undefined, ['timing'])

    const result = Promise.resolve(fn())

    return result
      .then((res) => {
        const duration = Date.now() - startTime
        this.performance(operation, duration, context, { success: true })
        return res
      })
      .catch((error) => {
        const duration = Date.now() - startTime
        this.performance(operation, duration, { ...context, errorCode: error.code }, { success: false, error: error.message })
        throw error
      })
  }
}

export const logger = new EnhancedLogger()

// Export types for use in other files
export type { LogContext, APICallDetails, AnalyticsDetails, AuthDetails }

// Convenience functions for common logging scenarios
export const logApiCall = (url: string, method: string, statusCode: number, duration: number, context?: LogContext) => {
  logger.api(`API ${method} ${url}`, { url, method, statusCode, duration }, context)
}

export const logAuthEvent = (action: AuthDetails['action'], provider: string, success: boolean, context?: LogContext) => {
  logger.auth(`Authentication ${action}`, { action, provider, success }, context)
}

export const logAnalyticsOperation = (platform: string, dataType: AnalyticsDetails['dataType'], success: boolean, context?: LogContext) => {
  logger.analytics(`Analytics fetch for ${platform}`, { platform, dataType, success }, context)
}
