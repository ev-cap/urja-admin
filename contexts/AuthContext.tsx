'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth, useSession } from '@clerk/nextjs';
import { setTokenGetter, registerApiBaseUrl } from '@/lib/auth/tokenManager';
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
  const { session } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Get JWT token from Clerk with the custom template
   */
  const getToken = async (): Promise<string | null> => {
    try {
      if (!session) {
        console.log('[AuthContext] No active session');
        return null;
      }

      // Get token with custom JWT template
      const token = await session.getToken({ template: clerkConfig.jwtTemplateName });
      
      if (!token) {
        console.warn('[AuthContext] Token is null from Clerk session');
        return null;
      }

      console.log('[AuthContext] Token retrieved successfully', {
        template: clerkConfig.jwtTemplateName,
        tokenLength: token.length,
        sessionId: session.id,
      });

      return token;
    } catch (error) {
      console.error('[AuthContext] Error getting token:', error);
      return null;
    }
  };

  /**
   * Sign out user
   */
  const signOut = async () => {
    try {
      await clerkSignOut();
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
    if (isSignedIn !== undefined) {
      setIsLoading(false);
    }
  }, [isSignedIn]);

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

