import { env } from "@/validations/env";

/**
 * Get the base URL for the application
 * Used for constructing redirect URIs and other absolute URLs
 */
export function getBaseUrl(): string {
  // Use the configured APP_URL from environment
  return env.APP_URL;
}

/**
 * Construct an absolute URL from a relative path
 */
export function getAbsoluteUrl(path: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
