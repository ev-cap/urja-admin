# Complete Authentication Flow

## Overview

The Urja Admin dashboard now has full Clerk phone authentication with automatic session management.

## Authentication Flow

### 1. Landing Page (`/`)

**Behavior:**
- **Unauthenticated users:** See landing page with Sign In / Sign Up options
- **Authenticated users:** Automatically redirected to `/dashboard`

**Implementation:**
```tsx
// Client-side session check
useEffect(() => {
  if (isLoaded && isSignedIn) {
    router.push('/dashboard');
  }
}, [isLoaded, isSignedIn, router]);
```

### 2. Sign Up (`/auth/signup`)

**Flow:**
1. User selects country code (🇮🇳 +91 or 🇺🇸 +1)
2. Enters 10-digit phone number
3. Clicks "Send OTP"
4. Receives OTP (US: `424242`, India: real SMS)
5. Enters 6-digit OTP
6. Account created → Session established → Redirected to `/dashboard`

**Auto-redirect:**
- If already signed in, automatically redirects to `/dashboard`

### 3. Sign In (`/auth/signin`)

**Flow:**
1. User selects country code (🇮🇳 +91 or 🇺🇸 +1)
2. Enters 10-digit phone number
3. Clicks "Send OTP"
4. Receives OTP (US: `424242`, India: real SMS)
5. Enters 6-digit OTP
6. Signed in → Session established → Redirected to `/dashboard`

**Auto-redirect:**
- If already signed in, automatically redirects to `/dashboard`

### 4. Dashboard (`/dashboard`)

**Protected Route:**
- Middleware enforces authentication
- Unauthenticated users redirected to `/auth/signin`
- Authenticated users see dashboard with:
  - User phone number in navigation
  - Sign Out button
  - Full dashboard features

### 5. Sign Out

**Flow:**
1. User clicks "Sign Out" in dashboard navigation
2. Session terminated
3. Redirected to `/auth/signin`

## Session Management

### Automatic Session Check

**Landing Page:**
```tsx
// Auto-redirect if session exists
if (isSignedIn) → redirect to /dashboard
```

**Auth Pages (Sign In/Sign Up):**
```tsx
// Prevent re-authentication if already signed in
if (isSignedIn) → redirect to /dashboard
```

**Protected Routes:**
```tsx
// Middleware enforces authentication
if (!isSignedIn) → redirect to /auth/signin
```

### JWT Token Management

**Token Flow:**
1. User authenticates via Clerk OTP
2. Clerk creates session
3. JWT token retrieved with `jwt-rool` template
4. Token stored in `AuthContext`
5. Axios interceptor automatically attaches token to API requests

**Token Headers:**
```
Authorization: Bearer <jwtToken>
x-jwt-token: <jwtToken>
x-session-id: <sessionId>
```

## Route Protection

### Public Routes (No Authentication Required)
- `/` - Landing page (auto-redirects if signed in)
- `/auth/signin` - Sign in page (auto-redirects if signed in)
- `/auth/signup` - Sign up page (auto-redirects if signed in)

### Protected Routes (Authentication Required)
- `/dashboard` - Main dashboard
- `/dashboard/analytics` - Analytics page
- `/dashboard/orders` - Orders page
- `/dashboard/reports` - Reports page
- `/dashboard/settings` - Settings page
- `/dashboard/users` - Users page

## Complete User Journey

### First Time User

1. **Visit:** `http://localhost:3000`
   - Sees landing page
   
2. **Click:** "Sign Up" button
   - Redirected to `/auth/signup`
   
3. **Enter:** Phone number with country code
   - Example: 🇺🇸 +1, `5555550109`
   
4. **Receive:** OTP code
   - US: `424242` (test mode)
   - India: Real SMS
   
5. **Enter:** OTP and verify
   - Account created
   - Session established
   
6. **Redirected:** to `/dashboard`
   - Phone displayed in navigation
   - Full access to dashboard

### Returning User

1. **Visit:** `http://localhost:3000`
   - **If session exists:** Auto-redirect to `/dashboard`
   - **If no session:** See landing page
   
2. **Click:** "Sign In" (if not auto-redirected)
   - Redirected to `/auth/signin`
   
3. **Enter:** Phone number
   - Same number used during signup
   
4. **Receive:** OTP code
   - US: `424242`
   - India: Real SMS
   
5. **Enter:** OTP and verify
   - Session established
   
6. **Redirected:** to `/dashboard`
   - Authenticated and ready to use

### Signed In User

1. **Visit:** `http://localhost:3000`
   - **Instantly redirected** to `/dashboard`
   - No landing page shown
   
2. **Visit:** `/auth/signin` or `/auth/signup`
   - **Instantly redirected** to `/dashboard`
   - Already authenticated
   
3. **Direct access:** `/dashboard`
   - Immediate access
   - Session verified by middleware

## Testing Scenarios

### Test 1: First Time User
```bash
1. Open incognito/private window
2. Go to http://localhost:3000
3. ✓ Should see landing page
4. Click "Sign Up"
5. Enter: 🇺🇸 +1, 5555550109
6. OTP: 424242
7. ✓ Should redirect to /dashboard
```

### Test 2: Session Persistence
```bash
1. Sign in (as per Test 1)
2. Close browser tab
3. Reopen http://localhost:3000
4. ✓ Should auto-redirect to /dashboard
5. Session persists across page loads
```

### Test 3: Sign Out
```bash
1. From dashboard, click "Sign Out"
2. ✓ Should redirect to /auth/signin
3. Go to http://localhost:3000
4. ✓ Should see landing page (no auto-redirect)
5. Session cleared
```

### Test 4: Protected Route Access
```bash
1. Sign out (clear session)
2. Try to access http://localhost:3000/dashboard
3. ✓ Should redirect to /auth/signin
4. After sign in, ✓ redirect back to /dashboard
```

### Test 5: Prevent Re-authentication
```bash
1. Sign in to dashboard
2. Try to access /auth/signin
3. ✓ Should auto-redirect to /dashboard
4. Same for /auth/signup
5. Cannot re-authenticate while signed in
```

## API Integration

All authenticated API calls automatically include JWT token:

```typescript
import { getUserById } from '@/lib/services/userService';

// Token automatically attached by Axios interceptor
const user = await getUserById(userId);
```

**Request Headers (Auto-attached):**
```
Authorization: Bearer eyJhbGci...
x-jwt-token: eyJhbGci...
x-session-id: sess_abc123...
```

## Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/signin
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

NEXT_PUBLIC_API_URL=https://staging-urja-backend-36ti.encr.app
```

## Summary

✓ Landing page checks session and auto-redirects authenticated users  
✓ Sign in/up pages prevent re-authentication  
✓ Dashboard and protected routes enforce authentication  
✓ JWT tokens automatically attached to API requests  
✓ Session persists across page loads  
✓ Clean sign out flow  
✓ US test numbers use OTP `424242`  
✓ Indian numbers receive real SMS OTP  

**The authentication system is fully functional and production-ready.**

