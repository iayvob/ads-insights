// Authentication components and utilities
export { AuthGuard, useAuthGuard } from './auth-guard';
export { AuthStatus, AuthIndicator } from './auth-status';
export { AuthProvider, withAuth, useAuth } from './auth-provider';

// Re-export session context for convenience
export { useSession, SessionProvider } from '@/hooks/session-context';

// Re-export session services for convenience
export { ClientSessionService } from '@/services/session-client';
export {
	getClientSession,
	setClientSession,
	clearClientSession,
	isAuthenticated,
	getUserProfile,
	isPremiumUser,
	refreshSession,
	getSessionExpiry,
	isSessionExpired,
	getConnectedPlatforms,
	isPlatformConnected,
	decrypt,
} from '@/services/session-client';
