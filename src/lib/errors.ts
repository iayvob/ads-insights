export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 500,
    public isOperational = true,
  ) {
    super(message)
    this.name = "AppError"
    Error.captureStackTrace(this, this.constructor)
  }
}

export class AuthError extends AppError {
  constructor(message: string, code = "AUTH_ERROR") {
    super(code, message, 401)
  }
}

export class ValidationError extends AppError {
  public details?: any;
  
  constructor(message: string, details?: any) {
    super("VALIDATION_ERROR", message, 400)
    this.details = details
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super("DATABASE_ERROR", message, 500)
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super("RATE_LIMIT_EXCEEDED", "Too many requests", 429)
  }
}

// Error handler utility
export function handleApiError(error: unknown): { error: string; statusCode: number } {
  if (error instanceof AppError) {
    return {
      error: error.message,
      statusCode: error.statusCode,
    }
  }

  // Log unexpected errors but don't expose details
  console.error("Unexpected error:", error)
  return {
    error: "Internal server error",
    statusCode: 500,
  }
}
