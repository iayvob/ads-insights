import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        title="Settings"
        description="Manage your account settings and preferences"
        user={session.user}
      />

      <div className="flex-1 container py-6 max-w-7xl">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-muted/30 p-1">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>

          <Card className="border-border/50 shadow-md">
            <TabsContent value="general" className="m-0 animate-in">
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Profile Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" defaultValue={session.user.name || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={session.user.email || ""} />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Appearance</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="dark-mode">Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">Use dark theme throughout the application</p>
                      </div>
                      <Switch id="dark-mode" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="animations">Animations</Label>
                        <p className="text-sm text-muted-foreground">Enable animations and transitions</p>
                      </div>
                      <Switch id="animations" defaultChecked />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Language & Region</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <select id="language" className="w-full rounded-md border border-border bg-background px-3 py-2">
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="es">Spanish</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <select id="timezone" className="w-full rounded-md border border-border bg-background px-3 py-2">
                        <option value="utc">UTC</option>
                        <option value="est">Eastern Time (ET)</option>
                        <option value="pst">Pacific Time (PT)</option>
                        <option value="cet">Central European Time (CET)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="notifications" className="m-0 animate-in">
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="campaign-updates">Campaign Updates</Label>
                        <p className="text-sm text-muted-foreground">Receive updates about your ad campaigns</p>
                      </div>
                      <Switch id="campaign-updates" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="performance-alerts">Performance Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when your ads performance changes significantly
                        </p>
                      </div>
                      <Switch id="performance-alerts" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="billing-notifications">Billing Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive invoices and payment confirmations</p>
                      </div>
                      <Switch id="billing-notifications" defaultChecked />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">In-App Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="dashboard-alerts">Dashboard Alerts</Label>
                        <p className="text-sm text-muted-foreground">Show alerts on your dashboard</p>
                      </div>
                      <Switch id="dashboard-alerts" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="browser-notifications">Browser Notifications</Label>
                        <p className="text-sm text-muted-foreground">Allow browser push notifications</p>
                      </div>
                      <Switch id="browser-notifications" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="security" className="m-0 animate-in">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Password</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" />
                    </div>
                    <div></div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                  </div>
                  <Button className="mt-2 bg-blue-600 hover:bg-blue-700">Change Password</Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication is disabled</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Sessions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-muted-foreground">Started {new Date().toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm">Active</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="text-red-500 hover:text-red-400 hover:bg-red-950/10">
                    Log Out All Other Devices
                  </Button>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="api" className="m-0 animate-in">
              <CardHeader>
                <CardTitle>API Settings</CardTitle>
                <CardDescription>Manage your API keys and access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">API Keys</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
                      <div>
                        <p className="font-medium">Primary API Key</p>
                        <p className="text-sm text-muted-foreground">Created on {new Date().toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          Reveal
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-500">
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline">Generate New API Key</Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Webhooks</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="enable-webhooks">Enable Webhooks</Label>
                        <p className="text-sm text-muted-foreground">Receive real-time updates via webhooks</p>
                      </div>
                      <Switch id="enable-webhooks" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input id="webhook-url" placeholder="https://your-app.com/webhook" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
                </div>
              </CardContent>
            </TabsContent>
          </Card>
        </Tabs>
      </div>
    </div>
  )
}
