import { z } from "zod"

// Input validation schemas
export const createUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(1).max(50).optional(),
})

export const updateUserSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
})

export const authCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  error: z.string().optional(),
})

// Sanitization functions
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, "")
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function validateAndSanitizeUser(data: any) {
  const validated = createUserSchema.parse(data)
  return {
    email: validated.email ? sanitizeEmail(validated.email) : undefined,
    username: validated.username ? sanitizeString(validated.username) : undefined,
  }
}

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")

// Email validation schema
export const emailSchema = z.string().email("Invalid email format").toLowerCase()

// Validation schema for email verification
export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().min(6, "Verification code must be 6 digits").max(6, "Verification code must be 6 digits"),
})

// Username validation schema
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters long")
  .max(30, "Username must be less than 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")

// Sign up validation schema
export const signUpSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
})

// Validation schema for email verification request
export const sendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
})

// Sign in validation schema
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
})

// Email verification schema
export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
})

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
})

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
})

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => err.message),
      }
    }
    return {
      success: false,
      errors: ["Invalid input data"],
    }
  }
}

// Sanitize HTML to prevent XSS
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

// Generate secure random token
export function generateSecureToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  const randomArray = new Uint8Array(length)
  crypto.getRandomValues(randomArray)

  for (let i = 0; i < length; i++) {
    result += chars[randomArray[i] % chars.length]
  }

  return result
}

// validate the secure token
export function validateSecureToken(token: string, length = 32): boolean {
  const regex = new RegExp(`^[A-Za-z0-9]{${length}}$`)
  return regex.test(token)
}

// Add the generateVerificationCode function to this file
export function generateVerificationCode(): string {
  // Generate a 6-digit verification code
  return Math.floor(100000 + Math.random() * 900000).toString();
}