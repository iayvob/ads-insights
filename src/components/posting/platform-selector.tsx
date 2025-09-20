'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Facebook,
  Instagram,
  Twitter,
  Share2,
  CheckCircle,
  AlertCircle,
  Clock,
  Lock,
  ShoppingBag,
  Video,
} from 'lucide-react';
import { SocialPlatform } from '@/validations/posting-types';
import { SubscriptionPlan } from '@prisma/client';
import { useSession } from '@/hooks/session-context';
import { validatePostingAccess } from '@/services/session-platform-manager';
import Link from 'next/link';

interface Platform {
  id: SocialPlatform;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  connected: boolean;
  status: 'connected' | 'disconnected' | 'pending' | 'restricted';
  characterLimit?: number;
  features: string[];
  requiresPremium?: boolean;
}

interface PlatformSelectorProps {
  selectedPlatforms: SocialPlatform[];
  onPlatformsChange: (platforms: SocialPlatform[]) => void;
}

export function PlatformSelector({
  selectedPlatforms,
  onPlatformsChange,
}: PlatformSelectorProps) {
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);
  const { data: session } = useSession();

  // Get user's subscription plan
  const userPlan = (session?.user?.plan || 'FREEMIUM') as SubscriptionPlan;

  // Define platforms with subscription restrictions
  const platforms: Platform[] = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 border-pink-200',
      connected: !!session?.connectedPlatforms?.instagram,
      status: !!session?.connectedPlatforms?.instagram
        ? 'connected'
        : 'disconnected',
      characterLimit: 2200,
      features: ['Images', 'Videos', 'Stories', 'Hashtags'],
      requiresPremium: true, // Instagram requires premium
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      connected: !!session?.connectedPlatforms?.facebook,
      status:
        userPlan === 'FREEMIUM'
          ? 'restricted'
          : !!session?.connectedPlatforms?.facebook
            ? 'connected'
            : 'disconnected',
      characterLimit: 63206,
      features: ['Images', 'Videos', 'Links', 'Hashtags'],
      requiresPremium: true, // Facebook requires premium
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: Twitter,
      color: 'text-gray-900',
      bgColor: 'bg-gray-50 border-gray-200',
      connected: !!session?.connectedPlatforms?.twitter,
      status:
        userPlan === 'FREEMIUM'
          ? 'restricted'
          : !!session?.connectedPlatforms?.twitter
            ? 'connected'
            : 'disconnected',
      characterLimit: 280,
      features: ['Images', 'Videos', 'Threads', 'Hashtags'],
      requiresPremium: true, // Twitter requires premium
    },
    {
      id: 'amazon',
      name: 'Amazon',
      icon: ShoppingBag,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
      connected: !!session?.connectedPlatforms?.amazon,
      status:
        userPlan === 'FREEMIUM'
          ? 'restricted'
          : !!session?.connectedPlatforms?.amazon
            ? 'connected'
            : 'disconnected',
      characterLimit: 1000,
      features: ['Brand Content', 'Product ASINs', 'Images', 'Videos'],
      requiresPremium: true, // Amazon requires premium
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: Video,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50 border-pink-200',
      connected: !!session?.connectedPlatforms?.tiktok,
      status:
        userPlan === 'FREEMIUM'
          ? 'restricted'
          : !!session?.connectedPlatforms?.tiktok
            ? 'connected'
            : 'disconnected',
      characterLimit: 2200,
      features: ['Videos', 'Photos', 'Hashtags', 'Music', 'Effects'],
      requiresPremium: true, // TikTok requires premium
    },
  ];

  const handlePlatformToggle = (platformId: SocialPlatform) => {
    const platform = platforms.find((p) => p.id === platformId);
    if (!platform) return;

    // Check if platform is restricted for current plan
    if (platform.status === 'restricted') return;

    // Check if platform is connected
    if (!platform.connected) return;

    // Validate posting access
    const access = validatePostingAccess(platformId, userPlan);
    if (!access.allowed) return;

    if (selectedPlatforms.includes(platformId)) {
      onPlatformsChange(selectedPlatforms.filter((id) => id !== platformId));
    } else {
      onPlatformsChange([...selectedPlatforms, platformId]);
    }
  };

  const getStatusIcon = (status: Platform['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'restricted':
        return <Lock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: Platform['status']) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Connect Account';
      case 'pending':
        return 'Authorization Pending';
      case 'restricted':
        return 'Premium Required';
    }
  };

  const connectedPlatforms = platforms.filter(
    (p) => p.connected && p.status !== 'restricted'
  );
  const availablePlatforms = platforms.filter((p) => p.status !== 'restricted');
  const selectedCount = selectedPlatforms.length;

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-purple-600" />
            Select Platforms
          </CardTitle>
          {selectedCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-purple-100 text-purple-800"
            >
              {selectedCount} selected
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600">
          Choose which platforms to publish your content to
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPlatformsChange(connectedPlatforms.map((p) => p.id))
            }
            className="text-xs"
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPlatformsChange([])}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>

        {/* Platform Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onHoverStart={() => setHoveredPlatform(platform.id)}
              onHoverEnd={() => setHoveredPlatform(null)}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer
                ${platform.connected ? 'hover:shadow-md' : 'opacity-60 cursor-not-allowed'}
                ${
                  selectedPlatforms.includes(platform.id)
                    ? `${platform.bgColor} border-current ${platform.color} shadow-sm`
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => handlePlatformToggle(platform.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${platform.bgColor}`}>
                    <platform.icon className={`h-5 w-5 ${platform.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {platform.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs">
                      {getStatusIcon(platform.status)}
                      <span
                        className={`
                        ${platform.status === 'connected' ? 'text-green-600' : ''}
                        ${platform.status === 'disconnected' ? 'text-red-600' : ''}
                        ${platform.status === 'pending' ? 'text-yellow-600' : ''}
                      `}
                      >
                        {getStatusText(platform.status)}
                      </span>
                    </div>
                    {platform.id === 'instagram' && (
                      <div className="text-xs text-orange-500 mt-1">
                        * Requires at least one media file
                      </div>
                    )}
                  </div>
                </div>

                {platform.connected && (
                  <Switch
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={() => handlePlatformToggle(platform.id)}
                  />
                )}
              </div>

              {/* Character Limit */}
              {platform.characterLimit && (
                <div className="text-xs text-gray-500 mb-2">
                  Character limit: {platform.characterLimit.toLocaleString()}
                </div>
              )}

              {/* Features */}
              <div className="flex flex-wrap gap-1">
                {platform.features.map((feature) => (
                  <Badge
                    key={feature}
                    variant="outline"
                    className="text-xs py-0 px-2"
                  >
                    {feature}
                  </Badge>
                ))}
              </div>

              {/* Connect Button for Disconnected Platforms */}
              {!platform.connected && platform.status === 'disconnected' && (
                <Link href={`/profile?tab=connections`} className="w-full mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    Connect {platform.name}
                  </Button>
                </Link>
              )}

              {/* Hover Effects */}
              {hoveredPlatform === platform.id && platform.connected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg"
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Selected Platforms Summary */}
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg"
          >
            <h4 className="font-semibold text-gray-900 mb-2">Publishing to:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedPlatforms.map((platformId) => {
                const platform = platforms.find((p) => p.id === platformId);
                if (!platform) return null;

                return (
                  <Badge
                    key={platformId}
                    variant="secondary"
                    className={`${platform.bgColor} ${platform.color} border-0`}
                  >
                    <platform.icon className="h-3 w-3 mr-1" />
                    {platform.name}
                  </Badge>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Your post will be published to {selectedCount} platform
              {selectedCount > 1 ? 's' : ''}
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
