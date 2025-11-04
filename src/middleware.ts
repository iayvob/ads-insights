import { NextRequest, NextResponse } from "next/server";
import { ServerSessionService } from "./services/session-server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define route categories
  const publicRoutes = [
    '/',
    '/privacy-policy',
    '/terms-of-service',
    '/refund-policy',
    '/reset-password',
    '/forgot-password'
  ];

  const authRoutes = [
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/auth/logout',
    '/api/auth/session',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify-email',
    '/api/auth/facebook',
    '/api/auth/instagram',
    '/api/auth/twitter',
    '/api/auth/tiktok',
    '/api/auth/amazon'
  ];

  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/subscription',
    '/posting'
  ];

  const protectedApiRoutes = [
    '/api/dashboard',
    '/api/user',
    '/api/admin',
    '/api/posting'
  ];

  // Always allow API auth routes (they handle their own authentication)
  if (authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow OAuth callback routes
  if (pathname.includes('/callback') || pathname.includes('/oauth')) {
    return NextResponse.next();
  }

  // Get session status
  let isAuthenticated = false;
  let session = null;
  try {
    session = await ServerSessionService.getSession(request);
    isAuthenticated = !!(session && session.userId);
  } catch (error) {
    isAuthenticated = false;
  }

  // Handle protected API routes with subscription validation
  if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Additional validation for premium features
    const userPlan = session?.plan || 'FREEMIUM';

    // Check platform-specific API access
    if (pathname.includes('/api/dashboard/')) {
      const platform = pathname.split('/api/dashboard/')[1]?.split('/')[0];

      if (platform && ['facebook', 'twitter', 'tiktok', 'amazon'].includes(platform)) {
        if (userPlan === 'FREEMIUM') {
          return NextResponse.json(
            {
              error: "Premium subscription required",
              platform,
              userPlan,
              upgradeRequired: true
            },
            { status: 403 }
          );
        }
      }
    }

    // Check posting API access for restricted platforms
    if (pathname.includes('/api/posting/platforms/')) {
      const platform = pathname.split('/api/posting/platforms/')[1]?.split('/')[0];

      if (platform && ['facebook', 'twitter'].includes(platform)) {
        if (userPlan === 'FREEMIUM') {
          return NextResponse.json(
            {
              error: "Premium subscription required for posting to this platform",
              platform,
              userPlan,
              upgradeRequired: true
            },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.next();
  }

  // Handle page routes based on authentication status
  if (!isAuthenticated) {
    // Allow access to public routes
    if (publicRoutes.includes(pathname) || pathname === '/') {
      return NextResponse.next();
    }

    // Block access to protected routes - redirect to home
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Allow access to other routes (like static files, etc.)
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
