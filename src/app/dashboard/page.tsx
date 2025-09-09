"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Facebook,
  Instagram,
  Twitter,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Download,
  Loader2,
  Video,
  Lock,
  DollarSign,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { OverviewMetrics } from "@/components/dashboard/overview-metrics";
import { FacebookInsights } from "@/components/dashboard/facebook-insights";
import { InstagramInsights } from "@/components/dashboard/instagram-insights";
import { TwitterInsights } from "@/components/dashboard/twitter-insights";
import { TikTokInsights } from "@/components/dashboard/tiktok-insights";
import { AmazonInsights } from "@/components/dashboard/amazon-insights";
import { AdsAnalyticsComponent } from "@/components/dashboard/ads-analytics-component";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useSession } from "@/hooks/session-context";
import { generateMockAnalyticsData } from "@/lib/mock-analytics-data";
import {
  getPlatformAccess,
  getFeatureAccess,
  getAvailablePlatforms,
} from "@/lib/subscription-access";
import { filterAnalyticsData } from "@/services/session-platform-manager";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status, isLoading } = useSession();
  const {
    data: analyticsData,
    loading,
    error,
    refetch,
  } = useAnalyticsData();
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [mockData, setMockData] = useState<any>(null);


  // Get user's subscription plan and platform access
  const userPlan = (session?.user?.plan || "FREEMIUM") as any;
  const platformAccess = getPlatformAccess(userPlan);
  const featureAccess = getFeatureAccess(userPlan);
  const availablePlatforms = getAvailablePlatforms(userPlan);

  // Authentication check with redirect
  useEffect(() => {
    if (status === "loading" || isLoading) return;

    if (status === "unauthenticated" || !session?.authenticated) {
      router.push("/");
      return;
    }
  }, [session, status, isLoading, router]);

  // Set default tab based on available platforms
  useEffect(() => {
    if (availablePlatforms.length > 0 && activeTab === "overview") {
      // For freemium users, default to Instagram if connected
      if (userPlan === "FREEMIUM" && session?.connectedPlatforms?.instagram) {
        setActiveTab("instagram");
      }
    }
  }, [availablePlatforms, session?.connectedPlatforms, userPlan, activeTab]);

  // Generate mock data for demonstration
  useEffect(() => {
    if (!analyticsData && !loading && !error) {
      const mockAnalyticsData = generateMockAnalyticsData();

      // Filter data based on subscription plan for each platform
      const filteredData: any = {};
      availablePlatforms.forEach((platform) => {
        if (mockAnalyticsData[platform as keyof typeof mockAnalyticsData]) {
          filteredData[platform] = filterAnalyticsData(
            mockAnalyticsData[platform as keyof typeof mockAnalyticsData],
            platform,
            userPlan
          );
        }
      });

      setMockData(filteredData);
    }
  }, [
    analyticsData,
    loading,
    error,
    platformAccess,
    userPlan,
    availablePlatforms,
  ]);

  // Use real analytics data if available, otherwise fall back to mock data
  const displayData = analyticsData || mockData;

  // Auto-switch tabs based on connected platforms
  useEffect(() => {
    if (displayData && !loading) {
      if (activeTab === "overview") return;

      const connectedPlatforms = availablePlatforms.filter(
        (platform) =>
          session?.connectedPlatforms?.[platform as keyof typeof session.connectedPlatforms]
      );

      if (
        connectedPlatforms.length > 0 &&
        !connectedPlatforms.includes(activeTab)
      ) {
        setActiveTab(connectedPlatforms[0]);
      }
    }
  }, [displayData, loading, activeTab, availablePlatforms, session?.connectedPlatforms]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();

      // Regenerate mock data on refresh
      const mockAnalyticsData = generateMockAnalyticsData();
      const filteredData: any = {};

      availablePlatforms.forEach((platform) => {
        if (mockAnalyticsData[platform as keyof typeof mockAnalyticsData]) {
          filteredData[platform] = filterAnalyticsData(
            mockAnalyticsData[platform as keyof typeof mockAnalyticsData],
            platform,
            userPlan
          );
        }
      });

      setMockData(filteredData);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportData = () => {
    if (!displayData) return;

    const exportData = {
      ...displayData,
      exportedAt: new Date().toISOString(),
      subscription: userPlan,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `social-media-analytics-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Show loading while checking authentication
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (status === "unauthenticated" || !session?.authenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-48 sm:w-64"></div>
            <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 sm:h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-48 sm:h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get connected platforms based on session and platform access
  const connectedPlatforms = availablePlatforms.filter(
    (platform) =>
      session?.connectedPlatforms?.[platform as keyof typeof session.connectedPlatforms]
  );

  // Show connection prompt if no platforms are connected
  if (connectedPlatforms.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 sm:p-12 text-center">
            <AlertTriangle className="h-12 sm:h-16 w-12 sm:w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">
              No Connected Accounts
            </h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4">
              {userPlan === "FREEMIUM"
                ? "Connect Instagram to start viewing analytics"
                : "Connect your social media accounts to view analytics"}
            </p>
            <Button
              onClick={() => router.push("/profile")}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              Connect Accounts
            </Button>
            {userPlan === "FREEMIUM" && (
              <p className="text-xs text-gray-400 mt-2">
                Freemium plan includes Instagram only. Upgrade for more
                platforms.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="hover:bg-white/50 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-sm sm:text-lg text-gray-600">
                Monitor your social media performance
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            {/* User Plan Badge */}
            <Badge
              variant="outline"
              className={`capitalize ${
                userPlan === "FREEMIUM"
                  ? "bg-gray-100 text-gray-700 border-gray-300"
                  : "bg-purple-100 text-purple-700 border-purple-300"
              }`}
            >
              {userPlan} Plan
            </Badge>

            {/* Connected Platforms */}
            <div className="flex flex-wrap items-center gap-2">
              {connectedPlatforms.map((platform: string) => (
                <Badge
                  key={platform}
                  variant="secondary"
                  className="capitalize bg-white/80 backdrop-blur-sm text-xs"
                >
                  {platform === "facebook" && (
                    <Facebook className="h-3 w-3 mr-1" />
                  )}
                  {platform === "instagram" && (
                    <Instagram className="h-3 w-3 mr-1" />
                  )}
                  {platform === "twitter" && (
                    <Twitter className="h-3 w-3 mr-1" />
                  )}
                  {platform === "tiktok" && <Video className="h-3 w-3 mr-1" />}
                  {platform}
                </Badge>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                disabled={!featureAccess.exportData}
                className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 text-xs sm:text-sm"
              >
                <Download className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">
                  {featureAccess.exportData ? "Export" : ""}
                </span>
                {!featureAccess.exportData && <Lock className="h-4 w-4" />}
              </Button>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs sm:text-sm"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 sm:mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Plan Restrictions Alert */}
        {userPlan === "FREEMIUM" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Freemium Plan:</strong> You have access to Instagram
                posts analytics only.
                <Button
                  variant="link"
                  className="p-0 h-auto ml-1 text-blue-600"
                >
                  Upgrade to Premium
                </Button>{" "}
                to unlock all platforms and ads analytics.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last Updated */}
        {displayData?.lastUpdated && (
          <div className="text-sm text-gray-500 mb-6">
            Last updated: {new Date(displayData.lastUpdated).toLocaleString()}
          </div>
        )}

        {/* Dashboard Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-white/80 backdrop-blur-sm border-white/20 p-1 text-muted-foreground min-w-full w-max">
            <TabsTrigger
              value="overview"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>

            {platformAccess.instagram && (
              <>
                <TabsTrigger
                  value="instagram"
                  disabled={!connectedPlatforms.includes("instagram")}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <Instagram className="h-4 w-4 mr-2" />
                  Instagram
                </TabsTrigger>
              </>
            )}

            {platformAccess.facebook && (
              <TabsTrigger
                value="facebook"
                disabled={!connectedPlatforms.includes("facebook")}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </TabsTrigger>
            )}

            {platformAccess.twitter && (
              <TabsTrigger
                value="twitter"
                disabled={!connectedPlatforms.includes("twitter")}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-700 data-[state=active]:to-black data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                <Twitter className="h-4 w-4 mr-2" />
                Twitter
              </TabsTrigger>
            )}

            {platformAccess.tiktok && (
              <TabsTrigger
                value="tiktok"
                disabled={!connectedPlatforms.includes("tiktok")}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                <Video className="h-4 w-4 mr-2" />
                TikTok
              </TabsTrigger>
            )}

            {platformAccess.amazon && (
              <TabsTrigger
                value="amazon"
                disabled={!connectedPlatforms.includes("amazon")}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Amazon
              </TabsTrigger>
            )}
            </TabsList>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TabsContent value="overview" className="space-y-6">
                <OverviewMetrics data={displayData} />
              </TabsContent>

              {platformAccess.instagram && (
                <>
                  <TabsContent value="instagram" className="space-y-6">
                    <InstagramInsights
                      data={displayData?.instagram || mockData?.instagram}
                      error={displayData?.errors?.instagram}
                      canAccessAds={session?.user?.plan === "PREMIUM_MONTHLY" || session?.user?.plan === "PREMIUM_YEARLY"}
                    />
                    {/* Ads Analytics for Instagram if user has premium subscription */}
                    {(session?.user?.plan === "PREMIUM_MONTHLY" || session?.user?.plan === "PREMIUM_YEARLY") && displayData?.instagram?.ads && (
                      <div className="mt-8">
                        <AdsAnalyticsComponent 
                          data={displayData?.instagram?.ads || mockData?.instagram?.ads}
                          platform="instagram"
                        />
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="instagram-posting" className="space-y-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center space-y-4">
                          <h3 className="text-lg font-medium">Instagram Posting</h3>
                          <p className="text-sm text-muted-foreground">
                            Create and schedule posts for your Instagram account
                          </p>
                          <Button onClick={() => window.location.href = '/posting'}>
                            Go to Posting Interface
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </>
              )}

              {platformAccess.facebook && (
                <TabsContent value="facebook" className="space-y-6">
                  {/* Using the Facebook insights component that combines posts and ads */}
                  <FacebookInsights
                    data={displayData?.facebook || mockData?.facebook}
                    canAccessAds={session?.user?.plan === "PREMIUM_MONTHLY" || session?.user?.plan === "PREMIUM_YEARLY"}
                  />
                </TabsContent>
              )}

              {platformAccess.twitter && (
                <TabsContent value="twitter" className="space-y-6">
                  <TwitterInsights
                    data={displayData?.twitter || mockData?.twitter}
                    error={displayData?.errors?.twitter}
                  />
                  {/* Ads Analytics for Twitter if user has premium subscription */}
                  {(session?.user?.plan === "PREMIUM_MONTHLY" || session?.user?.plan === "PREMIUM_YEARLY") && displayData?.twitter?.ads && (
                    <div className="mt-8">
                      <AdsAnalyticsComponent 
                        data={displayData?.twitter?.ads || mockData?.twitter?.ads}
                        platform="twitter"
                      />
                    </div>
                  )}
                </TabsContent>
              )}

              {platformAccess.tiktok && (
                <TabsContent value="tiktok" className="space-y-6">
                  <TikTokInsights
                    data={displayData?.tiktok || mockData?.tiktok}
                    canAccessAds={session?.user?.plan === "PREMIUM_MONTHLY" || session?.user?.plan === "PREMIUM_YEARLY"}
                    error={displayData?.errors?.tiktok}
                  />
                  {/* Ads Analytics for TikTok if user has premium subscription */}
                  {(session?.user?.plan === "PREMIUM_MONTHLY" || session?.user?.plan === "PREMIUM_YEARLY") && displayData?.tiktok?.ads && (
                    <div className="mt-8">
                      <AdsAnalyticsComponent 
                        data={displayData?.tiktok?.ads || mockData?.tiktok?.ads}
                        platform="tiktok"
                      />
                    </div>
                  )}
                </TabsContent>
              )}

              {platformAccess.amazon && (
                <TabsContent value="amazon" className="space-y-6">
                  <AmazonInsights
                    data={displayData?.amazon || mockData?.amazon}
                    canAccessAds={session?.user?.plan === "PREMIUM_MONTHLY" || session?.user?.plan === "PREMIUM_YEARLY"}
                    error={displayData?.errors?.amazon}
                  />
                  {/* Ads Analytics for Amazon if user has premium subscription */}
                  {(session?.user?.plan === "PREMIUM_MONTHLY" || session?.user?.plan === "PREMIUM_YEARLY") && displayData?.amazon?.ads && (
                    <div className="mt-8">
                      <AdsAnalyticsComponent 
                        data={displayData?.amazon?.ads || mockData?.amazon?.ads}
                        platform="amazon"
                      />
                    </div>
                  )}
                </TabsContent>
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}
