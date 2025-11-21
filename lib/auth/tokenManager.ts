import type { AxiosRequestConfig } from 'axios';

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

/**
 * Register a token getter function that will be called when a token is needed
 */
export const setTokenGetter = (getter: TokenGetter | null) => {
  tokenGetter = getter;
};

/**
 * Get the current JWT token from the registered token getter
 */
export const getToken = async (): Promise<string | null> => {
  if (!tokenGetter) {
    return null;
  }
  return tokenGetter();
};

/**
 * Get managed token with error handling
 */
export const getManagedToken = async (): Promise<string | null> => {
  try {
    return await getToken();
  } catch (error) {
    console.error('[TokenManager] Error getting token:', error);
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

