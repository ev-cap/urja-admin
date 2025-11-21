# Settings Page Implementation

## Overview

The settings page now displays user information fetched from the backend after successful authentication via the `user-exists` API.

## Authentication Flow

### 1. User Signs In
- User enters phone number and verifies OTP
- Clerk creates session and provides JWT token
- User is redirected to `/dashboard`

### 2. Automatic User Data Fetch
After authentication, the `AuthContext` automatically:

1. **Calls `/user-exists` API** with:
   ```json
   {
     "phone": "+15555550109",
     "jwttoken": "...",
     "sessionid": "sess_..."
   }
   ```

2. **Receives Response**:
   ```json
   {
     "exists": true,
     "userId": "690f328243c976adc7983fa5",
     "message": "User found with the provided phone number"
   }
   ```

3. **Fetches Full User Details**:
   - Uses the `userId` from step 2
   - Calls `getUserById(userId)` API
   - Returns complete user data:
     ```json
     {
       "id": "690f328243c976adc7983fa5",
       "clerkId": "user_35CANra29YlNM3s0peOX35KN4dB",
       "firstName": "Sande",
       "lastName": "Testtt",
       "email": "geet.more+clerk@gmail.com",
       "phone": "+15555550109",
       ...
     }
     ```

4. **Stores in Context**:
   - `backendUserId`: User ID from backend
   - `userData`: Complete user object

## Implementation Details

### Modified Files

#### 1. `contexts/AuthContext.tsx`
**Changes:**
- Added `backendUserId` and `userData` state
- Added `fetchUserData()` function that:
  - Calls `checkUserExistsAndGetUser()` with phone number
  - Extracts `userId` from response
  - Fetches full user data via `getUserById()`
- Added `refetchUserData()` function for manual refresh
- Automatically fetches user data when user signs in

**New Context Values:**
```typescript
interface AuthContextType {
  // ... existing fields
  backendUserId: string | null;
  userData: User | null;
  refetchUserData: () => Promise<void>;
}
```

#### 2. `hooks/useAuth.ts`
**Changes:**
- Exposed `backendUserId` from AuthContext
- Exposed `userData` from AuthContext
- Exposed `refetchUserData` function

**Usage:**
```typescript
const { userData, backendUserId, refetchUserData } = useAuth();
```

#### 3. `hooks/useUserData.ts`
**Changes:**
- Simplified to use data from `AuthContext` instead of fetching independently
- Provides loading and error states
- Provides `refetch` function

**Usage:**
```typescript
const { userData, loading, error, refetch } = useUserData();
```

#### 4. `app/dashboard/settings/page.tsx`
**Complete Redesign:**
- Fetches user data via `useUserData()` hook
- Displays only 4 fields as requested:
  - First Name
  - Last Name
  - Email Address
  - Phone Number
- Read-only display with clean UI
- Loading state with spinner
- Error state with message
- Matches app theme (dark/light mode support)

## UI Design

### Settings Page Layout

```
┌─────────────────────────────────────┐
│ Settings                            │
│ Manage your account information     │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Profile Information          │ │
│ │ Your personal account details   │ │
│ ├─────────────────────────────────┤ │
│ │                                 │ │
│ │ 👤 First Name                   │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ Sande                       │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ 👤 Last Name                    │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ Testtt                      │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ 📧 Email Address                │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ geet.more+clerk@gmail.com   │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ 📱 Phone Number                 │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ +15555550109                │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

### Design Features

- **Icons**: Each field has a relevant Lucide icon
- **Styling**: 
  - Muted background (`bg-muted/50`)
  - Border (`border border-border`)
  - Rounded corners (`rounded-md`)
  - Proper padding and spacing
- **Typography**:
  - Labels: Small, medium weight, muted color
  - Values: Large, bold, foreground color
- **Theme Support**: Works in both light and dark modes

## API Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    User Signs In                         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│           AuthContext.fetchUserData()                    │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  POST /user-exists                                       │
│  { phone, jwttoken, sessionid }                          │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼ Response
┌──────────────────────────────────────────────────────────┐
│  { exists: true, userId: "690f...", ... }                │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  checkUserExistsAndGetUser()                             │
│    ↓                                                     │
│  getUserById(userId)                                     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  GET /users/{userId}                                     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼ Response
┌──────────────────────────────────────────────────────────┐
│  Full User Object                                        │
│  { id, firstName, lastName, email, phone, ... }          │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  Store in AuthContext                                    │
│  - backendUserId                                         │
│  - userData                                              │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  Settings Page Displays Data                             │
└──────────────────────────────────────────────────────────┘
```

## Usage Example

### Accessing User Data Anywhere in the App

```typescript
import { useUserData } from '@/hooks/useUserData';

function MyComponent() {
  const { userData, loading, error, refetch } = useUserData();

  if (loading) return <Loader />;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Welcome, {userData?.firstName}!</h1>
      <p>Email: {userData?.email}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Accessing Raw Auth Data

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { 
    userData,           // Full user object from backend
    backendUserId,      // Backend user ID
    userId,             // Clerk user ID
    isAuthenticated,
    refetchUserData 
  } = useAuth();

  return (
    <div>
      <p>Clerk ID: {userId}</p>
      <p>Backend ID: {backendUserId}</p>
      <p>Name: {userData?.firstName} {userData?.lastName}</p>
    </div>
  );
}
```

## Error Handling

### Automatic Retry
- If user data fetch fails, it won't break the app
- Error is logged to console
- User can manually retry via `refetchUserData()`

### Error States
- Settings page shows error message if data fetch fails
- Loading spinner shown while fetching
- Graceful degradation if data unavailable

## Testing

### Manual Test Flow

1. **Sign In**:
   - Go to `/auth/signin`
   - Enter phone: `+15555550109`
   - Enter OTP
   - Should redirect to `/dashboard`

2. **Verify Data Fetch**:
   - Check browser console for logs:
     ```
     [AuthContext] Fetching user data from backend for phone: +1555***
     ✅ [UserService] POST /user-exists - Success
     [UserService] Fetching user by ID: 690f328243c976adc7983fa5
     ✅ [UserService] GET /users - Success
     [AuthContext] User data fetched successfully
     ```

3. **View Settings**:
   - Navigate to `/dashboard/settings`
   - Should see:
     - First Name: Sande
     - Last Name: Testtt
     - Email: geet.more+clerk@gmail.com
     - Phone: +15555550109

## Benefits

1. **Single Source of Truth**: User data fetched once and stored in AuthContext
2. **Automatic**: No manual API calls needed in components
3. **Reusable**: `useUserData()` hook can be used anywhere
4. **Performant**: Data cached in context, not refetched on every render
5. **Clean UI**: Settings page matches app theme and design system
6. **Type-Safe**: Full TypeScript support throughout

## Future Enhancements

- Add edit functionality to settings page
- Add profile image display
- Add more user preferences
- Add account deletion option
- Add data export functionality

