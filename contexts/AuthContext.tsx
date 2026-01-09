'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth, useSession, useUser } from '@clerk/nextjs';
import type { Session } from '@clerk/nextjs/server';
import { setTokenGetter, registerApiBaseUrl, clearTokenCache } from '@/lib/auth/tokenManager';
import { setupAxiosAuth } from '@/lib/auth/setupAxiosAuth';
import { clerkConfig } from '@/lib/clerk/config';
import { checkUserExistsAndGetUser } from '@/lib/services/userService';
import { getCachedPermissionsByRole, type RBACPermissions } from '@/lib/services/rbacService';
import type { User } from '@/types/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  sessionId: string | null;
  backendUserId: string | null;
  userData: User | null;
  permissions: RBACPermissions | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refetchUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isSignedIn, userId, signOut: clerkSignOut } = useAuth();
  const { session, isLoaded: isSessionLoaded } = useSession();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [backendUserId, setBackendUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<RBACPermissions | null>(null);
  
  // Use refs to store current session state for access in async functions
  const sessionRef = useRef<typeof session>(null);
  const isSessionLoadedRef = useRef<boolean>(false);
  const userDataFetchedRef = useRef<boolean>(false);
  const permissionsFetchedRef = useRef<boolean>(false);
  
  // Update refs whenever session changes
  useEffect(() => {
    sessionRef.current = session;
    isSessionLoadedRef.current = isSessionLoaded;
  }, [session, isSessionLoaded]);

  /**
   * Get JWT token from Clerk with the custom template
   * This function is called by the token manager when cache is expired
   */
  const getToken = async (): Promise<string | null> => {
    try {
      // Retry logic: wait for session to be available
      const maxRetries = 15;
      const retryDelay = 300; // 300ms between retries
      
      for (let i = 0; i < maxRetries; i++) {
        // Access current values from refs
        const currentSession = sessionRef.current;
        const currentIsLoaded = isSessionLoadedRef.current;
        
        if (currentIsLoaded && currentSession) {
          console.log('[AuthContext] Session is ready', {
            sessionId: currentSession.id,
            attemptNumber: i + 1,
          });
          
          // Get token with custom JWT template
          const token = await currentSession.getToken({ template: clerkConfig.jwtTemplateName });
          
          if (!token) {
            console.warn('[AuthContext] Token is null from Clerk session');
            return null;
          }

          console.log('[AuthContext] Fresh token retrieved from Clerk', {
            template: clerkConfig.jwtTemplateName,
            tokenLength: token.length,
            sessionId: currentSession.id,
          });

          return token;
        }
        
        if (i === 0 || i % 3 === 0) {
          console.log('[AuthContext] Waiting for session to load...', {
            attempt: i + 1,
            maxRetries,
            isSessionLoaded: currentIsLoaded,
            hasSession: !!currentSession,
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      // After all retries
      console.error('[AuthContext] No active session after retries', {
        isSignedIn,
        isSessionLoaded: isSessionLoadedRef.current,
        hasSession: !!sessionRef.current,
        retriesAttempted: maxRetries,
      });
      return null;
    } catch (error) {
      console.error('[AuthContext] Error getting token:', error);
      return null;
    }
  };

  /**
   * Fetch RBAC permissions based on user role
   */
  const fetchPermissions = async (userRole: string) => {
    // Prevent multiple simultaneous fetches
    if (permissionsFetchedRef.current) {
      return;
    }

    try {
      permissionsFetchedRef.current = true;
      
      console.log('[AuthContext] Fetching RBAC permissions for role:', userRole);
      
      const rbacPermissions = await getCachedPermissionsByRole(userRole);
      
      console.log('[AuthContext] RBAC permissions fetched successfully:', {
        role: rbacPermissions.role,
        methodCount: Object.keys(rbacPermissions.methods || {}).length,
      });
      
      setPermissions(rbacPermissions);
    } catch (error) {
      console.error('[AuthContext] Error fetching RBAC permissions:', error);
      // Don't throw - allow app to continue
    } finally {
      permissionsFetchedRef.current = false;
    }
  };

  /**
   * Fetch user data from backend after authentication
   */
  const fetchUserData = async () => {
    if (!isSignedIn || !user?.primaryPhoneNumber?.phoneNumber) {
      return;
    }

    // Prevent multiple simultaneous fetches
    if (userDataFetchedRef.current) {
      return;
    }

    try {
      userDataFetchedRef.current = true;
      
      const phone = user.primaryPhoneNumber.phoneNumber;
      console.log('[AuthContext] Fetching user data from backend for phone:', phone.substring(0, 5) + '***');
      
      // Get auth tokens
      const jwtToken = await getToken();
      const authTokens = {
        jwtToken,
        sessionId: session?.id || null,
      };

      // Call user-exists API which returns userId
      const result = await checkUserExistsAndGetUser(phone, authTokens);
      
      if (result.exists && result.user) {
        console.log('[AuthContext] User data fetched successfully:', {
          userId: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          role: result.user.role || result.user.userRole,
        });
        
        setBackendUserId(result.user.id);
        setUserData(result.user);

        // Fetch RBAC permissions based on user role
        // Prioritize userRole field over role field
        const userRole = result.user.userRole || result.user.role;
        if (userRole && !permissions) {
          await fetchPermissions(userRole);
        }
      } else {
        console.warn('[AuthContext] User exists but no user data returned');
      }
    } catch (error) {
      console.error('[AuthContext] Error fetching user data:', error);
      // Don't throw - allow app to continue
    } finally {
      userDataFetchedRef.current = false;
    }
  };

  /**
   * Refetch user data (can be called manually)
   */
  const refetchUserData = async () => {
    userDataFetchedRef.current = false;
    permissionsFetchedRef.current = false;
    setBackendUserId(null);
    setUserData(null);
    setPermissions(null);
    await fetchUserData();
  };

  /**
   * Sign out user and clear token cache
   */
  const signOut = async () => {
    try {
      // Clear token cache and user data before signing out
      clearTokenCache();
      setBackendUserId(null);
      setUserData(null);
      setPermissions(null);
      userDataFetchedRef.current = false;
      permissionsFetchedRef.current = false;
      await clerkSignOut();
      console.log('[AuthContext] User signed out successfully');
    } catch (error) {
      console.error('[AuthContext] Error signing out:', error);
      throw error;
    }
  };

  // Initialize authentication system
  useEffect(() => {
    // Register token getter
    setTokenGetter(getToken);
    
    // Register API base URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
    if (apiUrl) {
      registerApiBaseUrl(apiUrl);
    }
    
    // Setup Axios interceptors
    setupAxiosAuth();
    
    console.log('[AuthContext] Authentication system initialized', {
      apiUrl,
      jwtTemplate: clerkConfig.jwtTemplateName,
    });
  }, []);

  // Handle authentication state changes and fetch user data
  useEffect(() => {
    // Wait for both session and auth state to be loaded
    if (isSignedIn !== undefined && isSessionLoaded) {
      setIsLoading(false);
      
      console.log('[AuthContext] Auth state ready', {
        isSignedIn,
        hasSession: !!session,
        sessionId: session?.id,
        userId,
      });

      // Fetch user data from backend if authenticated
      if (isSignedIn && !backendUserId) {
        fetchUserData();
      }
    }
  }, [isSignedIn, isSessionLoaded, session?.id, userId, backendUserId]);

  const value: AuthContextType = {
    isAuthenticated: isSignedIn || false,
    isLoading,
    userId: userId || null,
    sessionId: session?.id || null,
    backendUserId,
    userData,
    permissions,
    getToken,
    signOut,
    refetchUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

