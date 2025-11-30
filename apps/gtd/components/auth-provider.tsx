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
import {
  exportCookiesForMcp,
  saveFirebaseAuthData,
} from "@/app/actions/mcp-cookies";
import {
  setRefreshFunction,
  clearRefreshFunction,
} from "@/lib/token-refresh";
import {
  setAnalyticsUserId,
  trackLoginSuccess,
  trackLogoutSuccess,
  trackTokenRefreshFailed,
} from "@/lib/firebase/analytics";

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

/**
 * Export Firebase Auth IndexedDB data for MCP server use.
 * This runs client-side and sends the data to a server action to save.
 */
async function exportFirebaseAuthForMcp(): Promise<void> {
  try {
    // Only run in development
    if (process.env.NODE_ENV !== "development") return;

    const authData = await new Promise<Array<{ fpiKey: string; value: unknown }>>(
      (resolve, reject) => {
        const request = indexedDB.open("firebaseLocalStorageDb", 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Check if the object store exists
          if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
            resolve([]);
            return;
          }
          
          const transaction = db.transaction(["firebaseLocalStorage"], "readonly");
          const store = transaction.objectStore("firebaseLocalStorage");
          const getAllRequest = store.getAll();
          const getAllKeysRequest = store.getAllKeys();

          const results: Array<{ fpiKey: string; value: unknown }> = [];

          getAllRequest.onsuccess = () => {
            getAllKeysRequest.onsuccess = () => {
              const values = getAllRequest.result;
              const keys = getAllKeysRequest.result;
              
              for (let i = 0; i < keys.length; i++) {
                results.push({
                  fpiKey: String(keys[i]),
                  value: values[i],
                });
              }
              resolve(results);
            };
          };

          getAllRequest.onerror = () => reject(getAllRequest.error);
        };
      }
    );

    if (authData.length > 0) {
      const result = await saveFirebaseAuthData(authData);
      if (result.success) {
        console.log("[MCP] Firebase Auth data exported for MCP server");
      }
    }
  } catch (error) {
    // Silently ignore - this is just for dev convenience
    console.debug("[MCP] Firebase Auth export failed:", error);
  }
}

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

      // Auto-export cookies for MCP server (localhost only)
      exportCookiesForMcp().then((result) => {
        if (result.success) {
          console.log("[MCP] Cookies auto-exported for MCP server");
        }
      }).catch(() => {
        // Silently ignore - this is just for dev convenience
      });

      // Also export Firebase Auth IndexedDB data for MCP server
      exportFirebaseAuthForMcp();

      setUser(serializedUser);
      setAnalyticsUserId(serializedUser.uid);
      trackLoginSuccess();
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
      // Re-authenticate to get fresh tokens
      await signIn();
    } catch (error) {
      console.error('Session refresh failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      trackTokenRefreshFailed(errorMsg);
      throw error;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [signIn]);

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
          const result = await firebaseSignIn();
          const serializedUser = serializeUser(result.user);

          await setSessionCookies({
            accessToken: result.tokens.accessToken,
            user: serializedUser,
            expiresAt: result.tokens.expiresAt,
          });

          // Auto-export cookies for MCP server (localhost only)
          exportCookiesForMcp().catch(() => {
            // Silently ignore
          });

          // Also export Firebase Auth IndexedDB data for MCP server
          exportFirebaseAuthForMcp();

          setUser(serializedUser);
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
