'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Clock,
  BarChart3,
  Users,
  Twitter,
  ShoppingBag,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { BlurredSocialCard } from './blurred-social-card';
import Link from 'next/link';
import { AuthProvider } from '@/hooks/use-profile';

interface FreemiumPlatformConnectionsProps {
  className?: string;
  onConnect?: (platform: string) => void;
  loading?: string | null;
  connectedPlatforms?: AuthProvider[];
}

export function FreemiumPlatformConnections({
  className = '',
  onConnect,
  loading,
  connectedPlatforms = [],
}: FreemiumPlatformConnectionsProps) {
  const [connectingProgress, setConnectingProgress] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const handleConnectXAds = async () => {
    if (onConnect) {
      // Start connecting animation
      setConnectingProgress(0);
      setShowSuccess(false);

      // Simulate connection progress
      const progressInterval = setInterval(() => {
        setConnectingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => setShowSuccess(true), 200);
            return 100;
          }
          return prev + 20;
        });
      }, 200);

      onConnect('twitter');
    } else {
      // TODO: Implement X Ads API connection
      console.log('Connecting to X Ads API...');
    }
  };

  // Debug: Log to trace connection state
  React.useEffect(() => {
    console.log('🔍 FreemiumPlatformConnections - connectedPlatforms:', {
      count: connectedPlatforms.length,
      platforms: connectedPlatforms.map((p) => p.provider),
      hasTwitter: connectedPlatforms.some((p) => p.provider === 'twitter'),
    });
  }, [connectedPlatforms]);

  const isConnected = connectedPlatforms.some(
    (platform) => platform.provider === 'twitter'
  );
  const connectionData = connectedPlatforms.find(
    (platform) => platform.provider === 'twitter'
  );
  const isLoadingTwitter = loading === 'twitter';

  console.log('🔍 Twitter connection status:', {
    isConnected,
    hasConnectionData: !!connectionData,
    isLoadingTwitter,
  });

  // Reset states when connection is complete
  React.useEffect(() => {
    if (isConnected && connectingProgress === 100) {
      setTimeout(() => {
        setConnectingProgress(0);
        setShowSuccess(false);
      }, 2000);
    }
  }, [isConnected, connectingProgress]);

  return (
    <section className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">
          Platform Connections
        </h2>
        <p className="text-gray-600">
          Connect your advertising accounts to start analyzing your campaigns
        </p>
      </div>

      {/* Two-card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card - X Ads API Connection */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          role="region"
          aria-labelledby="x-ads-title"
          className="relative"
        >
          <Card className="h-full bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
            {/* Dark top border strip */}
            <div className="h-1 bg-gradient-to-r from-gray-800 to-gray-600"></div>

            <CardContent className="p-6 space-y-6">
              {/* Header with Icon and Title */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg">
                  <Twitter className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3
                    id="x-ads-title"
                    className="text-xl font-bold text-gray-900"
                  >
                    X (formerly Twitter)
                  </h3>
                  <p className="text-gray-600">
                    Access X (formerly Twitter) posts analytics
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Features:</h4>
                <div
                  className="flex flex-wrap gap-2"
                  aria-label="Available features"
                >
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 border-blue-200 rounded-full px-3 py-1"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Tweet Analytics
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-purple-50 text-purple-700 border-purple-200 rounded-full px-3 py-1"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Audience Insights
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-yellow-50 text-gray-700 border-yellow-200 rounded-full px-3 py-1"
                  >
                    <ShoppingBag className="h-3 w-3 mr-1" />
                    Ads API Insights{' '}
                    <Link href="/subscription">
                      <span className="underline text-blue-700 flex items-center ml-2 cursor-pointer">
                        Upgrade{' '}
                        <ExternalLink className="inline-block h-3 w-3 ml-1" />
                      </span>
                    </Link>
                  </Badge>
                </div>
              </div>

              {/* Status Panel */}
              <div
                className={`rounded-lg p-4 border transition-all duration-300 ${
                  isConnected
                    ? 'bg-green-50 border-green-200'
                    : connectingProgress > 0
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                }`}
                aria-live="polite"
              >
                <div className="flex items-center space-x-2 mb-2">
                  {connectingProgress > 0 && !isConnected ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    >
                      <Clock className="h-4 w-4 text-blue-500" />
                    </motion.div>
                  ) : (
                    <Clock
                      className={`h-4 w-4 ${
                        isConnected ? 'text-green-500' : 'text-gray-500'
                      }`}
                    />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      isConnected
                        ? 'text-green-700'
                        : connectingProgress > 0
                          ? 'text-blue-700'
                          : 'text-gray-700'
                    }`}
                  >
                    {connectingProgress > 0 && !isConnected
                      ? `Connecting... ${connectingProgress}%`
                      : isConnected
                        ? 'Connected'
                        : 'Not Connected'}
                  </span>
                </div>

                {/* Progress bar for connecting state */}
                {connectingProgress > 0 && !isConnected && (
                  <div className="mb-2">
                    <div className="w-full bg-blue-100 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${connectingProgress}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                      />
                    </div>
                  </div>
                )}

                {isConnected && connectionData ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs text-green-600 space-y-1"
                  >
                    {connectionData.username && (
                      <p>Account: @{connectionData.username}</p>
                    )}
                    {connectionData.email && (
                      <p>Email: {connectionData.email}</p>
                    )}
                  </motion.div>
                ) : connectingProgress > 0 ? (
                  <p className="text-xs text-blue-600">
                    Setting up your X (formerly Twitter) connection...
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Connect your X (formerly Twitter) account to start analyzing
                    your posts analytics
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <div className="relative">
                <Button
                  onClick={handleConnectXAds}
                  disabled={
                    isLoadingTwitter || isConnected || connectingProgress > 0
                  }
                  className="w-full h-12 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white font-semibold rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                  aria-describedby="x-ads-description"
                >
                  {/* Progress overlay */}
                  {connectingProgress > 0 && !isConnected && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${connectingProgress}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 opacity-30"
                    />
                  )}

                  {/* Button content */}
                  <div className="relative z-10 flex items-center justify-center">
                    {isLoadingTwitter || connectingProgress > 0 ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"
                        />
                        {connectingProgress > 0
                          ? `Connecting... ${connectingProgress}%`
                          : 'Connecting...'}
                      </>
                    ) : showSuccess || isConnected ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          duration: 0.5,
                          type: 'spring',
                          stiffness: 120,
                        }}
                        className="flex items-center"
                      >
                        <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                        Connected
                      </motion.div>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        Connect
                      </>
                    )}
                  </div>
                </Button>
              </div>
              <div id="x-ads-description" className="sr-only">
                Connect your X advertising account to access analytics and
                insights
              </div>
            </CardContent>
          </Card>
        </motion.article>

        {/* Right Card - Blurred Social Media Kit */}
        <BlurredSocialCard />
      </div>
    </section>
  );
}
