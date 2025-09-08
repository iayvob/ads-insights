"use client";

import { ReactNode, useEffect } from "react";
import { useSession } from "@/hooks/session-context";
import { useRouter, usePathname } from "next/navigation";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider component that handles global authentication logic
 * This should wrap the entire app to provide authentication context
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Define route categories
  const publicRoutes = [
    '/',
    '/privacy-policy',
    '/terms-of-service',
    '/refund-policy',
    '/reset-password',
    '/forgot-password'
  ];

  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/subscription'
  ];

  useEffect(() => {
    // Don't do anything while still loading
    if (status === "loading" || isLoading) return;

    const isAuthenticated = status === "authenticated" && session?.authenticated;
    const isPublicRoute = publicRoutes.includes(pathname);
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // Handle authenticated users
    if (isAuthenticated) {
      // Redirect authenticated users away from the main landing page
      if (pathname === '/' || pathname.startsWith('/?')) {
        const userPlan = session.user?.plan;
        
        if (userPlan === 'FREEMIUM') {
          router.push('/subscription');
        } else if (userPlan === 'PREMIUM_MONTHLY' || userPlan === 'PREMIUM_YEARLY') {
          router.push('/profile');
        } else {
          router.push('/dashboard');
        }
        return;
      }
    } else {
      // Handle unauthenticated users
      if (isProtectedRoute) {
        router.push('/');
        return;
      }
    }
  }, [session, status, isLoading, pathname, router]);

  return <>{children}</>;
}

/**
 * Higher-order component for protecting specific components with authentication
 */
export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    requirePremium?: boolean;
    redirectTo?: string;
    fallback?: ReactNode;
  } = {}
) {
  const AuthenticatedComponent = (props: T) => {
    const { data: session, status, isLoading } = useSession();
    const router = useRouter();

    const { requirePremium = false, redirectTo = "/", fallback } = options;

    useEffect(() => {
      if (status === "loading" || isLoading) return;

      const isAuthenticated = status === "authenticated" && session?.authenticated;

      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      if (requirePremium) {
        const userPlan = session.user?.plan;
        const isPremium = userPlan === "PREMIUM_MONTHLY" || userPlan === "PREMIUM_YEARLY";
        
        if (!isPremium) {
          router.push("/subscription");
          return;
        }
      }
    }, [session, status, isLoading, router]);

    // Show loading state
    if (status === "loading" || isLoading) {
      return fallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    // Don't render if not authenticated (will redirect via useEffect)
    const isAuthenticated = status === "authenticated" && session?.authenticated;
    if (!isAuthenticated) {
      return null;
    }

    // Check premium requirement
    if (requirePremium) {
      const userPlan = session.user?.plan;
      const isPremium = userPlan === "PREMIUM_MONTHLY" || userPlan === "PREMIUM_YEARLY";
      
      if (!isPremium) {
        return null; // Will redirect via useEffect
      }
    }

    return <Component {...props} />;
  };

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return AuthenticatedComponent;
}

/**
 * Hook for accessing authentication status and user data
 */
export function useAuth() {
  const { data: session, status, isLoading, update } = useSession();

  const isAuthenticated = status === "authenticated" && session?.authenticated;
  const user = session?.user;
  const userPlan = user?.plan;
  const isPremium = userPlan === "PREMIUM_MONTHLY" || userPlan === "PREMIUM_YEARLY";

  return {
    // Authentication state
    isAuthenticated,
    isLoading: status === "loading" || isLoading,
    status,
    
    // User data
    user,
    userPlan,
    isPremium,
    session,
    
    // Session management
    refreshSession: update,
    
    // Connected platforms
    connectedPlatforms: session?.connectedPlatforms,
    platformStatus: session?.status,
  };
}
