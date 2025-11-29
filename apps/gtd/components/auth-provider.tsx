"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  signInWithGoogle as firebaseSignIn,
  signOut as firebaseSignOut,
  onAuthChange,
  serializeUser,
  type SerializableUser,
} from "@/lib/firebase/auth";
import {
  setSessionCookies,
  clearSessionCookies,
  getUserFromCookies,
  isTokenExpired,
} from "@/app/actions/session";

type AuthState = {
  user: SerializableUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  signIn: () => Promise<void>;
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

  const isAuthenticated = !!user;

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
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
        // Token expired - user needs to re-authenticate
        // Firebase popup will handle silent re-auth if session is still valid
        console.log("Token expired, user may need to re-authenticate");
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);
    checkTokenExpiry(); // Check immediately

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await firebaseSignIn();
      const serializedUser = serializeUser(result.user);

      // Store tokens in cookies
      await setSessionCookies({
        accessToken: result.tokens.accessToken,
        user: serializedUser,
        expiresAt: result.tokens.expiresAt,
      });

      setUser(serializedUser);
    } catch (error) {
      console.error("Sign in failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut();
      await clearSessionCookies();
      setUser(null);
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    // Re-authenticate to get fresh tokens
    await signIn();
  }, [signIn]);

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
