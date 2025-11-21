import axios from 'axios';
import { getManagedToken } from '@/lib/auth/tokenManager';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface User {
  id: string;
  phone?: string;
  email?: string;
  name?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

interface AuthTokens {
  jwtToken?: string | null;
  sessionId?: string | null;
}

/**
 * Build authentication headers from tokens
 */
const buildAuthHeaders = (authTokens?: AuthTokens) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authTokens?.jwtToken) {
    headers.Authorization = `Bearer ${authTokens.jwtToken}`;
    headers['x-jwt-token'] = authTokens.jwtToken;
  }

  if (authTokens?.sessionId) {
    headers['x-session-id'] = authTokens.sessionId;
  }

  return headers;
};

/**
 * Get user by ID
 * Automatically retrieves and attaches JWT token
 */
export const getUserById = async (userId: string): Promise<User> => {
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    if (!userId) {
      throw new Error('USER_ID is required');
    }

    // Get JWT token and build auth headers
    const token = await getManagedToken();
    const authHeaders = buildAuthHeaders(token ? { jwtToken: token } : undefined);

    console.log('[UserService] GET /users - Fetching user:', {
      userId,
      hasToken: !!token,
      url: `${API_URL}/users/${userId}`,
    });

    const response = await axios.get(`${API_URL}/users/${userId}`, {
      headers: authHeaders,
    });

    console.log('[UserService] GET /users - Success:', {
      userId: response.data?.id,
      hasEmail: !!response.data?.email,
    });

    return response.data;
  } catch (error) {
    console.error('[UserService] Error fetching user:', error);
    if (axios.isAxiosError(error)) {
      console.error('[UserService] Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    }
    throw error;
  }
};

/**
 * Get user by ID with custom auth tokens
 */
export const getUserByIdCustom = async (
  userId: string,
  authTokens?: AuthTokens
): Promise<User> => {
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    console.log('[UserService] GET /users (custom auth) - Fetching user:', {
      userId,
      hasJwtToken: !!authTokens?.jwtToken,
      hasSessionId: !!authTokens?.sessionId,
    });

    const response = await axios.get(`${API_URL}/users/${userId}`, {
      headers: buildAuthHeaders(authTokens),
    });

    return response.data;
  } catch (error) {
    console.error('[UserService] Error fetching user with custom auth:', error);
    throw error;
  }
};

/**
 * Check if user exists by phone number
 */
export const checkUserExistsByPhone = async (
  phone: string,
  authTokens?: AuthTokens
): Promise<boolean> => {
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    if (!authTokens?.jwtToken && !authTokens?.sessionId) {
      throw new Error('Authentication tokens required for user existence check');
    }

    const payload: Record<string, string> = { phone };

    if (authTokens?.jwtToken) {
      payload.jwttoken = authTokens.jwtToken;
    }

    if (authTokens?.sessionId) {
      payload.sessionid = authTokens.sessionId;
    }

    console.log('[UserService] POST /user-exists - Checking:', {
      phone: phone.substring(0, 5) + '***',
      hasAuth: !!(authTokens?.jwtToken || authTokens?.sessionId),
    });

    const response = await axios.post(`${API_URL}/user-exists`, payload, {
      headers: buildAuthHeaders(authTokens),
    });

    return response.data.exists === true;
  } catch (error) {
    console.error('[UserService] Error checking user exists:', error);
    throw error;
  }
};

/**
 * Check if user exists and get user data
 */
export const checkUserExistsAndGetUser = async (
  phone: string,
  authTokens?: AuthTokens
): Promise<{ exists: boolean; user?: User }> => {
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    const hasAuth = !!authTokens?.jwtToken || !!authTokens?.sessionId;
    if (!hasAuth) {
      throw new Error('Authentication tokens required for user lookup');
    }

    const payload: Record<string, string> = { phone };

    if (authTokens?.jwtToken) {
      payload.jwttoken = authTokens.jwtToken;
    }

    if (authTokens?.sessionId) {
      payload.sessionid = authTokens.sessionId;
    }

    console.log('[UserService] POST /user-exists - Checking and fetching user');

    const existsResponse = await axios.post(`${API_URL}/user-exists`, payload, {
      headers: buildAuthHeaders(authTokens),
    });

    const exists = existsResponse.data.exists;

    if (!exists) {
      return { exists: false };
    }

    // Check if user data is included in response
    if (existsResponse.data.user) {
      return {
        exists: true,
        user: existsResponse.data.user,
      };
    }

    // Try to get user by ID if available
    if (existsResponse.data.userId || existsResponse.data.id) {
      const userId = existsResponse.data.userId || existsResponse.data.id;

      try {
        const userData = await getUserByIdCustom(userId, authTokens);
        return {
          exists: true,
          user: userData,
        };
      } catch (userError) {
        console.error('[UserService] Failed to fetch user data by ID:', userError);
        return { exists: true };
      }
    }

    // Fallback: Try to get user by phone
    try {
      const userResponse = await axios.get(`${API_URL}/users/phone/${phone}`, {
        headers: buildAuthHeaders(authTokens),
      });
      return {
        exists: true,
        user: userResponse.data,
      };
    } catch (userError) {
      console.error('[UserService] User exists but failed to fetch data:', userError);
      return { exists: true };
    }
  } catch (error) {
    console.error('[UserService] Error in checkUserExistsAndGetUser:', error);
    throw error;
  }
};

/**
 * Create new user
 */
export const createUser = async (
  userData: Partial<User>,
  authTokens?: AuthTokens
): Promise<User> => {
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    console.log('[UserService] POST /users - Creating user');

    const response = await axios.post(`${API_URL}/users`, userData, {
      headers: buildAuthHeaders(authTokens),
    });

    console.log('[UserService] User created successfully:', response.data?.id);

    return response.data;
  } catch (error) {
    console.error('[UserService] Error creating user:', error);
    throw error;
  }
};

/**
 * Update user
 */
export const updateUser = async (
  userId: string,
  userData: Partial<User>,
  authTokens?: AuthTokens
): Promise<User> => {
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    const token = authTokens?.jwtToken || (await getManagedToken());
    const headers = buildAuthHeaders(token ? { jwtToken: token, sessionId: authTokens?.sessionId } : undefined);

    console.log('[UserService] PATCH /users - Updating user:', userId);

    const response = await axios.patch(`${API_URL}/users/${userId}`, userData, {
      headers,
    });

    console.log('[UserService] User updated successfully');

    return response.data;
  } catch (error) {
    console.error('[UserService] Error updating user:', error);
    throw error;
  }
};

/**
 * Delete user
 */
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    const token = await getManagedToken();
    const headers = buildAuthHeaders(token ? { jwtToken: token } : undefined);

    console.log('[UserService] DELETE /users - Deleting user:', userId);

    await axios.delete(`${API_URL}/users/${userId}`, {
      headers,
    });

    console.log('[UserService] User deleted successfully');
  } catch (error) {
    console.error('[UserService] Error deleting user:', error);
    throw error;
  }
};

