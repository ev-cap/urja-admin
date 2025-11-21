/**
 * Clerk configuration for the application
 * Using phone authentication with OTP
 */

export const clerkConfig = {
  // JWT template name configured in Clerk dashboard
  jwtTemplateName: 'jwt-rool',
  
  // Authentication strategy
  authStrategy: 'phone' as const,
  
  // Phone authentication settings
  phoneSettings: {
    // Only allow phone number sign in
    enabled: true,
    required: true,
  },
} as const;

/**
 * Get Clerk publishable key
 */
export const getClerkPublishableKey = () => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  }
  return key;
};

/**
 * Get Clerk secret key (server-side only)
 */
export const getClerkSecretKey = () => {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    throw new Error('Missing CLERK_SECRET_KEY');
  }
  return key;
};

