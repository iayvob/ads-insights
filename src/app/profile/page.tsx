import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Calendar, Mail, User, Shield, Bell, Lock } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Separator } from "@/components/ui/separator"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader title="Profile" description="Manage your account details and preferences" user={session.user} />

      <div className="flex-1 container py-6 space-y-8 max-w-7xl">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 border-border/50 shadow-md">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Manage your account details and connected platforms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/20 rounded-lg border border-border/50">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {session.user.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold">{session.user.name}</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="mr-1 h-4 w-4" />
                    {session.user.email}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button size="sm" variant="outline" className="h-8">
                      Change Photo
                    </Button>
                    <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700">
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Connected Platforms</h4>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2]/10 text-[#1877F2]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">Facebook</div>
                        <div className="text-sm text-muted-foreground">
                          Connected on {new Date().toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-950/30 text-green-400 border-green-800">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C13584]/10 text-[#C13584]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">Instagram</div>
                        <div className="text-sm text-muted-foreground">
                          Connected on {new Date().toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-950/30 text-green-400 border-green-800">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1DA1F2]/10 text-[#1DA1F2]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">X (Twitter)</div>
                        <div className="text-sm text-muted-foreground">
                          Connected on {new Date().toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-950/30 text-green-400 border-green-800">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Account Details</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3 bg-muted/10">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">User ID</p>
                      <p className="text-xs text-muted-foreground">{session.user.id || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3 bg-muted/10">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Last Login</p>
                      <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border/50 shadow-md">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your preferences and security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Bell className="mr-2 h-4 w-4" />
                    Notification Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="mr-2 h-4 w-4" />
                    Privacy Settings
                  </Button>
                  <Separator className="my-2" />
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-500 hover:text-red-400 hover:bg-red-950/10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" x2="10" y1="11" y2="17" />
                      <line x1="14" x2="14" y1="11" y2="17" />
                    </svg>
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md">
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>Your account activity overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Ad Campaigns</span>
                      <span className="text-sm font-medium">12</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: "60%" }}></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Usage</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: "45%" }}></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Storage</span>
                      <span className="text-sm font-medium">28%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: "28%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
