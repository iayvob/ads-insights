"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Facebook, Instagram, Twitter } from "lucide-react"
import Image from "next/image"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-16 h-16 mb-4 relative">
            <Image src="/placeholder.svg?height=64&width=64" alt="Ads Insights Logo" fill className="object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Connect your social media accounts to view your ad insights
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button
            className="bg-[#1877F2] hover:bg-[#0E65D9] text-white"
            onClick={() => signIn("facebook", { callbackUrl: "/dashboard" })}
          >
            <Facebook className="mr-2 h-4 w-4" />
            Continue with Facebook
          </Button>
          <Button
            className="bg-[#C13584] hover:bg-[#A62F72] text-white"
            onClick={() => signIn("instagram", { callbackUrl: "/dashboard" })}
          >
            <Instagram className="mr-2 h-4 w-4" />
            Continue with Instagram
          </Button>
          <Button
            className="bg-[#1DA1F2] hover:bg-[#0C85D0] text-white"
            onClick={() => signIn("twitter", { callbackUrl: "/dashboard" })}
          >
            <Twitter className="mr-2 h-4 w-4" />
            Continue with X (Twitter)
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-gray-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
