/**
 * Utility functions for API interactions
 */

export async function fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as T
  } catch (error) {
    console.error("API request failed:", error)
    throw error
  }
}

export function handleApiError(error: unknown): { error: string } {
  console.error("API error:", error)

  if (error instanceof Error) {
    return { error: error.message }
  }

  return { error: "An unknown error occurred" }
}
