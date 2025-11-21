'use client';

import { useAuth } from './useAuth';

export interface UserData {
  id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userRole?: string;
  userStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Hook to access user data from the backend
 * Data is automatically fetched by AuthContext after authentication
 */
export const useUserData = () => {
  const { isAuthenticated, userData, isLoading, refetchUserData } = useAuth();

  // Determine loading state
  const loading = isLoading || (isAuthenticated && !userData);

  // Determine error state
  const error = !isLoading && isAuthenticated && !userData 
    ? 'Failed to load user data' 
    : null;

  return {
    userData: userData as UserData | null,
    loading,
    error,
    refetch: refetchUserData,
  };
};

