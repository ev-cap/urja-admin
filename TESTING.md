# Testing Guide

## Authentication Testing

### Quick Test with US Number (Clerk Test Mode)

**For development/testing, Clerk provides a default OTP for US phone numbers:**

1. Navigate to `/auth/signin` or `/auth/signup`
2. Select **🇺🇸 +1** from country code dropdown
3. Enter a US phone number (10 digits):
   - Example: `2125551234`, `3105551234`, `4155551234`
4. Click "Send OTP"
5. Enter OTP: **`424242`**
6. You'll be redirected to `/dashboard`

### Test with Indian Number

1. Navigate to `/auth/signin` or `/auth/signup`
2. Select **🇮🇳 +91** from country code dropdown (default)
3. Enter Indian phone number (10 digits):
   - Example: `9876543210`
4. Click "Send OTP"
5. Check phone for actual OTP
6. Enter received OTP code
7. You'll be redirected to `/dashboard`

### Test with International Numbers

1. Enter phone with country code:
   - Format: `+[country code][number]`
   - Examples: 
     - UK: `+447911123456`
     - Australia: `+61412345678`
     - Canada: `+14165551234`
2. Receive actual OTP on phone
3. Enter OTP and verify

## Country Code Selector

The UI provides a country code selector with two options:

| Country | Code | Flag | Digits Required |
|---------|------|------|-----------------|
| India | +91 | 🇮🇳 | 10 |
| United States | +1 | 🇺🇸 | 10 |

**How it works:**
- Select country from dropdown
- Enter phone number (digits only)
- System automatically formats as `{countryCode}{phoneNumber}`

**Examples:**
- India: Select 🇮🇳 +91, enter `9876543210` → Formatted as `+919876543210`
- US: Select 🇺🇸 +1, enter `2125551234` → Formatted as `+12125551234`

## Default Test OTP by Region

| Region | OTP Code | Notes |
|--------|----------|-------|
| US Numbers | `424242` | Clerk test environment default |
| Other Numbers | Actual SMS | Real OTP sent to phone |

## Testing Checklist

- [ ] Sign up with US number using OTP `424242`
- [ ] Sign in with same US number
- [ ] Verify user menu shows phone number
- [ ] Test sign out functionality
- [ ] Verify redirect to `/auth/signin` after sign out
- [ ] Try accessing `/dashboard` without auth (should redirect)
- [ ] Sign up with Indian number (if available)
- [ ] Verify JWT token in console logs
- [ ] Test API calls with automatic token attachment

## Development Console Logs

Watch for these logs during testing:

```
[SignIn] Preparing sign in with phone: +[number]
[SignIn] OTP sent successfully
[SignIn] Verifying OTP code
[SignIn] Sign in complete, setting active session
[SignIn] Session created: [sessionId]

[AuthContext] Token retrieved successfully
[AuthContext] Authentication system initialized

[AxiosAuth] Attached token to request
```

## Troubleshooting

**OTP not sending:**
- Verify Clerk publishable key is correct
- Check Clerk dashboard phone settings are enabled
- Ensure phone number format is valid

**424242 not working:**
- Only works for US numbers in test environment
- Verify you're using test keys, not production
- Check Clerk dashboard → Settings → Environment

**Token not attached:**
- Check browser console for `[AxiosAuth]` logs
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Ensure session is active (check `[AuthContext]` logs)

## API Testing

Test authenticated API calls:

```typescript
import { getUserById } from '@/lib/services/userService';

// Token automatically attached
const user = await getUserById('user-id-here');
```

Check network tab for:
- `Authorization: Bearer [token]`
- `x-jwt-token: [token]`
- `x-session-id: [sessionId]`

