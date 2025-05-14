/**
 * API response types
 */

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface ApiErrorResponse {
  error: string
  status?: number
}

export interface ApiSuccessResponse<T> {
  data: T
}
