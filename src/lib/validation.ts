/**
 * Validation utilities for API requests
 */

export function validatePlatform(platform: string): boolean {
  return ["facebook", "instagram", "twitter"].includes(platform)
}

export function validateDateRange(startDate: string, endDate: string): boolean {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)

    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end
  } catch (error) {
    return false
  }
}

export function validateUserUpdateData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Invalid data format"] }
  }

  // Check name if provided
  if ("name" in data && (typeof data.name !== "string" || data.name.length > 100)) {
    errors.push("Name must be a string with maximum length of 100 characters")
  }

  // Check image if provided
  if ("image" in data && (typeof data.image !== "string" || !data.image.startsWith("http"))) {
    errors.push("Image must be a valid URL")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
