# CRITICAL: Clerk Dashboard Configuration Required

## Current Error: "Identifier is invalid" (422)

This error **always** means phone authentication is not properly configured in Clerk Dashboard.

## Required Fix in Clerk Dashboard

### Step 1: Enable Phone as Sign-In Method

1. Go to: https://dashboard.clerk.com
2. Select your app: **growing-starfish-36.clerk.accounts.dev**
3. Navigate: **User & Authentication** → **Email, Phone, Username**
4. Find **Phone number** section
5. **CRITICAL:** Check these boxes:
   - ✓ Enable "Phone number"
   - ✓ Check "**Used for sign-in**" ← **THIS IS THE FIX**
   - ✓ Check "Required"
6. Click **Save changes**

### Step 2: Enable Phone Verification Code

1. Still in **User & Authentication**
2. Go to **Settings** tab (top of page)
3. Under **First factors** section:
   - ✓ Enable "**Phone verification code**"
4. Click **Save**

### Step 3: Verify Configuration

After saving, you should see:
- Phone number: ✓ Enabled
- Used for sign-in: ✓ Yes
- First factor: ✓ Phone verification code

## Why This Happens

Clerk rejects phone as an identifier because:
- Dashboard hasn't marked phone as valid for sign-in
- Even if accounts exist with phone numbers
- Even if phone is enabled for signup
- **"Used for sign-in" MUST be checked**

## After Configuration

1. **Restart dev server:**
   ```bash
   # Stop with Ctrl+C
   npm run dev
   ```

2. **Test Sign In:**
   - Go to `/auth/signin`
   - Select: 🇺🇸 +1
   - Enter: `5555550109` or `2125551234`
   - OTP: `424242`
   - Should work ✓

## Verification Test

To verify Clerk config is correct, temporarily test with Clerk's prebuilt UI:

```tsx
// Temporary test component
import { SignIn } from "@clerk/nextjs";

export default function Test() {
  return <SignIn />;
}
```

If Clerk's UI works but ours doesn't, then our code is wrong.
If Clerk's UI also fails, then Dashboard config is wrong.

## Alternative: Use Clerk Hosted Pages

If you can't configure Dashboard, use Clerk's hosted pages:

```env
# .env.local
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://clerk-sign-in-url
NEXT_PUBLIC_CLERK_SIGN_UP_URL=https://clerk-sign-up-url
```

## Test Phone Numbers (Clerk Test Mode)

These work in test environment:
- `+15555550100` to `+15555550109` → OTP: `424242`
- `+12125551234` → OTP: `424242`
- Any US number in test mode → OTP: `424242`

## Screenshot Locations

The setting you need to enable is at:

```
Dashboard → User & Authentication → Email, Phone, Username
  
  Phone number
    ☐ Enable phone number authentication
    ☐ Required
    ☐ Used for sign-in  ← MUST BE CHECKED
    ☐ Verify at sign-up
```

## Current Configuration Issue

Your publishable key: `pk_test_Z3Jvd2luZy1zdGFyZmlzaC0zNi5jbGVyay5hY2NvdW50cy5kZXYk`

Domain: `growing-starfish-36.clerk.accounts.dev`

**Action Required:** Log into this specific Clerk instance and enable phone sign-in.

## Support

If still failing after configuration:
1. Check Clerk dashboard audit logs
2. Try with a fresh test account
3. Verify the publishable key matches the configured app
4. Contact Clerk support with error details

