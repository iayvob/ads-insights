import { useSession } from "./session-context"

export function useAuth() {
  const { data: session, status, isLoading } = useSession()
  
  return {
    user: session?.user || null,
    isLoading,
    isAuthenticated: status === "authenticated",
    session
  }
}
