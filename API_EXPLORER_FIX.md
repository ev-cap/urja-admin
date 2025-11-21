# API Explorer Path Matching Fix

## Problem
API Explorer was only showing 149 endpoints instead of the expected 272 from RBAC permissions.

## Root Cause
The RBAC API response uses **generic parameter names** in paths:
- `/users/{id}`
- `/activitylogs/{id}`
- `/sessions/{sessionid}`

But the OpenAPI spec uses **specific parameter names**:
- `/users/{userId}`
- `/activitylogs/{activityLogId}`
- `/sessions/{sessionId}`

The exact string matching was failing, causing endpoints to be skipped.

## Solution
Implemented **path normalization** in `lib/utils/openapiParser.ts`:

1. **Normalize Function** - Replaces all path parameters with generic `{param}` placeholder:
   - `/users/{id}` → `/users/{param}`
   - `/users/{userId}` → `/users/{param}`
   - Now they match!

2. **Flexible Matching** - `findMatchingPath()` function:
   - First tries exact match
   - Falls back to normalized matching (case-insensitive)
   - Returns the actual OpenAPI path for schema extraction

## Results

### Before Fix
- **149 endpoints** displayed

### After Fix
- **237 endpoints** matched and displayed (87% match rate)
- **35 endpoints** legitimately missing from OpenAPI spec

### Breakdown by Method

| Method | RBAC Count | Matched | Missing |
|--------|------------|---------|---------|
| GET    | 113        | 99      | 14      |
| POST   | 88         | 79      | 9       |
| PUT    | 37         | 31      | 6       |
| DELETE | 33         | 27      | 6       |
| PATCH  | 1          | 1       | 0       |
| **Total** | **272** | **237** | **35** |

### Missing Endpoints
The 35 unmatched endpoints are **newer APIs** not yet in `openapi.json`:
- **Payments APIs** - `/payments/*` (11 endpoints)
- **Referrals APIs** - `/referrals/*` (8 endpoints)
- **Reviews APIs** - `/reviews/*` (6 endpoints)
- **Rewards API** - `/rewards` POST endpoint
- **Meta Filter APIs** - Various filter config endpoints

These APIs exist in the backend and RBAC knows about them, but they haven't been added to the OpenAPI documentation yet.

## User Experience Improvements

1. **Diagnostics Banner** - Shows when endpoints are missing:
   ```
   Showing 237 of 272 allowed endpoints
   35 newer APIs from your permissions are not yet documented in the OpenAPI spec
   ```

2. **Console Logging** - Detailed diagnostics in browser console:
   ```javascript
   [APIExplorer] Diagnostics: { totalRbac: 272, matched: 237, missing: 35 }
   ```

3. **Graceful Handling** - Missing endpoints don't break the UI, they're simply not shown

## Files Modified

1. **`lib/utils/openapiParser.ts`**
   - Added `normalizePath()` function
   - Added `findMatchingPath()` function
   - Updated `getEndpointDetails()` to use flexible matching
   - Returns actual OpenAPI path for proper schema extraction

2. **`app/dashboard/api-explorer/page.tsx`**
   - Added diagnostics state tracking
   - Added info banner for missing endpoints
   - Added console logging for debugging

## Testing
Verified with full RoleAdmin RBAC response:
- ✅ Path parameter name variations handled correctly
- ✅ Case-insensitive matching works
- ✅ All 237 documented endpoints display correctly
- ✅ Request body schemas extracted properly
- ✅ Missing endpoints logged but don't cause errors

## Next Steps (Optional)
To show all 272 endpoints, update `openapi.json` to include:
- Payment endpoints
- Referral endpoints
- Review endpoints
- New rewards and filter config endpoints

The API Explorer will automatically pick them up once added to the spec.

