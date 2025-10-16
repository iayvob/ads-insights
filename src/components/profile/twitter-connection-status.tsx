import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info, ExternalLink } from 'lucide-react';

interface TwitterConnectionStatusProps {
  hasOAuth2Connection: boolean;
  hasOAuth1Connection: boolean;
  username?: string;
  onConnectOAuth1?: () => void;
  compact?: boolean; // Add compact mode for inline display
}

export default function TwitterConnectionStatus({
  hasOAuth2Connection,
  hasOAuth1Connection,
  username,
  onConnectOAuth1,
  compact = false,
}: TwitterConnectionStatusProps) {
  const getConnectionStatus = () => {
    if (hasOAuth2Connection && hasOAuth1Connection) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        title: 'Twitter Connected',
        description: 'Full access with text posts and media uploads',
        badge: 'Complete',
        badgeColor: 'bg-green-100 text-green-800',
      };
    } else if (hasOAuth2Connection && !hasOAuth1Connection) {
      return {
        icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
        title: 'Twitter Connected',
        description: 'Text posts enabled. Click below to enable media uploads.',
        badge: 'Text Only',
        badgeColor: 'bg-amber-100 text-amber-800',
      };
    } else {
      return {
        icon: <Info className="h-5 w-5 text-blue-600" />,
        title: 'Connect Twitter',
        description: 'Connect your Twitter account for posting',
        badge: 'Not Connected',
        badgeColor: 'bg-red-100 text-red-800',
      };
    }
  };

  const status = getConnectionStatus();

  // Compact mode for inline display (e.g., in platform connections list)
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={`${status.badgeColor} text-xs`}>{status.badge}</Badge>
        {hasOAuth2Connection && !hasOAuth1Connection && onConnectOAuth1 && (
          <Button
            onClick={onConnectOAuth1}
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Enable Media
          </Button>
        )}
      </div>
    );
  }

  // Full card mode
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status.icon}
            <CardTitle className="text-lg">{status.title}</CardTitle>
          </div>
          <Badge className={status.badgeColor}>{status.badge}</Badge>
        </div>
        <CardDescription>{status.description}</CardDescription>
        {username && (
          <div className="text-sm text-muted-foreground">
            Connected as: <span className="font-medium">@{username}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasOAuth2Connection && (
          <Button className="w-full" variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Connect Twitter Account
          </Button>
        )}

        {hasOAuth2Connection && !hasOAuth1Connection && onConnectOAuth1 && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-sm text-amber-800">
                <strong>Enable Media Uploads:</strong>
                <br />
                Complete the connection to enable posting images and videos.
              </div>
            </div>
            <Button
              onClick={onConnectOAuth1}
              className="w-full"
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Enable Media Uploads
            </Button>
          </div>
        )}

        {hasOAuth2Connection && hasOAuth1Connection && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-800">
              <strong>✓ Full Twitter Access</strong>
              <br />
              You can post text, images, and videos to Twitter.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
