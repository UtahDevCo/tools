"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  signOut as firebaseSignOut,
  onAuthChange,
  serializeUser,
  signInWithGoogleIdToken,
  isFirebaseAuthenticated,
  type SerializableUser,
} from "@/lib/firebase/auth";
import {
  clearSessionCookies,
  getUserFromCookies,
  isTokenExpired,
} from "@/app/actions/session";
import {
  exportCookiesForMcp,
} from "@/app/actions/mcp-cookies";
import {
  setRefreshFunction,
  clearRefreshFunction,
  silentRefresh,
} from "@/lib/token-refresh";
import {
  trackLogoutSuccess,
  trackTokenRefreshFailed,
} from "@/lib/firebase/analytics";

type AuthState = {
  user: SerializableUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  signIn: () => void; // Changed to redirect-based
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  initialUser?: SerializableUser | null;
};

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<SerializableUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);
  
  // Use ref to track if refresh is in progress to prevent concurrent refreshes
  const isRefreshingRef = useRef(false);

  const isAuthenticated = !!user;

  // Check for existing session on mount and ensure Firebase Auth is signed in
  useEffect(() => {
    async function checkSession() {
      try {
        // First, try to sign into Firebase using the ID token cookie
        // This is needed because server-side OAuth doesn't sign into Firebase Auth
        const idToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("gtd_id_token="))
          ?.split("=")[1];
        
        if (idToken && !isFirebaseAuthenticated()) {
          try {
            console.log("[Auth] Signing into Firebase with ID token...");
            const firebaseUser = await signInWithGoogleIdToken(decodeURIComponent(idToken));
            console.log("[Auth] Firebase Auth signed in:", firebaseUser.email, "UID:", firebaseUser.uid);
            
            // Update the user data cookie with the correct Firebase UID
            const userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            };
            document.cookie = `gtd_user_data=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${60 * 60 * 24 * 7}`;
            
            setUser(serializeUser(firebaseUser));
            setIsLoading(false);
            return;
          } catch (error) {
            console.error("[Auth] Failed to sign into Firebase:", error);
            // Fall through to check cookies
          }
        }
        
        // If no ID token or Firebase sign-in failed, try to get user from cookies
        const cookieUser = await getUserFromCookies();
        if (cookieUser) {
          setUser(cookieUser);
        }
      } catch (error) {
        console.error("Failed to check session:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!initialUser) {
      checkSession();
    }
  }, [initialUser]);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        setUser(serializeUser(firebaseUser));
      }
      // Don't clear user on null - we manage that via cookies
    });

    return unsubscribe;
  }, []);

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiry = async () => {
      const expired = await isTokenExpired();
      if (expired) {
        // Token expired - attempt silent refresh
        console.log("Token expired, attempting silent refresh");
        try {
          const result = await silentRefresh();
          if (result) {
            console.log("Silent refresh succeeded");
          } else {
            console.log("Silent refresh failed, user may need to re-authenticate");
          }
        } catch (error) {
          console.error("Silent refresh error:", error);
        }
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);
    checkTokenExpiry(); // Check immediately

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Sign in via server-side OAuth redirect
  const signIn = useCallback(() => {
    // Redirect to OAuth endpoint
    window.location.href = "/api/auth/google?mode=primary";
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      // Clear the refresh function before signing out
      clearRefreshFunction();
      await firebaseSignOut();
      await clearSessionCookies();
      setUser(null);
      trackLogoutSuccess();
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    // Prevent concurrent refresh attempts
    if (isRefreshingRef.current) {
      console.log('Refresh already in progress, skipping duplicate request');
      return;
    }
    isRefreshingRef.current = true;
    try {
      // Attempt silent refresh
      const result = await silentRefresh();
      if (result) {
        console.log("Session refreshed silently");
        // Re-fetch user from cookies to update state
        const cookieUser = await getUserFromCookies();
        if (cookieUser) {
          setUser(cookieUser);
        }
      } else {
        // Silent refresh failed - redirect to OAuth
        console.log("Silent refresh failed, redirecting to OAuth");
        window.location.href = "/api/auth/google?mode=primary";
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      trackTokenRefreshFailed(errorMsg);
      throw error;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // Register the refresh function with the token coordinator
  // This allows automatic token refresh from any part of the app
  useEffect(() => {
    if (isAuthenticated) {
      setRefreshFunction(async () => {
        // Prevent concurrent refresh attempts
        if (isRefreshingRef.current) {
          console.log('Refresh already in progress via coordinator, skipping');
          return;
        }
        isRefreshingRef.current = true;
        try {
          // Attempt silent refresh first
          const result = await silentRefresh();
          if (result) {
            console.log("Coordinated refresh succeeded silently");
            // Re-fetch user from cookies to update state
            const cookieUser = await getUserFromCookies();
            if (cookieUser) {
              setUser(cookieUser);
            }

            // Auto-export cookies for MCP server (localhost only)
            exportCookiesForMcp().catch(() => {
              // Silently ignore
            });
          } else {
            // Silent refresh failed - redirect to OAuth
            console.log("Silent refresh failed, redirecting to OAuth");
            window.location.href = "/api/auth/google?mode=primary";
          }
        } catch (error) {
          console.error('Coordinated token refresh failed:', error);
          throw error;
        } finally {
          isRefreshingRef.current = false;
        }
      });
    } else {
      clearRefreshFunction();
    }

    return () => {
      clearRefreshFunction();
    };
  }, [isAuthenticated]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
