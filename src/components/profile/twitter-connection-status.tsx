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
}

export default function TwitterConnectionStatus({
  hasOAuth2Connection,
  hasOAuth1Connection,
  username,
  onConnectOAuth1,
}: TwitterConnectionStatusProps) {
  const getConnectionStatus = () => {
    if (hasOAuth2Connection && hasOAuth1Connection) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        title: 'Full Twitter Access',
        description: 'You can post text tweets and media uploads',
        badge: 'Complete',
        badgeColor: 'bg-green-100 text-green-800',
      };
    } else if (hasOAuth2Connection && !hasOAuth1Connection) {
      return {
        icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
        title: 'Limited Twitter Access',
        description:
          'Text tweets work, but media uploads need additional setup',
        badge: 'Text Only',
        badgeColor: 'bg-amber-100 text-amber-800',
      };
    } else if (!hasOAuth2Connection && hasOAuth1Connection) {
      return {
        icon: <Info className="h-5 w-5 text-blue-600" />,
        title: 'Legacy Twitter Connection',
        description:
          'You have OAuth 1.0a but need OAuth 2.0 for modern features',
        badge: 'Legacy',
        badgeColor: 'bg-blue-100 text-blue-800',
      };
    } else {
      return {
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
        title: 'No Twitter Connection',
        description: 'Connect your Twitter account to start posting',
        badge: 'Not Connected',
        badgeColor: 'bg-red-100 text-red-800',
      };
    }
  };

  const status = getConnectionStatus();

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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>OAuth 2.0 (Text Tweets)</span>
            {hasOAuth2Connection ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>OAuth 1.0a (Media Uploads)</span>
            {hasOAuth1Connection ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
            )}
          </div>
        </div>

        {hasOAuth2Connection && !hasOAuth1Connection && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-sm text-amber-800">
                <strong>Media Upload Limitation:</strong>
                <br />X API media uploads still require OAuth 1.0a
                authentication due to platform limitations.
              </div>
            </div>

            {onConnectOAuth1 && (
              <Button
                onClick={onConnectOAuth1}
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect OAuth 1.0a for Media Uploads
              </Button>
            )}
          </div>
        )}

        {!hasOAuth2Connection && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-800">
                <strong>Connect Twitter:</strong>
                <br />
                Start by connecting your Twitter account with OAuth 2.0 for text
                posting.
              </div>
            </div>

            <Button className="w-full" variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Twitter Account
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <div className="space-y-1">
            <div>• OAuth 2.0: Modern authentication for text tweets</div>
            <div>
              • OAuth 1.0a: Required for media uploads (X API limitation)
            </div>
            <div>• Both connections can coexist safely</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
