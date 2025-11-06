import { logger } from "@/config/logger"
import { AuthError } from "@/lib/errors"

export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
}

export interface MockDataGenerator<T> {
  generateMockData(): T
}

export interface RateLimitError {
  type: 'rate_limit'
  resetTime?: number
  retryAfter?: number
}

export interface ApiError {
  type: 'api_error' | 'auth_error' | 'rate_limit' | 'network_error'
  status?: number
  message: string
  retryable: boolean
  details?: any
}

export abstract class BaseApiClient {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000 // 1 second base delay

  protected static async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    errorMessage = "API request failed",
    retryCount = 0
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10)
          const resetTime = parseInt(response.headers.get('x-rate-limit-reset') || '0', 10)
          
          logger.warn(`Rate limit hit for ${url}`, {
            status: response.status,
            retryAfter,
            resetTime,
            retryCount
          })

          // Retry with exponential backoff if we haven't exceeded max retries
          if (retryCount < this.MAX_RETRIES) {
            const delay = Math.min(retryAfter * 1000, this.RETRY_DELAY * Math.pow(2, retryCount))
            logger.info(`Retrying after ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`)
            
            await this.sleep(delay)
            return this.makeRequest<T>(url, options, errorMessage, retryCount + 1)
          }
          
          const rateLimitError = new Error(`Rate limit exceeded: ${errorMessage}`) as Error & ApiError
          rateLimitError.type = 'rate_limit'
          rateLimitError.status = 429
          rateLimitError.retryable = false
          rateLimitError.details = { retryAfter, resetTime, errorData }
          throw rateLimitError
        }

        // Handle authentication errors (401, 403)
        if (response.status === 401 || response.status === 403) {
          logger.error(`Authentication failed: ${url}`, {
            status: response.status,
            error: errorData,
          })
          const authError = new AuthError(`Authentication failed: ${errorMessage}`)
          ;(authError as any).type = 'auth_error'
          ;(authError as any).status = response.status
          ;(authError as any).retryable = false
          ;(authError as any).details = errorData
          throw authError
        }

        // Handle other HTTP errors
        logger.error(`API request failed: ${url}`, {
          status: response.status,
          error: errorData,
          errorMessage: errorData?.error?.message,
          errorCode: errorData?.error?.code,
          errorType: errorData?.error?.type
        })
        
        console.error(`🚨 [API-ERROR] ${response.status} - ${errorData?.error?.message || errorMessage}`, {
          url: url.substring(0, 150) + '...',
          status: response.status,
          errorCode: errorData?.error?.code,
          errorType: errorData?.error?.type,
          errorSubcode: errorData?.error?.error_subcode,
          fbtraceId: errorData?.error?.fbtrace_id
        })
        
        const apiError = new Error(`${errorMessage}: ${response.status}`) as Error & ApiError
        apiError.type = 'api_error'
        apiError.status = response.status
        apiError.retryable = response.status >= 500 // Retry server errors
        apiError.details = errorData
        throw apiError
      }

      return await response.json()
    } catch (error: any) {
      logger.error(`Request error: ${url}`, { error: error.message || error })
      
      // Don't retry our own custom errors
      if (error.type) {
        throw error
      }
      
      // Network errors - could be retryable
      if (retryCount < this.MAX_RETRIES && this.isNetworkError(error)) {
        const delay = this.RETRY_DELAY * Math.pow(2, retryCount)
        logger.info(`Retrying network error after ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`)
        
        await this.sleep(delay)
        return this.makeRequest<T>(url, options, errorMessage, retryCount + 1)
      }

      const networkError = new AuthError(errorMessage) as AuthError & ApiError
      networkError.type = 'network_error'
      networkError.retryable = false
      networkError.details = error
      throw networkError
    }
  }

  private static isNetworkError(error: any): boolean {
    return error.name === 'TypeError' || 
           error.message?.includes('fetch') ||
           error.message?.includes('network') ||
           error.code === 'ECONNRESET' ||
           error.code === 'ENOTFOUND'
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  protected static handleApiError(error: unknown, context: string): never {
    logger.error(`${context} failed`, { error })
    if (error instanceof AuthError) throw error
    throw new AuthError(`Failed to ${context.toLowerCase()}`)
  }
}
