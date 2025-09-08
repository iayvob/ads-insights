"use client";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Facebook,
  Instagram,
  Twitter,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  LogOut,
  Settings,
  Clock,
  Zap,
  Shield,
  Crown,
  Lock,
  Video,
} from "lucide-react";
import { AuthProvider } from "@/hooks/use-profile";
import { isPlatformAccessible, getRestrictionMessage } from "@/lib/subscription-access";
import { SubscriptionPlan } from "@prisma/client";

interface PlatformConnectionsProps {
  connectedPlatforms: AuthProvider[];
  loading: string | null;
  progress: number;
  isPremium: boolean;
  userPlan?: SubscriptionPlan;
  onConnect: (platform: string) => void;
  onDisconnect: (platform: string) => void;
}

export function PlatformConnections({
  connectedPlatforms,
  loading,
  progress,
  isPremium,
  userPlan = "FREEMIUM",
  onConnect,
  onDisconnect,
}: PlatformConnectionsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isConnected = (platform: string) => {
    return connectedPlatforms.some(provider => provider.provider === platform);
  };

  const getConnectionData = (platform: string) => {
    return connectedPlatforms.find(provider => provider.provider === platform);
  };

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return daysDiff < 7;
  };

  const platformConfigs = [
    {
      id: "facebook",
      name: "Facebook Business",
      description: "Access Facebook Ads Manager and Pages",
      icon: Facebook,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
      features: ["Ad Campaigns", "Page Insights", "Audience Data"],
    },
    {
      id: "instagram",
      name: "Instagram Business",
      description: "Connect Instagram Business Profile",
      icon: Instagram,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-700",
      features: ["Stories Analytics", "Posts Insights", "Audience Demographics"],
    },
    {
      id: "twitter",
      name: "X Ads API",
      description: "Access X advertising platform",
      icon: Twitter,
      color: "from-gray-800 to-black",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-gray-700",
      features: ["Tweet Analytics", "Ad Performance", "Audience Insights"],
    },
    {
      id: "tiktok",
      name: "TikTok for Business",
      description: "Connect TikTok Business Account",
      icon: Video,
      color: "from-pink-500 to-red-500",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200",
      textColor: "text-pink-700",
      features: ["Video Analytics", "Ad Performance", "Creator Insights"],
    },
    {
      id: "amazon",
      name: "Amazon Advertising",
      description: "Connect Amazon DSP and Sponsored Products",
      icon: ShoppingBag,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-700",
      features: ["Sponsored Products", "DSP Campaigns", "Brand Analytics"],
      isPremium: true,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${
            isPremium ? "text-yellow-800" : "text-gray-800"
          }`}>
            Platform Connections
          </h2>
          <p className="text-gray-600">
            Connect your advertising accounts to start analyzing your campaigns
          </p>
        </div>
        {isPremium && (
          <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        )}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {platformConfigs.map((platform) => {
          const connected = isConnected(platform.id);
          const connectionData = getConnectionData(platform.id);
          const isLoadingThis = loading === platform.id;
          const expiringSoon = connectionData && isExpiringSoon(connectionData.expiresAt);
          const requiresPremium = platform.isPremium && !isPremium;
          const hasAccess = isPlatformAccessible(platform.id, userPlan);

          return (
            <motion.div key={platform.id} variants={cardVariants}>
              <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                connected 
                  ? `${platform.bgColor} ${platform.borderColor}` 
                  : "border-gray-200 hover:border-gray-300"
              } ${!hasAccess ? "opacity-75" : ""}`}>
                {/* Premium Badge */}
                {platform.isPremium && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  </div>
                )}

                {/* Access Restriction Badge */}
                {!hasAccess && (
                  <div className="absolute top-3 left-3 z-10">
                    <Badge variant="outline" className="bg-white/90 text-gray-600 border-gray-300">
                      <Lock className="h-3 w-3 mr-1" />
                      Restricted
                    </Badge>
                  </div>
                )}

                {/* Gradient Header */}
                <div className={`h-2 bg-gradient-to-r ${platform.color}`} />

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${platform.color} text-white shadow-lg`}>
                        <platform.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{platform.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {platform.description}
                        </CardDescription>
                      </div>
                    </div>
                    
                    {connected && (
                      <div className="flex items-center space-x-2">
                        {expiringSoon ? (
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Features List */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {platform.features.map((feature, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs bg-gray-100 text-gray-700"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Connection Status */}
                  {connected && connectionData ? (
                    <div className="space-y-3">
                      <div className={`p-3 rounded-lg bg-green-50 border border-green-200`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">Connected</span>
                          </div>
                          {expiringSoon && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              <Clock className="h-3 w-3 mr-1" />
                              Expires Soon
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-green-700">
                          {connectionData.username && (
                            <p>Account: @{connectionData.username}</p>
                          )}
                          {connectionData.email && (
                            <p>Email: {connectionData.email}</p>
                          )}
                          <p>Connected: {formatDate(connectionData.createdAt)}</p>
                          {connectionData.expiresAt && (
                            <p>Expires: {formatDate(connectionData.expiresAt)}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDisconnect(platform.id)}
                          disabled={isLoadingThis}
                          className="flex-1"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!hasAccess ? (
                        <Alert className="border-orange-200 bg-orange-50">
                          <Lock className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-orange-800">
                            <strong>{getRestrictionMessage("platform", platform.name)}</strong>
                          </AlertDescription>
                        </Alert>
                      ) : requiresPremium ? (
                        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <Crown className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">Premium Required</span>
                          </div>
                          <p className="text-sm text-yellow-700">
                            Upgrade to Premium to connect {platform.name}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-800">Not Connected</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Connect your {platform.name} account to start analyzing your campaigns
                          </p>
                        </div>
                      )}

                      {isLoadingThis && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Connecting...</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      <Button
                        onClick={() => onConnect(platform.id)}
                        disabled={isLoadingThis || !hasAccess}
                        className={`w-full ${hasAccess 
                          ? `bg-gradient-to-r ${platform.color} hover:shadow-lg` 
                          : 'bg-gray-300 cursor-not-allowed'
                        } transition-all duration-200`}
                      >
                        {isLoadingThis ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Connecting...
                          </>
                        ) : !hasAccess ? (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Upgrade Required
                          </>
                        ) : requiresPremium ? (
                          <>
                            <Crown className="h-4 w-4 mr-2" />
                            Upgrade to Connect
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Connect {platform.name}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Connection Stats */}
      <Card className={`${
        isPremium 
          ? "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200" 
          : ""
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${
                isPremium 
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500" 
                  : "bg-gradient-to-r from-blue-500 to-purple-500"
              } text-white`}>
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className={`font-semibold ${
                  isPremium ? "text-yellow-800" : "text-gray-800"
                }`}>
                  Connection Status
                </h3>
                <p className="text-sm text-gray-600">
                  {connectedPlatforms.length} of {platformConfigs.length} platforms connected
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                isPremium ? "text-yellow-600" : "text-blue-600"
              }`}>
                {Math.round((connectedPlatforms.length / platformConfigs.length) * 100)}%
              </div>
              <p className="text-sm text-gray-500">Complete</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
