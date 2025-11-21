# Clerk Authentication Setup

## Overview

This application uses Clerk for phone-based authentication with OTP verification. The authentication system is integrated with a custom UI and connects to a backend API using JWT tokens.

## File Structure

```
lib/
├── auth/
│   ├── tokenManager.ts       # Token management and API URL registration
│   └── setupAxiosAuth.ts     # Axios interceptor for automatic token attachment
├── clerk/
│   └── config.ts            # Clerk configuration
└── services/
    └── userService.ts       # User API service functions

contexts/
└── AuthContext.tsx          # Authentication context provider

hooks/
└── useAuth.ts              # Custom auth hooks

app/
├── auth/
│   ├── signin/
│   │   └── page.tsx        # Sign in page with OTP
│   └── signup/
│       └── page.tsx        # Sign up page with OTP
└── layout.tsx              # Root layout with ClerkProvider

middleware.ts               # Route protection middleware

types/
└── auth.ts                 # Authentication type definitions
```

## Environment Variables

Add these to `.env.local`:

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Z3Jvd2luZy1zdGFyZmlzaC0zNi5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_jIWsLeg6RQfy8kkSymT0PJ54496QQjfVf2qeO7SBoz

# Clerk Routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/signin
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# API Configuration
NEXT_PUBLIC_API_URL=https://staging-urja-backend-36ti.encr.app
```

## Authentication Flow

### 1. Sign In Flow

1. User selects country code (🇮🇳 +91 or 🇺🇸 +1) on `/auth/signin`
2. User enters 10-digit phone number
3. Clerk sends OTP to phone number
4. User enters 6-digit OTP code
5. On successful verification:
   - Clerk creates session
   - JWT token retrieved with `jwt-rool` template
   - User redirected to `/dashboard`

### 2. Sign Up Flow

1. User selects country code (🇮🇳 +91 or 🇺🇸 +1) on `/auth/signup`
2. User enters 10-digit phone number
3. Clerk sends OTP to phone number
4. User enters 6-digit OTP code
5. On successful verification:
   - Clerk creates new user and session
   - JWT token retrieved with `jwt-rool` template
   - User redirected to `/dashboard`

### 3. Token Management

**Token Retrieval:**
```typescript
import { useAuth } from '@/hooks/useAuth';

const { getToken } = useAuth();
const token = await getToken();
```

**Automatic Token Attachment:**
- Axios interceptor automatically attaches JWT tokens to API requests
- Tokens attached to requests matching registered API base URLs
- Headers added: `Authorization`, `x-jwt-token`, `x-session-id`

**Manual Token Usage:**
```typescript
import { useAuthTokens } from '@/hooks/useAuth';

const { getAuthTokens } = useAuthTokens();
const tokens = await getAuthTokens();
// { jwtToken: "...", sessionId: "..." }
```

### 4. API Integration

**User Service Functions:**
```typescript
import { getUserById, checkUserExistsByPhone, createUser } from '@/lib/services/userService';

// Get user (automatic token)
const user = await getUserById(userId);

// Check user exists (manual token)
const exists = await checkUserExistsByPhone(phone, authTokens);

// Create user
const newUser = await createUser({ phone, name }, authTokens);
```

## Clerk Configuration

### Phone Authentication Setup

1. Clerk Dashboard → Authentication → Phone
2. Enable phone authentication
3. Set as required authentication method
4. Configure OTP settings

### JWT Template Setup

1. Clerk Dashboard → JWT Templates
2. Create template named: `jwt-rool`
3. Add custom claims as needed
4. Save template

## Route Protection

Routes are protected by Clerk middleware in `middleware.ts`:

**Public Routes:**
- `/` - Landing page
- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page

**Protected Routes:**
- `/dashboard/*` - All dashboard routes
- All other routes require authentication

## UI Components

### CountryCodeSelect

Dropdown selector for country codes:
```typescript
<CountryCodeSelect
  value={countryCode}     // "+91" or "+1"
  onChange={setCountryCode}
  disabled={loading}
/>
```

Supported countries:
- 🇮🇳 India (+91)
- 🇺🇸 United States (+1)

### AuthContext

Provides authentication state and methods:
```typescript
const {
  isAuthenticated,  // boolean
  isLoading,        // boolean
  userId,           // string | null
  sessionId,        // string | null
  getToken,         // () => Promise<string | null>
  signOut,          // () => Promise<void>
} = useAuthContext();
```

### useAuth Hook

Combined hook with Clerk and custom auth:
```typescript
const {
  isAuthenticated,
  isLoading,
  userId,
  user,           // Clerk user object
  phone,          // Primary phone number
  getToken,
  signOut,
  clerk,          // Clerk instance
} = useAuth();
```

### UserMenu Component

Displays user info and sign out button in dashboard navigation.

## Token Flow Diagram

```
User Sign In
    ↓
Clerk OTP Verification
    ↓
Session Created
    ↓
JWT Token Retrieved (jwt-rool template)
    ↓
Token Stored in AuthContext
    ↓
Token Getter Registered in tokenManager
    ↓
Axios Interceptor Attaches Token to API Requests
    ↓
Backend API Receives Authenticated Request
```

## API Request Headers

All authenticated API requests include:
```
Authorization: Bearer <jwtToken>
x-jwt-token: <jwtToken>
x-session-id: <sessionId>
Content-Type: application/json
```

## Testing

### Test with US Phone Number (Development)

For Clerk test environment, US phone numbers have a default OTP:

1. Start dev server: `npm run dev`
2. Navigate to `/auth/signin`
3. Enter US phone number (e.g., 2125551234)
4. Click "Send OTP"
5. Enter OTP: **424242**
6. Verify redirect to `/dashboard`
7. Check console for token logs

### Test with Indian Phone Number

1. Navigate to `/auth/signin`
2. Enter phone number (10 digits, e.g., 9876543210)
3. Receive actual OTP on phone
4. Enter received OTP code
5. Verify redirect to `/dashboard`

**Note:** Clerk's test environment uses OTP `424242` for US numbers by default.

## Troubleshooting

**Token not attached to requests:**
- Verify `NEXT_PUBLIC_API_URL` is set
- Check `registerApiBaseUrl()` in AuthContext
- Verify Axios interceptor setup in `setupAxiosAuth.ts`

**JWT template error:**
- Verify template name is `jwt-rool` in Clerk dashboard
- Check template is published/active
- Verify session exists before getting token

**Phone authentication not working:**
- Check Clerk dashboard phone settings
- Verify phone number format (+91xxxxxxxxxx)
- Check Clerk API keys are correct

## Security Notes

- JWT tokens stored in Clerk's secure session
- Token getter function registered securely
- Tokens never exposed to client-side storage
- Automatic token refresh handled by Clerk
- Route protection via middleware

