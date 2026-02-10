import axios from 'axios';
import { getManagedToken } from '@/lib/auth/tokenManager';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface RBACPermissions {
  role: string;
  methods: {
    DELETE?: string[];
    GET?: string[];
    PATCH?: string[];
    POST?: string[];
    PUT?: string[];
  };
}

/**
 * Build authentication headers from JWT token
 */
const buildAuthHeaders = (jwtToken?: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (jwtToken) {
    headers.Authorization = `Bearer ${jwtToken}`;
    headers['x-jwt-token'] = jwtToken;
  }

  return headers;
};

/**
 * Get admin cached permissions from RBAC
 */
export const getAdminCachedPermissions = async (): Promise<RBACPermissions> => {
  console.log('🔵 [RBACService] API CALL INITIATED: GET /rbac/cache/admin');

  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    const token = await getManagedToken();
    const authHeaders = buildAuthHeaders(token);

    console.log('[RBACService] GET /rbac/cache/admin - Request details:', {
      hasToken: !!token,
      url: `${API_URL}/rbac/cache/admin`,
    });

    const response = await axios.get(`${API_URL}/rbac/cache/admin`, {
      headers: authHeaders,
    });

    console.log('✅ [RBACService] GET /rbac/cache/admin - Success:', {
      role: response.data?.role,
      methodCount: Object.keys(response.data?.methods || {}).length,
    });

    return response.data;
  } catch (error) {
    console.error('❌ [RBACService] GET /rbac/cache/admin - Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[RBACService] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    }
    throw error;
  }
};

/**
 * Get superadmin cached permissions from RBAC
 */
export const getSuperAdminCachedPermissions = async (): Promise<RBACPermissions> => {
  console.log('🔵 [RBACService] API CALL INITIATED: GET /rbac/cache/superadmin');

  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    const token = await getManagedToken();
    const authHeaders = buildAuthHeaders(token);

    console.log('[RBACService] GET /rbac/cache/superadmin - Request details:', {
      hasToken: !!token,
      url: `${API_URL}/rbac/cache/superadmin`,
    });

    const response = await axios.get(`${API_URL}/rbac/cache/superadmin`, {
      headers: authHeaders,
    });

    console.log('✅ [RBACService] GET /rbac/cache/superadmin - Success:', {
      role: response.data?.role,
      methodCount: Object.keys(response.data?.methods || {}).length,
    });

    return response.data;
  } catch (error) {
    console.error('❌ [RBACService] GET /rbac/cache/superadmin - Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[RBACService] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    }
    throw error;
  }
};

/**
 * Get cached permissions based on user role
 */
export const getCachedPermissionsByRole = async (
  role: string
): Promise<RBACPermissions> => {
  const normalizedRole = role.toLowerCase();

  if (normalizedRole.includes('superadmin')) {
    return getSuperAdminCachedPermissions();
  } else if (normalizedRole.includes('admin')) {
    return getAdminCachedPermissions();
  }

  throw new Error(`Unknown role: ${role}. Cannot fetch RBAC permissions.`);
};

/**
 * Sync and assign API to a role
 */
export const syncAndAssignAPIToRole = async (
  role: string,
  operationId: string
): Promise<any> => {
  console.log('🔵 [RBACService] API CALL INITIATED: POST /rbac/sync-and-assign-api');

  try {
    if (!API_URL) {
      throw new Error('API_URL is not defined in environment');
    }

    const token = await getManagedToken();
    const authHeaders = buildAuthHeaders(token);

    console.log('[RBACService] POST /rbac/sync-and-assign-api - Request details:', {
      hasToken: !!token,
      url: `${API_URL}/rbac/sync-and-assign-api`,
      payload: { role, operationId }
    });

    const response = await axios.post(`${API_URL}/rbac/sync-and-assign-api`, {
      role,
      operationId
    }, {
      headers: authHeaders,
    });

    console.log('✅ [RBACService] POST /rbac/sync-and-assign-api - Success:', response.data);

    return response.data;
  } catch (error) {
    console.error('❌ [RBACService] POST /rbac/sync-and-assign-api - Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('[RBACService] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    }
    throw error;
  }
};
