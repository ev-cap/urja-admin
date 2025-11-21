import { useAuthContext } from '@/contexts/AuthContext';
import { useUser, useClerk } from '@clerk/nextjs';

/**
 * Combined auth hook that provides both Clerk and custom auth functionality
 */
export const useAuth = () => {
  const authContext = useAuthContext();
  const { user, isLoaded: isUserLoaded } = useUser();
  const clerk = useClerk();

  return {
    // Auth state
    isAuthenticated: authContext.isAuthenticated,
    isLoading: authContext.isLoading || !isUserLoaded,
    
    // User info
    userId: authContext.userId,
    sessionId: authContext.sessionId,
    user,
    
    // Phone number from Clerk
    phone: user?.primaryPhoneNumber?.phoneNumber || null,
    
    // Token management
    getToken: authContext.getToken,
    
    // Sign out
    signOut: authContext.signOut,
    
    // Clerk instance for advanced usage
    clerk,
  };
};

/**
 * Hook to get authentication tokens for API calls
 */
export const useAuthTokens = () => {
  const { getToken, sessionId } = useAuthContext();

  const getAuthTokens = async () => {
    const jwtToken = await getToken();
    return {
      jwtToken,
      sessionId,
    };
  };

  return { getAuthTokens };
};

