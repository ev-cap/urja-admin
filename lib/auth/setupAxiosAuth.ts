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
        console.error('[AxiosAuth] Unauthorized request:', {
          url: error.config?.url,
          status: error.response?.status,
        });
        
        // Optionally redirect to login or refresh token here
        // For now, just propagate the error
      }
      
      return Promise.reject(error);
    }
  );

  console.log('[AxiosAuth] Axios interceptors configured');
};

