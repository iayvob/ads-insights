'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PremiumPlatformConnection } from '@/components/profile/platform/premium-platform-connections';
import { FreemiumPlatformConnections } from '@/components/profile/platform/freemium-platform-connections';
import { AuthProvider } from '@/hooks/use-profile';
import { SubscriptionPlan } from '@prisma/client';

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
  userPlan = 'FREEMIUM',
  onConnect,
  onDisconnect,
}: PlatformConnectionsProps) {
  // If user is on freemium plan, show the new design
  if (!isPremium && userPlan === 'FREEMIUM') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* New Platform Connections Design for Freemium */}
        <FreemiumPlatformConnections
          onConnect={onConnect}
          loading={loading}
          connectedPlatforms={connectedPlatforms}
        />

        {/* Show existing connected platforms if any */}
        {connectedPlatforms.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Your Connected Platforms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connectedPlatforms.map((platform, index) => (
                <motion.div
                  key={`${platform.provider}-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-green-50 border border-green-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-800 capitalize">
                        {platform.provider}
                      </h4>
                      {platform.username && (
                        <p className="text-sm text-green-600">
                          @{platform.username}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onDisconnect(platform.provider)}
                      disabled={loading === platform.provider}
                      className="text-red-600 hover:text-red-700 text-sm underline"
                    >
                      {loading === platform.provider
                        ? 'Disconnecting...'
                        : 'Disconnect'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // For premium users, show the existing comprehensive platform connections
  return (
    <PremiumPlatformConnection
      connectedPlatforms={connectedPlatforms}
      loading={loading}
      progress={progress}
      isPremium={isPremium}
      userPlan={userPlan}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
    />
  );
}
