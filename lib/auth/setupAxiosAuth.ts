import axios, { InternalAxiosRequestConfig } from 'axios';
import { getToken, shouldAttachAuthHeader } from './tokenManager';

/**
 * Setup Axios interceptor to automatically attach JWT tokens to API requests
 */
export const setupAxiosAuth = () => {
  // Request interceptor to add auth token
  axios.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Check if this request should have auth header
      if (!shouldAttachAuthHeader(config)) {
        return config;
      }

      try {
        const token = await getToken();
        
        if (token) {
          // Attach token to headers
          config.headers.Authorization = `Bearer ${token}`;
          config.headers['x-jwt-token'] = token;
          
          console.log('[AxiosAuth] Attached token to request:', {
            url: config.url,
            hasToken: !!token,
            tokenLength: token?.length || 0,
          });
        }
      } catch (error) {
        console.error('[AxiosAuth] Error getting token for request:', error);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle auth errors
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        const requestUrl = error.config?.url;
        const requestHeaders = error.config?.headers;
        
        console.error('[AxiosAuth] Unauthorized request:', {
          url: requestUrl,
          status: error.response?.status,
          hasAuthorizationHeader: !!requestHeaders?.Authorization,
          hasJwtTokenHeader: !!requestHeaders?.['x-jwt-token'],
          authorizationHeaderLength: requestHeaders?.Authorization?.length || 0,
          jwtTokenHeaderLength: requestHeaders?.['x-jwt-token']?.length || 0,
          responseData: error.response?.data,
        });
        
        // Clear token cache on 401 to force refresh on next request
        const { clearTokenCache } = await import('./tokenManager');
        clearTokenCache();
        console.log('[AxiosAuth] Cleared token cache due to 401 error');
      }
      
      return Promise.reject(error);
    }
  );

  console.log('[AxiosAuth] Axios interceptors configured');
};

