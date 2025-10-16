'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Calendar,
  Settings,
  Edit3,
  Save,
  X,
  Crown,
  Sparkles,
  Shield,
  CreditCard,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/use-profile';
import { useSession } from '@/hooks/session-context';
import { PasswordChangeModal } from '@/components/profile/password-change-modal';
import { SubscriptionDetails } from '@/components/profile/subscription-details';
import { PlatformConnections } from '@/components/profile/platform-connections';
import {
  isPlatformAccessible,
  getRestrictionMessage,
} from '@/lib/subscription-access';

interface AuthStatus {
  facebook: boolean;
  instagram: boolean;
  twitter: boolean;
  amazon: boolean;
}

interface UserSession {
  facebook?: {
    accessToken: string;
    userId: string;
    name: string;
    expiresAt: number;
    email?: string;
  };
  instagram?: {
    accessToken: string;
    userId: string;
    username: string;
    expiresAt: number;
  };
  twitter?: {
    accessToken: string;
    userId: string;
    username: string;
    expiresAt: number;
  };
  amazon?: {
    accessToken: string;
    userId: string;
    username: string;
    expiresAt: number;
  };
}

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

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10,
    },
  },
};

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: session,
    status,
    isLoading,
    update: updateSession,
  } = useSession();
  const {
    profile,
    subscription,
    invoices,
    loading: profileLoading,
    error: profileError,
    updateProfile,
    isPremium,
    getConnectedPlatforms,
    refresh,
    synchronizeWithSession,
    manageSubscription,
  } = useProfile();

  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    facebook: false,
    instagram: false,
    twitter: false,
    amazon: false,
  });
  const [userSession, setUserSession] = useState<UserSession>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [editedProfile, setEditedProfile] = useState({
    username: '',
    email: '',
  });
  const { toast } = useToast();

  // Handle tab from URL query parameters
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (
      tabFromUrl &&
      ['overview', 'connections', 'subscription', 'settings'].includes(
        tabFromUrl
      )
    ) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Create ref for tracking parameter handling
  const hasHandledParams = React.useRef(false);

  // Handle error and success messages from URL search params
  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');

    // Only process params once per unique URL
    if (hasHandledParams.current) {
      return;
    }

    if (error) {
      hasHandledParams.current = true;
      let errorMessage = 'An error occurred';

      // Map common error codes to user-friendly messages
      switch (error) {
        case 'tiktok_auth_denied':
          errorMessage = 'TikTok authentication was cancelled or denied';
          break;
        case 'instagram_auth_denied':
          errorMessage = 'Instagram authentication was cancelled or denied';
          break;
        case 'facebook_auth_denied':
          errorMessage = 'Facebook authentication was cancelled or denied';
          break;
        case 'twitter_auth_denied':
          errorMessage = 'X (Twitter) authentication was cancelled or denied';
          break;
        case 'amazon_auth_denied':
          errorMessage = 'Amazon authentication was cancelled or denied';
          break;
        case 'missing_code':
          errorMessage = 'Authentication failed - missing authorization code';
          break;
        case 'invalid_state':
          errorMessage = 'Authentication failed - invalid security state';
          break;
        case 'callback_failed':
          errorMessage = 'Authentication callback failed. Please try again.';
          break;
        case 'not_authenticated':
          errorMessage = 'Please log in first before connecting platforms';
          break;
        case 'instagram_no_business_accounts':
          errorMessage =
            'No Instagram business accounts found. Please ensure your Instagram account is set up as a business account.';
          break;
        default:
          errorMessage = `Authentication error: ${error.replace(/_/g, ' ')}`;
      }

      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Clean up URL with setTimeout to avoid immediate re-render
      setTimeout(() => {
        router.replace('/profile?tab=connections', { scroll: false });
      }, 100);
    }

    if (success) {
      hasHandledParams.current = true;
      let successMessage = 'Authentication successful';

      // Map success codes to user-friendly messages
      switch (success) {
        case 'instagram':
          successMessage =
            'Instagram account connected successfully! Your analytics data will be available shortly.';
          break;
        case 'facebook':
          successMessage =
            'Facebook account connected successfully! Your analytics data will be available shortly.';
          break;
        case 'twitter':
          successMessage =
            'X (Twitter) account connected successfully! Your analytics data will be available shortly.';
          break;
        case 'twitter_full_access':
          successMessage =
            'X (Twitter) connected with full access! You can now post text tweets AND media uploads. 🎉';
          break;
        case 'twitter_oauth1_connected':
          successMessage =
            'X (Twitter) OAuth 1.0a connected! Media uploads are now enabled for your account.';
          break;
        case 'tiktok':
          successMessage =
            'TikTok account connected successfully! Your analytics data will be available shortly.';
          break;
        case 'amazon':
          successMessage =
            'Amazon account connected successfully! Your analytics data will be available shortly.';
          break;
        default:
          successMessage = `${success.replace(/_/g, ' ')} successfully!`;
      }

      toast({
        title: 'Connection Successful',
        description: successMessage,
      });

      // Refresh session and profile data after successful connection
      const refreshData = async () => {
        try {
          // Update session from server
          await updateSession();
          // Force refresh profile data
          await synchronizeWithSession();
          // No need for the extra timeout refresh - it's causing part of the loop
        } catch (error) {
          console.error('Failed to refresh data after connection:', error);
        }
      };

      refreshData();

      // Clean up URL with setTimeout to avoid immediate re-render
      setTimeout(() => {
        router.replace('/profile?tab=connections', { scroll: false });
      }, 100);
    }
  }, [searchParams, toast, router, updateSession, synchronizeWithSession]);

  // Refresh tokens when session is available
  useEffect(() => {
    if (session?.user?.id) {
      const refreshTokens = async () => {
        try {
          // Call token refresh API endpoint
          await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user?.id }),
          });
        } catch (error) {
          console.error('Failed to refresh tokens:', error);
        }
      };

      // Refresh tokens on page load
      refreshTokens();

      // Schedule token refresh every 30 minutes while page is open
      const refreshInterval = setInterval(refreshTokens, 30 * 60 * 1000);

      return () => clearInterval(refreshInterval);
    }
  }, [session?.user?.id]);

  // Update local state when session changes
  useEffect(() => {
    if (session?.authenticated) {
      // Update auth status from session data
      setAuthStatus({
        facebook:
          !!session.status?.facebook || !!session.connectedPlatforms?.facebook,
        instagram:
          !!session.status?.instagram ||
          !!session.connectedPlatforms?.instagram,
        twitter:
          !!session.status?.twitter || !!session.connectedPlatforms?.twitter,
        amazon: !!session.connectedPlatforms?.amazon,
      });

      // Set user session data
      setUserSession({
        facebook: session.connectedPlatforms?.facebook
          ? {
              accessToken:
                session.connectedPlatforms.facebook.account_tokens
                  ?.access_token || '',
              userId: session.user?.id || '',
              name: session.user?.name || '',
              expiresAt:
                session.connectedPlatforms.facebook.account_tokens
                  ?.expires_at || Date.now() + 3600000,
              email: session.user?.email,
            }
          : undefined,
        instagram: session.connectedPlatforms?.instagram
          ? {
              accessToken:
                session.connectedPlatforms.instagram.account_tokens
                  ?.access_token || '',
              userId: session.user?.id || '',
              username: session.user?.name || '',
              expiresAt:
                session.connectedPlatforms.instagram.account_tokens
                  ?.expires_at || Date.now() + 3600000,
            }
          : undefined,
        twitter: session.connectedPlatforms?.twitter
          ? {
              accessToken:
                session.connectedPlatforms.twitter.account_tokens
                  ?.access_token || '',
              userId: session.user?.id || '',
              username: session.user?.name || '',
              expiresAt:
                session.connectedPlatforms.twitter.account_tokens?.expires_at ||
                Date.now() + 3600000,
            }
          : undefined,
        amazon: session.connectedPlatforms?.amazon
          ? {
              accessToken:
                session.connectedPlatforms.amazon.account_tokens
                  ?.access_token || '',
              userId: session.user?.id || '',
              username: session.user?.name || '',
              expiresAt:
                session.connectedPlatforms.amazon.account_tokens?.expires_at ||
                Date.now() + 3600000,
            }
          : undefined,
      });

      // Note: Don't automatically synchronize here to avoid infinite loops
      // synchronizeWithSession will be called only when needed (e.g., after auth operations)
    }
  }, [session]);

  useEffect(() => {
    if (profile) {
      setEditedProfile({
        username: profile.username,
        email: profile.email,
      });
    }
  }, [profile]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL with new tab parameter
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    router.push(url.pathname + url.search, { scroll: false });
  };

  const handleAuth = async (platform: string) => {
    if (!profile?.id) {
      toast({
        title: 'Authentication Error',
        description:
          'Please ensure your profile is loaded before connecting platforms',
        variant: 'destructive',
      });
      return;
    }

    // Check if platform is accessible based on subscription
    if (!isPlatformAccessible(platform, profile.plan)) {
      toast({
        title: 'Premium Feature',
        description: getRestrictionMessage('platform', platform),
        variant: 'destructive',
      });
      return;
    }

    setLoading(platform);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const response = await axios.post(
        `/api/auth/${platform}/login`,
        {
          userId: profile.id,
        },
        {
          withCredentials: true,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );

      if (response.status === 200) {
        // Handle both new format (data.authUrl) and old format (authUrl)
        const authUrl = response.data?.data?.authUrl || response.data?.authUrl;

        if (authUrl) {
          setProgress(100);
          setTimeout(() => {
            // Open auth URL in a new tab
            window.open(authUrl, '_blank', 'noopener,noreferrer');
          }, 500);
        } else {
          throw new Error('No authentication URL received');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setProgress(0);

      let errorMessage = `Failed to authenticate with ${platform}`;

      if (error.response?.status === 401) {
        errorMessage =
          'Authentication session expired. Please refresh the page and try again.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error('Authentication error:', error);

      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setLoading(null);
        setProgress(0);
      }, 1000);
    }
  };

  const handleLogout = async (platform: string) => {
    try {
      setLoading(platform);

      const response = await axios.post(
        `/api/auth/${platform}/logout`,
        {
          userId: profile?.id || '',
        },
        {
          withCredentials: true,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );

      if (response.status === 200) {
        // Force session update and refresh profile data
        await updateSession();
        await refresh();

        // After successful logout, also update local state
        setAuthStatus((prev) => ({
          ...prev,
          [platform]: false,
        }));

        setUserSession((prev) => {
          const updated = { ...prev };
          delete updated[platform as keyof UserSession];
          return updated;
        });

        toast({
          title: 'Logged Out',
          description: `Successfully disconnected from ${platform}`,
        });
      } else {
        const data = response.data;
        throw new Error(
          data.error || data.message || `Failed to logout from ${platform}`
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout Error',
        description: `Failed to logout from ${platform}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleProfileSave = async () => {
    // Validate profile data before saving
    if (
      !editedProfile.username ||
      !editedProfile.email ||
      !editedProfile.email.includes('@')
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a valid username and email address',
        variant: 'destructive',
      });
      return;
    }

    const success = await updateProfile(editedProfile);

    if (success) {
      setIsEditing(false);

      // Refresh session data to ensure it's up to date
      await synchronizeWithSession();

      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been updated successfully',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen mt-[13rem] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.authenticated) {
    return null; // Will redirect via useEffect above
  }

  if (profileLoading && !profile) {
    return (
      <div className="min-h-screen mt-[13rem] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen mt-[13rem] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Profile Error</p>
            <p>{profileError}</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  const premiumTheme = isPremium();
  const backgroundGradient = premiumTheme
    ? 'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50'
    : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50';

  return (
    <div
      className={`min-h-screen ${backgroundGradient} relative overflow-hidden`}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
          className={`absolute top-1/4 left-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-xl opacity-30 ${
            premiumTheme ? 'bg-yellow-200' : 'bg-blue-200'
          }`}
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
          className={`absolute top-3/4 right-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-xl opacity-30 ${
            premiumTheme ? 'bg-amber-200' : 'bg-purple-200'
          }`}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 pt-[8rem]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto space-y-8"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants}>
            <Card
              className={`relative overflow-hidden ${
                premiumTheme
                  ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              {premiumTheme && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500" />
              )}
              <CardContent className="pt-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                        <AvatarImage
                          src={profile?.image}
                          alt={profile?.username}
                        />
                        <AvatarFallback
                          className={`text-xl font-bold ${
                            premiumTheme
                              ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white'
                              : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                          }`}
                        >
                          {profile?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {premiumTheme && (
                        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full p-1">
                          <Crown className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h1
                        className={`text-3xl font-bold ${
                          premiumTheme ? 'text-yellow-800' : 'text-gray-800'
                        }`}
                      >
                        {profile?.username || 'Loading...'}
                      </h1>
                      <p className="text-gray-600 flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{profile?.email}</span>
                      </p>
                      <p className="text-sm text-gray-500 flex items-center space-x-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Joined {profile && formatDate(profile.createdAt)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {premiumTheme ? (
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-2">
                          <Crown className="h-4 w-4" />
                          <span>Premium</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {profile?.plan.replace('_', ' ')}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold flex items-center space-x-2">
                          <Sparkles className="h-4 w-4" />
                          <span>Freemium</span>
                        </div>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-blue-600 p-0 h-auto"
                        >
                          Upgrade to Premium
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="space-y-6"
            >
              <TabsList
                className={`grid w-full grid-cols-4 ${
                  premiumTheme
                    ? 'bg-yellow-100 border-yellow-200'
                    : 'bg-gray-100'
                }`}
              >
                <TabsTrigger
                  value="overview"
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="connections"
                  className="flex items-center space-x-2"
                >
                  <LinkIcon className="h-4 w-4" />
                  <span>Connections</span>
                </TabsTrigger>
                <TabsTrigger
                  value="subscription"
                  className="flex items-center space-x-2"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Subscription</span>
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Profile Information */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                          <User className="h-5 w-5" />
                          <span>Profile Information</span>
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(!isEditing)}
                        >
                          {isEditing ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Edit3 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="username">Username</Label>
                            <Input
                              id="username"
                              value={editedProfile.username}
                              onChange={(e) =>
                                setEditedProfile((prev) => ({
                                  ...prev,
                                  username: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={editedProfile.email}
                              onChange={(e) =>
                                setEditedProfile((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleProfileSave}
                              disabled={profileLoading}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsEditing(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm text-gray-500">
                              Username
                            </Label>
                            <p className="font-medium">{profile?.username}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-gray-500">
                              Email
                            </Label>
                            <p className="font-medium">{profile?.email}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-gray-500">
                              Member Since
                            </Label>
                            <p className="font-medium">
                              {profile && formatDate(profile.createdAt)}
                            </p>
                          </div>
                          {profile?.lastLogin && (
                            <div>
                              <Label className="text-sm text-gray-500">
                                Last Login
                              </Label>
                              <p className="font-medium">
                                {formatDate(profile.lastLogin)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Shield className="h-5 w-5" />
                        <span>Account Stats</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={`p-4 rounded-lg ${
                            premiumTheme
                              ? 'bg-yellow-100 border border-yellow-200'
                              : 'bg-blue-100 border border-blue-200'
                          }`}
                        >
                          <div className="text-2xl font-bold">
                            {getConnectedPlatforms().length}
                          </div>
                          <div className="text-sm text-gray-600">
                            Connected Platforms
                          </div>
                        </div>
                        <div
                          className={`p-4 rounded-lg ${
                            premiumTheme
                              ? 'bg-yellow-100 border border-yellow-200'
                              : 'bg-green-100 border border-green-200'
                          }`}
                        >
                          <div
                            className={`text-2xl font-bold ${
                              premiumTheme
                                ? 'text-yellow-800'
                                : 'text-green-800'
                            }`}
                          >
                            {premiumTheme ? 'Premium' : 'Freemium'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Current Plan
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Platform Connections Tab */}
              <TabsContent value="connections">
                <PlatformConnections
                  connectedPlatforms={getConnectedPlatforms()}
                  loading={loading}
                  progress={progress}
                  isPremium={premiumTheme}
                  userPlan={subscription?.plan || 'FREEMIUM'}
                  onConnect={handleAuth}
                  onDisconnect={handleLogout}
                />
              </TabsContent>

              {/* Subscription Tab */}
              <TabsContent value="subscription">
                <SubscriptionDetails
                  subscription={subscription}
                  invoices={invoices}
                  isPremium={premiumTheme}
                  loading={profileLoading}
                  error={profileError}
                  onManageSubscription={manageSubscription}
                />
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>
                      Manage your account security and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Change Password</h4>
                        <p className="text-sm text-gray-500">
                          Update your account password for better security
                        </p>
                      </div>
                      <PasswordChangeModal
                        userId={profile?.id || ''}
                        userEmail={profile?.email || ''}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          Two-Factor Authentication
                        </h4>
                        <p className="text-sm text-gray-500">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Button variant="outline" disabled={true}>
                        Soon...
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Email Notifications</h4>
                        <p className="text-sm text-gray-500">
                          Choose what email notifications you receive
                        </p>
                      </div>
                      <Button variant="outline" disabled={true}>
                        Soon...
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function ProfilePageLoading() {
  return (
    <div className="min-h-screen mt-[13rem] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading profile...</p>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageLoading />}>
      <ProfilePageContent />
    </Suspense>
  );
}
