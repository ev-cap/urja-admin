import type { AxiosRequestConfig } from 'axios';

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

// Token cache
interface TokenCache {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

let cachedToken: TokenCache | null = null;

// Token lifetime in seconds (from your JWT template)
const TOKEN_LIFETIME = 3600; // 3600 seconds = 1 hour

// Buffer time before expiration to refresh token (5 minutes)
const REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Register a token getter function that will be called when a token is needed
 */
export const setTokenGetter = (getter: TokenGetter | null) => {
  tokenGetter = getter;
};

/**
 * Check if the cached token is still valid
 */
const isTokenValid = (): boolean => {
  if (!cachedToken) {
    return false;
  }
  
  const now = Date.now();
  const timeUntilExpiry = cachedToken.expiresAt - now;
  
  // Token is valid if it hasn't expired and we have at least REFRESH_BUFFER time left
  const isValid = timeUntilExpiry > REFRESH_BUFFER;
  
  if (!isValid) {
    console.log('[TokenManager] Token expired or expiring soon', {
      timeUntilExpiry: Math.round(timeUntilExpiry / 1000),
      refreshBuffer: Math.round(REFRESH_BUFFER / 1000),
    });
  }
  
  return isValid;
};

/**
 * Clear the cached token
 */
export const clearTokenCache = () => {
  console.log('[TokenManager] Clearing token cache');
  cachedToken = null;
};

/**
 * Get the current JWT token from cache or fetch new one
 */
export const getToken = async (): Promise<string | null> => {
  // Check if we have a valid cached token
  if (isTokenValid() && cachedToken) {
    console.log('[TokenManager] Using cached token', {
      expiresIn: Math.round((cachedToken.expiresAt - Date.now()) / 1000),
    });
    return cachedToken.token;
  }

  // No token getter registered
  if (!tokenGetter) {
    console.warn('[TokenManager] No token getter registered');
    return null;
  }

  // Fetch new token
  console.log('[TokenManager] Fetching new token from Clerk');
  const token = await tokenGetter();
  
  if (token) {
    // Cache the token with expiration time
    const expiresAt = Date.now() + (TOKEN_LIFETIME * 1000);
    cachedToken = {
      token,
      expiresAt,
    };
    
    console.log('[TokenManager] Token cached successfully', {
      tokenLength: token.length,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresIn: TOKEN_LIFETIME,
    });
  } else {
    console.warn('[TokenManager] Token getter returned null');
  }
  
  return token;
};

/**
 * Get managed token with error handling
 */
export const getManagedToken = async (): Promise<string | null> => {
  try {
    return await getToken();
  } catch (error) {
    console.error('[TokenManager] Error getting token:', error);
    // Clear cache on error
    clearTokenCache();
    return null;
  }
};

// API base URL management
let apiBaseCandidates: string[] = [];

/**
 * Register an API base URL for auth header attachment
 */
export const registerApiBaseUrl = (baseUrl: string | null | undefined) => {
  if (!baseUrl) {
    return;
  }
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  if (!apiBaseCandidates.includes(normalized)) {
    apiBaseCandidates = [...apiBaseCandidates, normalized];
  }
};

/**
 * Clear all registered API base URLs
 */
export const clearApiBaseUrls = () => {
  apiBaseCandidates = [];
};

/**
 * Determine if auth header should be attached to this request config
 */
export const shouldAttachAuthHeader = (config: AxiosRequestConfig): boolean => {
  const { url, baseURL } = config;
  if (!url) {
    return false;
  }

  const normalizedUrl = (() => {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      if (baseURL) {
        const base = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
        const relative = url.startsWith('/') ? url.slice(1) : url;
        return `${base}${relative}`;
      }
    } catch {
      // ignore parsing errors and fall back to simple checks
    }
    return url;
  })();

  // If the request is relative (no protocol) always attach
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    return true;
  }

  return apiBaseCandidates.some((candidate) => {
    if (!candidate) {
      return false;
    }
    try {
      return normalizedUrl.startsWith(candidate);
    } catch {
      return false;
    }
  });
};

/**
 * Determine if auth header should be attached to this raw URL
 */
export const shouldAttachAuthHeaderToUrl = (rawUrl: string | null | undefined): boolean => {
  if (!rawUrl) {
    return false;
  }

  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    return true;
  }

  return apiBaseCandidates.some((candidate) => {
    if (!candidate) {
      return false;
    }
    try {
      return rawUrl.startsWith(candidate);
    } catch {
      return false;
    }
  });
};

// Register environment base URL immediately if available
if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
  registerApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}

