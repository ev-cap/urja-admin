/**
 * Authentication related types
 */

export interface AuthTokens {
  jwtToken?: string | null;
  sessionId?: string | null;
}

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

export interface UserExistsResponse {
  exists: boolean;
  user?: User;
  userId?: string;
  id?: string;
}

