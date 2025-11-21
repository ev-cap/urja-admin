# Clerk Dashboard Configuration Required

## Issue: "Identifier is invalid" Error

This error occurs because phone authentication isn't properly configured in Clerk Dashboard.

## Required Configuration Steps

### 1. Enable Phone Number Authentication

Go to: **Clerk Dashboard → User & Authentication → Email, Phone, Username**

1. Click on **Phone number** section
2. Enable the toggle for **Phone number**
3. Check **"Required"** (make it mandatory)
4. Check **"Used for sign-in"** (critical for our use case)
5. Save changes

### 2. Configure Authentication Settings

Go to: **Clerk Dashboard → User & Authentication → Settings**

1. Under **Identification**:
   - Ensure "Phone number" is listed
   - Ensure "Used for sign in" is checked

2. Under **First factors**:
   - Enable "Phone verification code"
   - This allows OTP-based sign in

### 3. JWT Template Configuration

Go to: **Clerk Dashboard → JWT Templates**

1. Ensure template named **`jwt-rool`** exists
2. If not, create it:
   - Click "New template"
   - Name: `jwt-rool`
   - Add any custom claims needed
   - Save

### 4. Disable Other Authentication Methods (Optional)

If you want phone-only authentication:

1. Go to **Email, Phone, Username** settings
2. Disable:
   - Email address
   - Username
3. Keep only Phone number enabled

## Verification Checklist

After configuration, verify:

- ✓ Phone number authentication is enabled
- ✓ "Used for sign-in" is checked for phone
- ✓ Phone verification code is enabled as first factor
- ✓ JWT template `jwt-rool` exists
- ✓ Test environment keys are correct in `.env.local`

## Common Configuration Issues

### Phone Not Accepting as Identifier

**Symptom:** "Identifier is invalid" error

**Cause:** Phone not enabled as sign-in method

**Fix:**
1. Dashboard → Email, Phone, Username
2. Phone number → Check "Used for sign-in"
3. Save and restart dev server

### Account Exists But Can't Sign In

**Symptom:** Account exists but sign-in fails

**Cause:** Phone wasn't set as identifier when account was created

**Fix:**
1. Delete existing test accounts
2. Configure phone as sign-in method first
3. Create new account via signup
4. Then test sign-in

### OTP Not Sending

**Symptom:** No OTP code sent

**Cause:** Phone verification not enabled

**Fix:**
1. Dashboard → Settings
2. First factors → Enable "Phone verification code"
3. Save changes

## Testing After Configuration

1. **Sign Up Test:**
   ```
   URL: /auth/signup
   Country: 🇺🇸 +1
   Phone: 2125551234
   OTP: 424242
   Expected: Account created
   ```

2. **Sign In Test:**
   ```
   URL: /auth/signin
   Country: 🇺🇸 +1
   Phone: 2125551234
   OTP: 424242
   Expected: Signed in successfully
   ```

## Dashboard URLs

- Main: https://dashboard.clerk.com
- Settings: https://dashboard.clerk.com/apps/[your-app]/settings
- Authentication: https://dashboard.clerk.com/apps/[your-app]/authentication
- JWT Templates: https://dashboard.clerk.com/apps/[your-app]/jwt-templates

## Support

If issues persist after configuration:
1. Check Clerk dashboard audit logs
2. Verify phone format (E.164: +[country][number])
3. Ensure test keys match environment
4. Try with Clerk's hosted UI first to verify config

