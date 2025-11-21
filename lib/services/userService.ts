import axios from 'axios';
import { getManagedToken } from '@/lib/auth/tokenManager';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface User {
  id: string;
  clerkId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  name?: string;
  role?: string;
  userStatus?: string;
  userRole?: string;
  createdAt?: string;
  updatedAt?: string;
  referralCode?: string;
  referredBy?: string;
  rewardPoints?: number;
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
  console.log('🔵 [UserService] API CALL INITIATED: GET /users/' + userId);
  
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

    console.log('[UserService] GET /users - Request details:', {
      userId,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      url: `${API_URL}/users/${userId}`,
    });

    const response = await axios.get(`${API_URL}/users/${userId}`, {
      headers: authHeaders,
    });

    console.log('✅ [UserService] GET /users - Success:', {
      userId: response.data?.id,
      status: response.status,
      hasEmail: !!response.data?.email,
    });

    return response.data;
  } catch (error) {
    console.error('❌ [UserService] GET /users - Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[UserService] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
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
  console.log('🔵 [UserService] API CALL INITIATED: GET /users/' + userId + ' (custom auth)');
  
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    console.log('[UserService] GET /users (custom auth) - Request details:', {
      userId,
      url: `${API_URL}/users/${userId}`,
      hasJwtToken: !!authTokens?.jwtToken,
      hasSessionId: !!authTokens?.sessionId,
    });

    const response = await axios.get(`${API_URL}/users/${userId}`, {
      headers: buildAuthHeaders(authTokens),
    });

    console.log('✅ [UserService] GET /users (custom auth) - Success:', {
      userId: response.data?.id,
      status: response.status,
    });

    return response.data;
  } catch (error) {
    console.error('❌ [UserService] GET /users (custom auth) - Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[UserService] Error details:', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
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
  console.log('🔵 [UserService] API CALL INITIATED: POST /user-exists');
  
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

    console.log('[UserService] POST /user-exists - Request details:', {
      url: `${API_URL}/user-exists`,
      phone: phone.substring(0, 5) + '***',
      hasJwtToken: !!authTokens?.jwtToken,
      hasSessionId: !!authTokens?.sessionId,
      payload: { ...payload, jwttoken: payload.jwttoken ? '***' : undefined },
    });

    const response = await axios.post(`${API_URL}/user-exists`, payload, {
      headers: buildAuthHeaders(authTokens),
    });

    console.log('✅ [UserService] POST /user-exists - Success:', {
      exists: response.data.exists,
      status: response.status,
    });

    return response.data.exists === true;
  } catch (error) {
    console.error('❌ [UserService] POST /user-exists - Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[UserService] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
    }
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
  console.log('🔵 [UserService] API CALL INITIATED: POST /user-exists (with user data)');
  
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

    console.log('[UserService] POST /user-exists - Request details:', {
      url: `${API_URL}/user-exists`,
      phone: phone.substring(0, 5) + '***',
      hasJwtToken: !!authTokens?.jwtToken,
      hasSessionId: !!authTokens?.sessionId,
    });

    const existsResponse = await axios.post(`${API_URL}/user-exists`, payload, {
      headers: buildAuthHeaders(authTokens),
    });

    const exists = existsResponse.data.exists;
    
    console.log('✅ [UserService] POST /user-exists - Response:', {
      exists,
      hasUser: !!existsResponse.data.user,
      hasUserId: !!(existsResponse.data.userId || existsResponse.data.id),
    });

    if (!exists) {
      return { exists: false };
    }

    // Check if user data is included in response
    if (existsResponse.data.user) {
      console.log('[UserService] User data included in /user-exists response');
      return {
        exists: true,
        user: existsResponse.data.user,
      };
    }

    // Try to get user by ID if available
    if (existsResponse.data.userId || existsResponse.data.id) {
      const userId = existsResponse.data.userId || existsResponse.data.id;
      console.log('[UserService] Fetching user by ID:', userId);

      try {
        const userData = await getUserByIdCustom(userId, authTokens);
        return {
          exists: true,
          user: userData,
        };
      } catch (userError) {
        console.error('❌ [UserService] Failed to fetch user data by ID:', userError);
        return { exists: true };
      }
    }

    // Fallback: Try to get user by phone
    console.log('🔵 [UserService] API CALL: GET /users/phone/' + phone.substring(0, 5) + '***');
    try {
      const userResponse = await axios.get(`${API_URL}/users/phone/${phone}`, {
        headers: buildAuthHeaders(authTokens),
      });
      console.log('✅ [UserService] GET /users/phone - Success');
      return {
        exists: true,
        user: userResponse.data,
      };
    } catch (userError) {
      console.error('❌ [UserService] GET /users/phone - Failed:', userError);
      return { exists: true };
    }
  } catch (error) {
    console.error('❌ [UserService] POST /user-exists - Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[UserService] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    }
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
  console.log('🔵 [UserService] API CALL INITIATED: POST /users (create user)');
  
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    console.log('[UserService] POST /users - Request details:', {
      url: `${API_URL}/users`,
      phone: userData.phone?.substring(0, 5) + '***' || 'N/A',
      hasJwtToken: !!authTokens?.jwtToken,
    });

    const response = await axios.post(`${API_URL}/users`, userData, {
      headers: buildAuthHeaders(authTokens),
    });

    console.log('✅ [UserService] POST /users - User created:', {
      userId: response.data?.id,
      status: response.status,
    });

    return response.data;
  } catch (error) {
    console.error('❌ [UserService] POST /users - Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[UserService] Error details:', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
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
  console.log('🔵 [UserService] API CALL INITIATED: PATCH /users/' + userId);
  
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    const token = authTokens?.jwtToken || (await getManagedToken());
    const headers = buildAuthHeaders(token ? { jwtToken: token, sessionId: authTokens?.sessionId } : undefined);

    console.log('[UserService] PATCH /users - Request details:', {
      userId,
      url: `${API_URL}/users/${userId}`,
      hasToken: !!token,
      fieldsUpdating: Object.keys(userData),
    });

    const response = await axios.patch(`${API_URL}/users/${userId}`, userData, {
      headers,
    });

    console.log('✅ [UserService] PATCH /users - User updated:', {
      userId: response.data?.id,
      status: response.status,
    });

    return response.data;
  } catch (error) {
    console.error('❌ [UserService] PATCH /users - Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[UserService] Error details:', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    throw error;
  }
};

/**
 * Delete user
 */
export const deleteUser = async (userId: string): Promise<void> => {
  console.log('🔵 [UserService] API CALL INITIATED: DELETE /users/' + userId);
  
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    const token = await getManagedToken();
    const headers = buildAuthHeaders(token ? { jwtToken: token } : undefined);

    console.log('[UserService] DELETE /users - Request details:', {
      userId,
      url: `${API_URL}/users/${userId}`,
      hasToken: !!token,
    });

    await axios.delete(`${API_URL}/users/${userId}`, {
      headers,
    });

    console.log('✅ [UserService] DELETE /users - User deleted:', userId);
  } catch (error) {
    console.error('❌ [UserService] DELETE /users - Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[UserService] Error details:', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    throw error;
  }
};

/**
 * Get all users
 * Automatically retrieves and attaches JWT token
 */
export const getAllUsers = async (sessionId?: string): Promise<User[]> => {
  console.log('🔵 [UserService] API CALL INITIATED: GET /users (all users)');
  
  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    // Get JWT token and build auth headers (MUST include sessionId like mobile app)
    const token = await getManagedToken();
    
    // Backend requires EITHER jwtToken OR sessionId (mobile app uses sessionId)
    if (!token && !sessionId) {
      console.error('❌ [UserService] No authentication credentials available');
      throw new Error('Authentication required. Please sign in.');
    }
    
    const authHeaders = buildAuthHeaders({ 
      jwtToken: token || undefined,
      sessionId: sessionId 
    });

    console.log('[UserService] GET /users - Request details:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      hasSessionId: !!sessionId,
      sessionId: sessionId ? `${sessionId.substring(0, 20)}...` : 'none',
      url: `${API_URL}/users`,
      headers: {
        hasAuthorization: !!authHeaders.Authorization,
        hasJwtToken: !!authHeaders['x-jwt-token'],
        hasSessionId: !!authHeaders['x-session-id'],
      },
    });

    const response = await axios.get(`${API_URL}/users`, {
      headers: authHeaders,
    });

    console.log('✅ [UserService] GET /users - Success:', {
      totalUsers: response.data?.length || 0,
      status: response.status,
    });

    return response.data;
  } catch (error) {
    console.error('❌ [UserService] GET /users - Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[UserService] CORS/Network Error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        requestUrl: error.config?.url,
        requestHeaders: {
          hasAuthorization: !!error.config?.headers?.Authorization,
          hasJwtToken: !!error.config?.headers?.['x-jwt-token'],
        },
      });
    }
    throw error;
  }
};

