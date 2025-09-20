'use client';

import { getClientSession } from '@/services/session-client';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';

// Define session types based on our API response
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  isVerified?: boolean;
  plan?: string;
}

export interface PlatformConnection {
  account: {
    userId: string;
    username: string;
    email: string;
    businesses?: any[];
    adAccounts?: any[];
    advertisingAccountId?: string;
  };
  account_tokens: {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
  };
  account_codes?: {
    codeVerifier: string;
    codeChallenge: string;
    state: string;
  };
}

export interface Session {
  authenticated: boolean;
  user?: SessionUser;
  lastUpdated?: Date;
  status?: {
    facebook: boolean;
    instagram: boolean;
    twitter: boolean;
    amazon: boolean;
    tiktok: boolean;
  };
  connectedPlatforms?: {
    facebook?: PlatformConnection;
    instagram?: PlatformConnection;
    twitter?: PlatformConnection;
    amazon?: PlatformConnection;
    tiktok?: PlatformConnection;
  };
}

// Define the session context state type
interface SessionContextType {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  update: () => Promise<void>;
  isLoading: boolean;
}

// Create the context with default values
const SessionContext = createContext<SessionContextType>({
  session: null,
  status: 'loading',
  update: async () => {},
  isLoading: true,
});

// Create the session provider component
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<
    'loading' | 'authenticated' | 'unauthenticated'
  >('loading');
  const [isLoading, setIsLoading] = useState(true);

  // Add caching and debouncing to prevent excessive API calls
  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const sessionCacheRef = useRef<Session | null>(null);
  const CACHE_DURATION = 5000; // 5 seconds cache
  const MIN_FETCH_INTERVAL = 1000; // Minimum 1 second between fetches

  // Function to fetch session data from client-side cookie
  const fetchSession = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('Session fetch already in progress, skipping...');
      return;
    }

    // Check cache validity
    const now = Date.now();
    if (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL) {
      console.log('Session fetch rate limited, skipping...');
      return;
    }

    // Use cached session if it's still valid
    if (
      sessionCacheRef.current &&
      now - lastFetchTimeRef.current < CACHE_DURATION
    ) {
      console.log('Using cached session data');
      setSession(sessionCacheRef.current);
      return;
    }

    isFetchingRef.current = true;

    try {
      setIsLoading(true);

      // Try reading client cookie first (works only if cookie is not httpOnly)
      let sessionData: any = await getClientSession();

      // Fallback: call server endpoint if client cannot read cookie (httpOnly)
      if (!sessionData) {
        try {
          const res = await fetch('/api/auth/session', { cache: 'no-store' });
          if (res.ok) {
            sessionData = await res.json();
            // If API returns envelope { authenticated, userId, ... } reuse directly
            if (
              sessionData &&
              typeof sessionData === 'object' &&
              'authenticated' in sessionData
            ) {
              const api = sessionData;
              const enhancedSession: Session = {
                authenticated: !!api.authenticated,
                user: api.userId
                  ? {
                      id: api.userId,
                      email: api.user?.email || '',
                      name: api.user?.username || api.user?.email || '',
                      image: api.user?.image,
                      plan: api.plan,
                    }
                  : undefined,
                status: api.status || {
                  facebook: !!api.connectedPlatforms?.facebook,
                  instagram: !!api.connectedPlatforms?.instagram,
                  twitter: !!api.connectedPlatforms?.twitter,
                },
                connectedPlatforms: api.connectedPlatforms,
                lastUpdated: new Date(),
              };
              setSession(enhancedSession);
              sessionCacheRef.current = enhancedSession;
              setStatus(
                api.authenticated ? 'authenticated' : 'unauthenticated'
              );
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // ignore and continue to unauthenticated below
        }
      }

      if (sessionData && sessionData.userId) {
        // Try to map whatever we have from the JWT payload
        const maybeConnected = (sessionData as any)?.connected;
        const user = sessionData.user || ({} as any);
        const enhancedSession: Session = {
          authenticated: true,
          user: {
            id: sessionData.userId,
            email: user?.email || '',
            name: user?.username || user?.email || '',
            image: user?.image,
            plan: (sessionData as any)?.plan,
          },
          status: {
            facebook: !!maybeConnected?.facebook,
            instagram: !!maybeConnected?.instagram,
            twitter: !!maybeConnected?.twitter,
            amazon: !!maybeConnected?.amazon,
            tiktok: !!maybeConnected?.tiktok,
          },
          connectedPlatforms: maybeConnected
            ? {
                facebook: maybeConnected.facebook || undefined,
                instagram: maybeConnected.instagram || undefined,
                twitter: maybeConnected.twitter || undefined,
                amazon: maybeConnected.amazon || undefined,
                tiktok: maybeConnected.tiktok || undefined,
              }
            : undefined,
          lastUpdated: new Date(),
        };

        setSession(enhancedSession);
        sessionCacheRef.current = enhancedSession;
        setStatus('authenticated');
      } else {
        const unauthenticatedSession = {
          authenticated: false,
          lastUpdated: new Date(),
        };
        setSession(unauthenticatedSession);
        sessionCacheRef.current = unauthenticatedSession;
        setStatus('unauthenticated');
      }
    } catch (error) {
      console.error('Failed to fetch session from client:', error);
      const errorSession = {
        authenticated: false,
        lastUpdated: new Date(),
      };
      setSession(errorSession);
      sessionCacheRef.current = errorSession;
      setStatus('unauthenticated');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
      lastFetchTimeRef.current = Date.now();
    }
  }, []); // Remove session dependency to prevent infinite loop

  // Fetch session on initial load
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Listen for session-updated events
  useEffect(() => {
    const handleSessionUpdate = () => {
      fetchSession();
    };

    window.addEventListener('session-updated', handleSessionUpdate);

    return () => {
      window.removeEventListener('session-updated', handleSessionUpdate);
    };
  }, [fetchSession]);

  // Provide the session context to children
  return (
    <SessionContext.Provider
      value={{ session, status, update: fetchSession, isLoading }}
    >
      {children}
    </SessionContext.Provider>
  );
}

// Create a hook to use the session context
export function useSession() {
  const context = useContext(SessionContext);

  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  return {
    data: context.session,
    status: context.status,
    update: context.update,
    isLoading: context.isLoading,
  };
}
