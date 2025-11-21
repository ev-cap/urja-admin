# Quick Start Guide

## First Time Setup

### 1. Create Account (Sign Up)

1. Navigate to: `http://localhost:3000/auth/signup`
2. Select country code:
   - **🇺🇸 +1** for US (test with OTP `424242`)
   - **🇮🇳 +91** for India (receive real OTP)
3. Enter phone number (10 digits)
4. Click "Send OTP"
5. Enter verification code:
   - US: `424242`
   - India: Real OTP from SMS
6. Account created → Redirected to `/dashboard`

### 2. Sign In (Existing Account)

1. Navigate to: `http://localhost:3000/auth/signin`
2. Select same country code
3. Enter same phone number
4. Click "Send OTP"
5. Enter verification code
6. Sign in successful → Redirected to `/dashboard`

## Testing Flow

### Test with US Number (No SMS Required)

**Sign Up:**
```
1. Go to /auth/signup
2. Select: 🇺🇸 +1
3. Enter: 2125551234
4. Click "Send OTP"
5. Enter OTP: 424242
6. ✓ Account created
```

**Sign In:**
```
1. Go to /auth/signin
2. Select: 🇺🇸 +1
3. Enter: 2125551234
4. Click "Send OTP"
5. Enter OTP: 424242
6. ✓ Signed in
```

### Test with Indian Number (Real SMS)

**Sign Up:**
```
1. Go to /auth/signup
2. Select: 🇮🇳 +91
3. Enter: 9876543210
4. Click "Send OTP"
5. Check phone for OTP
6. Enter received OTP
7. ✓ Account created
```

**Sign In:**
```
1. Go to /auth/signin
2. Select: 🇮🇳 +91
3. Enter: 9876543210
4. Click "Send OTP"
5. Check phone for OTP
6. Enter received OTP
7. ✓ Signed in
```

## Common Issues

### "Account not found" on Sign In
- **Solution:** Use `/auth/signup` first to create account
- Sign in only works with existing accounts

### "Identifier is invalid"
- **Cause:** Account doesn't exist yet
- **Solution:** Go to signup page first

### Keyless Mode Warning
- **Cause:** Missing `.env.local` file
- **Solution:** Ensure `.env.local` exists with Clerk keys
- **Fix:** Restart dev server after creating `.env.local`

### OTP Not Working
- **US Numbers:** Always use OTP `424242` (Clerk test mode)
- **Other Numbers:** Check phone for real SMS OTP
- Verify phone number format is correct

## Dashboard Features

Once signed in:
- View dashboard at `/dashboard`
- See user phone number in top navigation
- Use "Sign Out" button to log out
- Access protected routes (analytics, orders, reports, settings, users)

## Development URLs

- Home: `http://localhost:3000`
- Sign Up: `http://localhost:3000/auth/signup`
- Sign In: `http://localhost:3000/auth/signin`
- Dashboard: `http://localhost:3000/dashboard` (protected)

## Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=https://staging-urja-backend-36ti.encr.app
```

## Next Steps

1. Create account via signup
2. Sign in with same credentials
3. Explore dashboard features
4. Test API calls (automatically authenticated)
5. Check browser console for JWT token logs

