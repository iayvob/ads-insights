import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Calendar, Mail, User } from "lucide-react"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Manage your account details and connected platforms</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
                <AvatarFallback>{session.user.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-2xl font-bold">{session.user.name}</h3>
                <div className="flex items-center text-sm text-gray-500">
                  <Mail className="mr-1 h-4 w-4" />
                  {session.user.email}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <h4 className="font-medium">Connected Platforms</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                  Facebook
                </Badge>
                <Badge variant="outline" className="bg-pink-50 text-pink-700 hover:bg-pink-100">
                  Instagram
                </Badge>
                <Badge variant="outline" className="bg-sky-50 text-sky-700 hover:bg-sky-100">
                  X (Twitter)
                </Badge>
              </div>
            </div>

            <div className="grid gap-2">
              <h4 className="font-medium">Account Details</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">User ID</p>
                    <p className="text-xs text-gray-500">{session.user.id || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-xs text-gray-500">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">Update Profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your preferences and security</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Button variant="outline" className="w-full justify-start">
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Notification Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Privacy Settings
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600">
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
