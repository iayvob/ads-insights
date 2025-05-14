import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlatformInsights } from "@/components/platform-insights"
import { OverviewMetrics } from "@/components/overview-metrics"
import { UserProfile } from "@/components/user-profile"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <UserProfile user={session.user} />
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="twitter">X (Twitter)</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <OverviewMetrics />
        </TabsContent>
        <TabsContent value="facebook" className="space-y-4">
          <PlatformInsights platform="facebook" />
        </TabsContent>
        <TabsContent value="instagram" className="space-y-4">
          <PlatformInsights platform="instagram" />
        </TabsContent>
        <TabsContent value="twitter" className="space-y-4">
          <PlatformInsights platform="twitter" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
