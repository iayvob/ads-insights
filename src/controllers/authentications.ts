'use server'
import bcrypt from "bcryptjs"
import { prisma } from "@/config/database/prisma"
import { generateVerificationCode, sendPasswordResetEmail, sendVerificationEmail } from "@/services/email"
import { TokenType } from "@prisma/client"
import { env } from "@/validations/env"

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}


// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; expires: number }>()

export async function sendVerificationCode(email: string) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { success: false, error: "User with this email already exists" }
    }

    const code = generateVerificationCode()
    const expires = Date.now() + 10 * 60 * 1000 // 10 minutes

    // Store verification code
    verificationCodes.set(email, { code, expires })

    // Send email
    await sendVerificationEmail(email, code)

    return { success: true }
  } catch (error) {
    console.error("Error sending verification code:", error)
    return { success: false, error: "Failed to send verification code" }
  }
}

export async function verifyEmailCode(email: string, code: string) {
  try {
    const stored = verificationCodes.get(email)

    if (!stored) {
      return { success: false, error: "Verification code not found" }
    }

    if (Date.now() > stored.expires) {
      verificationCodes.delete(email)
      return { success: false, error: "Verification code expired" }
    }

    if (stored.code !== code) {
      return { success: false, error: "Invalid verification code" }
    }

    // Code is valid
    verificationCodes.delete(email)
    return { success: true }
  } catch (error) {
    console.error("Error verifying code:", error)
    return { success: false, error: "Failed to verify code" }
  }
}

export async function createUser(userData: {
  email: string
  username: string
  password: string
}) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: userData.email,
      },
    })

    if (existingUser) {
      throw new Error("User with this email already exists")
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        password: hashedPassword,
        plan: "FREEMIUM",
      },
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        image: user.image,
        plan: user.plan,
      },
    }
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

export async function authenticateUser(email: string, password: string) {
  try {
    // Find user with auth provider
    const userPassword = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
      },
    })

    if (!userPassword) {
      throw new Error("User not found")
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, userPassword.password)

    if (!isValidPassword) {
      throw new Error("Invalid email or password")
    }

    // Update last login
    await prisma.user.update({
      where: { id: userPassword.id },
      data: { lastLogin: new Date() },
    })

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new Error("User not found")
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        image: user.image,
        plan: user.plan,
      },
    }
  } catch (error) {
    console.error("Error authenticating user:", error)
    throw error
  }
}

export async function createPasswordResetToken(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if email exists for security
      return { success: true }
    }

    // Generate reset token and code
    const resetToken = await createToken(user.id, TokenType.RESET_PASSWORD)

    // Send reset email
    const resetUrl = `${env.APP_URL}/reset-password?token=${resetToken}`
    await sendPasswordResetEmail(email, resetUrl)

    return { success: true }
  } catch (error) {
    console.error("Error creating password reset token:", error)
    throw error
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const reset_token = await prisma.token.findFirst({
      where: {
        id: token,
        tokenType: TokenType.RESET_PASSWORD,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!reset_token) {
      throw new Error("Invalid or expired reset token")
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password and clear reset token
    revokeToken(reset_token.id, TokenType.RESET_PASSWORD)

    return { success: true }
  } catch (error) {
    console.error("Error resetting password:", error)
    throw error
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error("User not found")
    }

    const hashedNewPassword = await hashPassword(newPassword)

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, hashedNewPassword)

    if (!isValidPassword) {
      throw new Error("Current password is incorrect")
    }

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error changing password:", error)
    throw error
  }
}

export async function createToken(userId: string, type: TokenType, email: string = "") {
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Get User Email if not provided
    if (!email) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })

      if (!user) {
        throw new Error("User not found")
      }
      email = user.email
    }

    const token = await prisma.token.create({
      data: {
        userId,
        expiresAt,
        tokenType: type,
      },
    })

    return token.id
  } catch (error) {
    console.error("Error creating refresh token:", error)
    throw error
  }
}

export async function validateToken(tokenId: string, type: TokenType) {
  try {
    const token = await prisma.token.findUnique({
      where: { id: tokenId, tokenType: type },
    })

    if (!token || token.expiresAt < new Date()) {
      if (token) {
        // Clean up expired token
        revokeToken(token.id, type)
      }
      throw new Error("Invalid or expired token")
    }

    const user = await prisma.user.findUnique({
      where: { id: token.userId },
      select: {
        id: true,
        email: true,
        username: true,
      },
    })

    if (!user) {
      throw new Error("User not found")
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    }
  } catch (error) {
    console.error("Error validating token:", error)
    throw error
  }
}

export async function revokeToken(tokenId: string, type: TokenType) {
  try {
    await prisma.token.delete({
      where: { id: tokenId, tokenType: type },
    })
    return { success: true }
  } catch (error) {
    console.error("Error revoking token:", error)
    throw error
  }
}