"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/session-context";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  requirePremium?: boolean;
}

/**
 * AuthGuard component that protects child components with authentication
 * 
 * @param children - The components to render when authenticated
 * @param fallback - Optional fallback component to render while loading
 * @param redirectTo - Optional path to redirect to when not authenticated (defaults to "/")
 * @param requirePremium - Whether premium plan is required
 */
export function AuthGuard({ 
  children, 
  fallback, 
  redirectTo = "/",
  requirePremium = false 
}: AuthGuardProps) {
  const router = useRouter();
  const { data: session, status, isLoading } = useSession();

  // Show loading state
  if (status === "loading" || isLoading) {
    return fallback || (
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
    router.push(redirectTo);
    return null;
  }

  // Check premium requirement
  if (requirePremium) {
    const userPlan = session.user?.plan;
    const isPremium = userPlan === "PREMIUM_MONTHLY" || userPlan === "PREMIUM_YEARLY";
    
    if (!isPremium) {
      router.push("/subscription");
      return null;
    }
  }

  // Render children if authenticated (and premium if required)
  return <>{children}</>;
}

/**
 * Hook version of AuthGuard for programmatic authentication checking
 */
export function useAuthGuard(requirePremium = false) {
  const router = useRouter();
  const { data: session, status, isLoading } = useSession();

  const isAuthenticated = status === "authenticated" && session?.authenticated;
  const isLoading_ = status === "loading" || isLoading;
  
  let isPremium = false;
  if (isAuthenticated && requirePremium) {
    const userPlan = session.user?.plan;
    isPremium = userPlan === "PREMIUM_MONTHLY" || userPlan === "PREMIUM_YEARLY";
  }

  const redirectToLogin = () => router.push("/");
  const redirectToSubscription = () => router.push("/subscription");

  return {
    isAuthenticated,
    isPremium,
    isLoading: isLoading_,
    session,
    redirectToLogin,
    redirectToSubscription,
  };
}
