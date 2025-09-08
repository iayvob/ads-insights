"use client";

import { useSession } from "@/hooks/session-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  User, 
  Settings, 
  LogOut, 
  Crown,
  CreditCard,
  BarChart3,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AuthStatusProps {
  showFullProfile?: boolean;
  className?: string;
}

/**
 * AuthStatus component that displays the current authentication status
 * and provides user menu functionality
 */
export function AuthStatus({ showFullProfile = true, className }: AuthStatusProps) {
  const { data: session, status, isLoading } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        // Trigger session refresh
        window.dispatchEvent(new Event('session-updated'));
        router.push("/");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // Unauthenticated state
  if (status === "unauthenticated" || !session?.authenticated) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Sign In</Link>
        </Button>
      </div>
    );
  }

  // Authenticated state
  const user = session.user;
  const userPlan = user?.plan || "FREEMIUM";
  const isPremium = userPlan === "PREMIUM_MONTHLY" || userPlan === "PREMIUM_YEARLY";

  const planColor = isPremium ? "bg-gradient-to-r from-yellow-400 to-orange-500" : "bg-gray-500";
  const planText = isPremium ? "Premium" : "Freemium";

  if (!showFullProfile) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.image} alt={user?.name} />
          <AvatarFallback>
            {user?.name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Badge className={planColor} variant="secondary">
          {isPremium && <Crown className="h-3 w-3 mr-1" />}
          {planText}
        </Badge>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`flex items-center gap-2 h-auto p-2 ${className}`}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.image} alt={user?.name} />
            <AvatarFallback>
              {user?.name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium">{user?.name || user?.email}</span>
            <Badge className={`${planColor} text-xs w-fit`} variant="secondary">
              {isPremium && <Crown className="h-3 w-3 mr-1" />}
              {planText}
            </Badge>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/subscription" className="cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            Subscription
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple authentication indicator component
 */
export function AuthIndicator({ className }: { className?: string }) {
  const { data: session, status, isLoading } = useSession();

  if (status === "loading" || isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
        <span className="text-xs text-muted-foreground">Checking...</span>
      </div>
    );
  }

  const isAuthenticated = status === "authenticated" && session?.authenticated;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`h-2 w-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-xs text-muted-foreground">
        {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </span>
    </div>
  );
}
