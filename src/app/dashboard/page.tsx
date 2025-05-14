import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlatformInsights } from "@/components/platform-insights"
import { OverviewMetrics } from "@/components/overview-metrics"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card } from "@/components/ui/card"
import { ErrorBoundary } from "@/components/error-boundary"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader
        title="Dashboard"
        description="Track and analyze your social media advertising performance"
        user={session.user}
      />

      <div className="flex-1 container py-6 space-y-8 max-w-7xl">
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList className="bg-muted/30 p-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger value="facebook" className="data-[state=active]:bg-[#1877F2] data-[state=active]:text-white">
                Facebook
              </TabsTrigger>
              <TabsTrigger
                value="instagram"
                className="data-[state=active]:bg-[#C13584] data-[state=active]:text-white"
              >
                Instagram
              </TabsTrigger>
              <TabsTrigger value="twitter" className="data-[state=active]:bg-[#1DA1F2] data-[state=active]:text-white">
                X (Twitter)
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <select className="bg-muted/30 text-sm rounded-md border border-border px-3 py-1.5">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>Last 90 days</option>
                <option>This year</option>
              </select>
            </div>
          </div>

          <Card className="border-border/50 shadow-md overflow-hidden">
            <ErrorBoundary>
              <TabsContent value="overview" className="m-0 animate-in">
                <OverviewMetrics />
              </TabsContent>
              <TabsContent value="facebook" className="m-0 animate-in">
                <PlatformInsights platform="facebook" />
              </TabsContent>
              <TabsContent value="instagram" className="m-0 animate-in">
                <PlatformInsights platform="instagram" />
              </TabsContent>
              <TabsContent value="twitter" className="m-0 animate-in">
                <PlatformInsights platform="twitter" />
              </TabsContent>
            </ErrorBoundary>
          </Card>
        </Tabs>
      </div>
    </div>
  )
}
