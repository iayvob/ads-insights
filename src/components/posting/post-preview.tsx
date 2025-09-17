'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Eye,
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  ShoppingBag,
} from 'lucide-react';

interface PostPreviewProps {
  content: string;
  hashtags: string[];
  mediaFiles: File[];
  platforms: string[];
  amazonContent?: {
    brandName?: string;
    headline?: string;
    productASINs?: string[];
  };
  tiktokContent?: {
    advertiserId: string;
    videoProperties?: {
      title?: string;
      privacy?: string;
      allowComment?: boolean;
      allowDuet?: boolean;
      allowStitch?: boolean;
    };
  };
  selectedTikTokVideo?: File | null;
}

const platformConfigs = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    maxLength: 2200,
    showReactions: true,
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    maxLength: 2200,
    showReactions: true,
  },
  twitter: {
    name: 'Twitter/X',
    icon: Twitter,
    color: 'text-gray-900',
    bgColor: 'bg-gray-50',
    maxLength: 280,
    showReactions: false,
  },
  amazon: {
    name: 'Amazon',
    icon: ShoppingBag,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    maxLength: 1000,
    showReactions: false,
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    maxLength: 1300,
    showReactions: true,
  },
};

export function PostPreview({
  content,
  hashtags,
  mediaFiles,
  platforms,
  amazonContent,
}: PostPreviewProps) {
  const fullContent =
    content +
    (hashtags.length > 0
      ? '\n\n' + hashtags.map((tag) => `#${tag}`).join(' ')
      : '');

  const formatContentForPlatform = (platformId: string) => {
    const config = platformConfigs[platformId as keyof typeof platformConfigs];
    if (!config) return fullContent;

    if (fullContent.length <= config.maxLength) {
      return fullContent;
    }

    const truncated = fullContent.substring(0, config.maxLength - 3) + '...';
    return truncated;
  };

  const getContentStatus = (platformId: string) => {
    const config = platformConfigs[platformId as keyof typeof platformConfigs];
    if (!config) return { status: 'unknown', color: 'text-gray-500' };

    const length = fullContent.length;
    if (length === 0) return { status: 'empty', color: 'text-gray-400' };
    if (length <= config.maxLength * 0.8)
      return { status: 'good', color: 'text-green-600' };
    if (length <= config.maxLength)
      return { status: 'warning', color: 'text-yellow-600' };
    return { status: 'over', color: 'text-red-600' };
  };

  if (platforms.length === 0) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-gray-600" />
            Post Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select platforms to see preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-purple-600" />
          Post Preview
        </CardTitle>
        <p className="text-sm text-gray-600">
          How your post will appear on each platform
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {platforms.map((platformId, index) => {
          const config =
            platformConfigs[platformId as keyof typeof platformConfigs];
          if (!config) return null;

          const platformContent = formatContentForPlatform(platformId);
          const status = getContentStatus(platformId);

          return (
            <motion.div
              key={platformId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-3"
            >
              {/* Platform Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                    <config.icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <span className="font-medium text-sm">{config.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${status.color}`}>
                    {fullContent.length}/{config.maxLength}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${status.color.replace('text-', 'border-').replace('600', '300')}`}
                  >
                    {status.status === 'good' && 'Good'}
                    {status.status === 'warning' && 'Almost full'}
                    {status.status === 'over' && 'Too long'}
                    {status.status === 'empty' && 'Empty'}
                  </Badge>
                </div>
              </div>

              {/* Mock Post */}
              <div className="border border-gray-200 rounded-lg bg-white">
                {/* Post Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder-user.jpg" />
                    <AvatarFallback>YB</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Your Brand</div>
                    <div className="text-xs text-gray-500">Just now</div>
                  </div>
                  <MoreHorizontal className="h-5 w-5 text-gray-400" />
                </div>

                {/* Post Content */}
                <div className="p-4">
                  {/* Amazon-specific content */}
                  {platformId === 'amazon' && amazonContent && (
                    <div className="space-y-3 mb-3">
                      {amazonContent.brandName && (
                        <div className="flex items-center gap-2 text-sm text-orange-800 bg-orange-50 px-2 py-1 rounded">
                          <ShoppingBag className="h-4 w-4" />
                          <span className="font-medium">
                            {amazonContent.brandName}
                          </span>
                        </div>
                      )}
                      {amazonContent.headline && (
                        <div className="font-semibold text-gray-900 text-base">
                          {amazonContent.headline}
                        </div>
                      )}
                    </div>
                  )}

                  {platformContent && (
                    <div className="text-sm text-gray-900 whitespace-pre-wrap mb-3">
                      {platformContent}
                    </div>
                  )}

                  {/* Amazon Product ASINs */}
                  {platformId === 'amazon' &&
                    amazonContent?.productASINs &&
                    amazonContent.productASINs.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-600 mb-2">
                          Featured Products:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {amazonContent.productASINs.map((asin) => (
                            <Badge
                              key={asin}
                              variant="outline"
                              className="text-xs font-mono"
                            >
                              {asin}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Media Preview */}
                  {mediaFiles.length > 0 && (
                    <div className="mb-3">
                      {mediaFiles.length === 1 ? (
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-gray-500 text-sm">
                            {mediaFiles[0].type.startsWith('image/')
                              ? '📷 Image'
                              : '🎥 Video'}
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {mediaFiles.slice(0, 4).map((file, idx) => (
                            <div
                              key={idx}
                              className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center relative"
                            >
                              <span className="text-gray-500 text-xs">
                                {file.type.startsWith('image/') ? '📷' : '🎥'}
                              </span>
                              {mediaFiles.length > 4 && idx === 3 && (
                                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                  <span className="text-white text-xs">
                                    +{mediaFiles.length - 4}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Post Actions */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1 text-gray-500 hover:text-red-500 cursor-pointer">
                      <Heart className="h-5 w-5" />
                      <span className="text-sm">Like</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 hover:text-blue-500 cursor-pointer">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm">Comment</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 hover:text-green-500 cursor-pointer">
                      <Share className="h-5 w-5" />
                      <span className="text-sm">Share</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Character Count Warning */}
              {status.status === 'over' && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  ⚠️ Content exceeds {config.name}'s character limit and will be
                  truncated
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Overall Status */}
        {platforms.length > 1 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <span className="font-medium">
                Publishing to {platforms.length} platforms
              </span>
              {mediaFiles.length > 0 && (
                <span className="ml-2">
                  • {mediaFiles.length} media file
                  {mediaFiles.length > 1 ? 's' : ''}
                </span>
              )}
              {hashtags.length > 0 && (
                <span className="ml-2">
                  • {hashtags.length} hashtag{hashtags.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
