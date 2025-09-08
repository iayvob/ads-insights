"use client";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "./session-context";

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  image?: string;
  plan: "FREEMIUM" | "PREMIUM_MONTHLY" | "PREMIUM_YEARLY";
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  authProviders: AuthProvider[];
}

export interface AuthProvider {
  provider: "facebook" | "instagram" | "twitter" | "amazon";
  username?: string;
  email?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface Subscription {
  id: string;
  plan: "FREEMIUM" | "PREMIUM_MONTHLY" | "PREMIUM_YEARLY";
  status: "ACTIVE" | "CANCELED" | "INCOMPLETE" | "PAST_DUE" | "TRIALING";
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  createdAt: string;
}

export interface ProfileData {
  profile: UserProfile | null;
  subscription: Subscription | null;
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
}

export function useProfile() {
  const [data, setData] = useState<ProfileData>({
    profile: null,
    subscription: null,
    invoices: [],
    loading: true,
    error: null,
  });
  const { toast } = useToast();
  const { data: session, status, update } = useSession();
  
  const [userId, setUserId] = useState<string>("");
  const lastFetchedUserIdRef = useRef<string>("");
  const isInitializedRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const lastProfileFetchRef = useRef<number>(0);
  const PROFILE_CACHE_DURATION = 3000; // 3 seconds cache for profile

  const fetchProfile = async () => {
    try {
      if (!session?.user?.id) {
        console.warn("Cannot fetch profile - no userId in session");
        return;
      }

      // Prevent concurrent fetches
      if (isFetchingRef.current) {
        console.log("Profile fetch already in progress, skipping...");
        return;
      }

      // Check cache validity - only fetch if enough time has passed
      const now = Date.now();
      if (now - lastProfileFetchRef.current < PROFILE_CACHE_DURATION) {
        console.log("Profile fetch rate limited, using existing data");
        return;
      }

      isFetchingRef.current = true;
      lastProfileFetchRef.current = now;

      setData(prev => ({ ...prev, loading: true, error: null }));

      // Use the GET endpoint to fetch profile from the session
      const response = await fetch(`/api/user/profile?userId=${session.user.id}&t=${Date.now()}`, {
        method: 'GET',
        credentials: 'include', // This ensures cookies are sent
        cache: 'no-store',
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });

      // Handle authentication issues
      if (response.status === 401) {
        // User is not authenticated, redirect to login
        window.location.href = "/";
        return;
      }

      // Handle other HTTP errors
      if (response.status < 200 || response.status >= 300) {
        throw new Error("Failed to fetch profile");
      }

      const profileData = await response.json();

      // Check that the data has the expected structure from createSuccessResponse wrapper
      if (!profileData.data?.user) {
        console.error("Invalid profile data structure:", profileData);
        throw new Error("Invalid profile data structure");
      }

      // Update profile data in state
      setData(prev => ({
        ...prev,
        profile: profileData.data.user,
        loading: false,
        error: null, // Clear any previous errors
      }));

      console.log("Profile fetched successfully:", {
        userId: profileData.data.user.id,
        connectedPlatforms: profileData.data.user.authProviders?.length || 0,
        platformStatus: profileData.platformStatus
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);

      // Extract more helpful error message if available
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to load profile";

      setData(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));

      // Show user-friendly error message
      toast({
        title: "Profile Error",
        description: typeof errorMessage === 'string'
          ? errorMessage
          : "Unable to load your profile. Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      isFetchingRef.current = false;
    }
  };

  const fetchSubscription = async () => {
    try {
      if (!session?.user?.id) {
        return;
      }

      setData(prev => ({ ...prev, loading: true }));

      const response = await fetch('/api/user/subscription', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });

      if (response.status === 401) {
        // Handle authentication error
        toast({
          title: "Authentication Error",
          description: "Please log in again to view subscription data",
          variant: "destructive",
        });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const subscriptionData = await response.json();

      if (!subscriptionData.success) {
        throw new Error(subscriptionData.message || "Failed to fetch subscription data");
      }

      setData(prev => ({
        ...prev,
        subscription: subscriptionData.data.subscription,
        invoices: subscriptionData.data.invoices || [],
        loading: false,
      }));
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      
      const errorMessage = error.message || "Failed to load subscription data";
      
      setData(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));

      toast({
        title: "Subscription Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      if (!userId) {
        console.warn("Cannot update profile - no userId available");
        setData(prev => ({ ...prev, loading: false }));

        toast({
          title: "Update Failed",
          description: "You must be logged in to update your profile.",
          variant: "destructive",
        });

        return false;
      }

      // Send update to API endpoint
      const response = await fetch("/api/user/profile/update", {
        method: "PUT",
        credentials: "include",
        cache: 'no-store',
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: userId,
          updates: updates
        })
      });

      const data = await response.json();

      if (response.status === 401) {
        // User is not authenticated, redirect to login
        window.location.href = "/";
        return false;
      }

      // Check for success
      if (!data?.success) {
        throw new Error(data?.message || "Failed to update profile");
      }

      // After successful update, refresh the profile data
      await fetchProfile();

      // Show success message
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });

      return true;
    } catch (error: any) {
      console.error("Error updating profile:", error);

      // Extract more helpful error message if available
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to update profile";

      setData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      toast({
        title: "Update Failed",
        description: typeof errorMessage === 'string'
          ? errorMessage
          : "Failed to update profile. Please try again.",
        variant: "destructive",
      });

      return false;
    }
  };

  const isPremium = () => {
    return data.profile?.plan === "PREMIUM_MONTHLY" || data.profile?.plan === "PREMIUM_YEARLY";
  };

  const getConnectedPlatforms = () => {
    return data.profile?.authProviders || [];
  };

  const isConnected = (platform: string) => {
    return getConnectedPlatforms().some(provider => provider.provider === platform);
  };

  // Listen for session changes
  useEffect(() => {
    // Set userId from session for use in operations that need it
    if (session?.user?.id) {
      setUserId(session.user.id);

      // Only fetch profile data if this is a new user or we haven't fetched for this user yet
      if (lastFetchedUserIdRef.current !== session.user.id || !isInitializedRef.current) {
        lastFetchedUserIdRef.current = session.user.id;
        isInitializedRef.current = true;
        fetchProfile();
      }
    } else if (status === "unauthenticated") {
      // Clear profile data when user is unauthenticated
      setData({
        profile: null,
        subscription: null,
        invoices: [],
        loading: false,
        error: null,
      });
      setUserId("");
      lastFetchedUserIdRef.current = "";
      isInitializedRef.current = false;
    }
  }, [session?.user?.id, status]); // Remove data.profile dependency to prevent infinite loop

  // Fetch subscription data only when profile is first loaded or when explicitly requested
  const [hasSubscriptionData, setHasSubscriptionData] = useState(false);
  
  useEffect(() => {
    if (data.profile && !hasSubscriptionData) {
      fetchSubscription();
      setHasSubscriptionData(true);
    }
    
    // Reset subscription data flag when profile changes
    if (!data.profile) {
      setHasSubscriptionData(false);
    }
  }, [data.profile?.id, hasSubscriptionData]);

  /**
   * Synchronize the session with profile data
   * This is useful after authentication operations or disconnecting platforms
   */
  const synchronizeWithSession = async () => {
    try {
      console.log("Synchronizing session and profile data...");
      
      // First update the session from context
      if (typeof update === 'function') {
        await update();
        console.log("Session updated from server");
      }

      // Wait a moment for session to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then refresh profile data if we have a session
      if (session?.user?.id) {
        await fetchProfile();
        console.log("Profile data refreshed");
      } else {
        // Clear profile data if no session
        setData({
          profile: null,
          subscription: null,
          invoices: [],
          loading: false,
          error: null,
        });
        console.log("Profile data cleared - no session");
      }

      return true;
    } catch (error) {
      console.error("Failed to synchronize with session:", error);

      // Show user-friendly error message
      toast({
        title: "Synchronization Error",
        description: "Unable to synchronize your profile data. Please try refreshing the page.",
        variant: "destructive",
      });

      return false;
    }
  };

  /**
   * Manage subscription actions (cancel, reactivate)
   */
  const manageSubscription = async (action: 'cancel' | 'reactivate', subscriptionId: string) => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/user/subscription', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        body: JSON.stringify({
          action,
          subscriptionId
        })
      });

      if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to manage subscription",
          variant: "destructive",
        });
        return false;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || `HTTP ${response.status}`);
      }

      // Refresh subscription data
      await fetchSubscription();

      toast({
        title: "Subscription Updated",
        description: result.message || `Subscription ${action} successful`,
        variant: "default",
      });

      return true;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to update subscription";
      
      setData(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));

      toast({
        title: "Subscription Error",
        description: errorMessage,
        variant: "destructive",
      });

      return false;
    }
  };

  /**
   * Refresh profile data manually
   */
  const refreshProfile = async () => {
    await fetchProfile();
    setHasSubscriptionData(false); // Reset so subscription gets refetched
  };

  /**
   * Refresh subscription data manually
   */
  const refreshSubscription = async () => {
    await fetchSubscription();
  };

  return {
    ...data,
    updateProfile,
    isPremium,
    getConnectedPlatforms,
    isConnected,
    refresh: refreshProfile,
    refreshSubscription,
    synchronizeWithSession,
    manageSubscription,
  };
}
