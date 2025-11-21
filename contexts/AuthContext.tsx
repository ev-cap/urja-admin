'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth, useSession } from '@clerk/nextjs';
import type { Session } from '@clerk/nextjs/server';
import { setTokenGetter, registerApiBaseUrl, clearTokenCache } from '@/lib/auth/tokenManager';
import { setupAxiosAuth } from '@/lib/auth/setupAxiosAuth';
import { clerkConfig } from '@/lib/clerk/config';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  sessionId: string | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isSignedIn, userId, signOut: clerkSignOut } = useAuth();
  const { session, isLoaded: isSessionLoaded } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  
  // Use refs to store current session state for access in async functions
  const sessionRef = useRef<typeof session>(null);
  const isSessionLoadedRef = useRef<boolean>(false);
  
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
   * Sign out user and clear token cache
   */
  const signOut = async () => {
    try {
      // Clear token cache before signing out
      clearTokenCache();
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

  // Handle authentication state changes
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
    }
  }, [isSignedIn, isSessionLoaded, session?.id, userId]);

  const value: AuthContextType = {
    isAuthenticated: isSignedIn || false,
    isLoading,
    userId: userId || null,
    sessionId: session?.id || null,
    getToken,
    signOut,
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

