import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { handleApiError } from "@/lib/api-utils"
import type { ApiResponse } from "@/types/api"

interface UserData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  adAccount: string | null
  lastLoginAt: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<UserData>>> {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || "" },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Remove sensitive information
    const { id, name, email, image, adAccount, lastLoginAt, createdAt, updatedAt } = user

    return NextResponse.json({
      data: {
        id,
        name,
        email,
        image,
        adAccount,
        lastLoginAt,
        createdAt,
        updatedAt,
      },
    })
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<Partial<UserData>>>> {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    // Validate input data
    if (typeof data !== "object" || data === null) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    // Only allow updating specific fields
    const allowedFields = ["name", "image"]
    const updateData: Record<string, any> = {}

    for (const field of allowedFields) {
      if (field in data) {
        updateData[field] = data[field]
      }
    }

    const user = await prisma.user.update({
      where: { email: session.user?.email || "" },
      data: updateData,
    })

    return NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
