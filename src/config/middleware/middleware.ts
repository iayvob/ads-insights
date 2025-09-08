import { type NextRequest, NextResponse } from "next/server"
import { handleApiError, RateLimitError } from "@/lib/errors"
import { logger } from "../logger";
import { requireAuth } from "./auth";

export function withRateLimit(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { generalRateLimit } = await import("./rate-limiter");
      const result = generalRateLimit(request);

      if (!result.success) {
        logger.warn("Rate limit exceeded", {
          identifier: request.headers.get("x-forwarded-for") || "unknown",
          url: request.url,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime
        });
        throw new RateLimitError();
      }

      return await handler(request);
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error);
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
  }
}

export function withErrorHandling(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request)
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      logger.error("API error", { error, url: request.url, method: request.method })
      return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }
  }
}

export function withAuth(handler: (request: NextRequest) => Promise<NextResponse>) {
  return withErrorHandling(async (request: NextRequest) => {
    return await requireAuth(handler)(request) as NextResponse;
  });
}
