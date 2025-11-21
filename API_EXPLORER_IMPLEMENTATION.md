# API Explorer Implementation

## Overview
Implemented a comprehensive API Explorer with RBAC (Role-Based Access Control) integration that automatically fetches and displays only the APIs allowed for the logged-in user's role.

## Features Implemented

### 1. RBAC Service (`lib/services/rbacService.ts`)
- `getAdminCachedPermissions()` - Fetches permissions for Admin role
- `getSuperAdminCachedPermissions()` - Fetches permissions for SuperAdmin role
- `getCachedPermissionsByRole()` - Automatically routes to correct endpoint based on role
- Integrates with token manager for JWT authentication

### 2. Auth Context Integration (`contexts/AuthContext.tsx`)
- Added `permissions` state to store RBAC permissions
- Automatically fetches RBAC permissions after `getUserById` completes
- Calls appropriate RBAC API based on user's role (admin or superadmin)
- Exposes permissions through context for use across app

### 3. OpenAPI Parser Utility (`lib/utils/openapiParser.ts`)
Functions:
- `getEndpointDetails()` - Extracts full endpoint details from OpenAPI spec
- `getEndpointsFromPermissions()` - Maps allowed endpoints from RBAC response to OpenAPI schemas
- `groupEndpointsByTag()` - Organizes endpoints by category
- `generateExampleFromSchema()` - Auto-generates request body examples from schemas
- `resolveSchema()` - Handles OpenAPI `$ref` references

### 4. API Explorer Page (`app/dashboard/api-explorer/page.tsx`)
Professional UI with:

#### Left Panel - Endpoint Browser
- **Search** - Filter endpoints by path, method, description, or category
- **Grouped Display** - Endpoints organized by category with expand/collapse
- **Method Badges** - Color-coded HTTP method indicators (GET, POST, PUT, PATCH, DELETE)
- **Stats Dashboard** - Shows total endpoints, categories, and user role

#### Right Panel - API Testing
- **Endpoint Details** - Shows path, method, summary, and description
- **Path Parameters** - Dynamic inputs for path variables (e.g., `{userId}`)
- **Query Parameters** - Inputs for query string parameters
- **Request Body Editor** - JSON editor with syntax highlighting
- **Auto-generated Examples** - Automatically fills request body with example data from schema
- **Execute Button** - Sends request with JWT token in headers
- **Response Viewer** - Displays response with status code, formatted JSON, and copy button

#### Professional Design Elements
- Color-coded method badges matching website theme
- Professional card-based layout
- Hover effects and transitions
- Loading states and error handling
- Copy to clipboard functionality
- Responsive grid layout
- Search with real-time filtering
- Collapsible sections

### 5. UI Components
Created `components/ui/badge.tsx` - Reusable badge component with variants

## Authentication Flow

1. **User Login** → Clerk authentication
2. **Get JWT Token** → From Clerk session
3. **Get User Data** → Call `/users/{userId}` to get user details including role
4. **Fetch RBAC Permissions** → Based on role:
   - If role contains "superadmin" → Call `/rbac/cache/superadmin`
   - If role contains "admin" → Call `/rbac/cache/admin`
5. **Parse Permissions** → Extract allowed methods and paths
6. **Map to OpenAPI** → Match allowed endpoints to OpenAPI spec to get schemas
7. **Display in Explorer** → Show only allowed APIs with full details

## How API Requests Work

When executing an API from the explorer:

1. **Build Path** - Replace path parameters with user input (e.g., `/users/{userId}` → `/users/123`)
2. **Add Query Params** - Append query string if provided
3. **Add Headers** - Automatically includes:
   - `Authorization: Bearer {jwt}`
   - `x-jwt-token: {jwt}`
   - `Content-Type: application/json`
4. **Parse Body** - Validate and parse JSON request body
5. **Execute** - Send request using axios
6. **Display Response** - Show formatted response with status code

## Color Scheme

Method color coding:
- **GET** - Blue (`bg-blue-500`)
- **POST** - Green (`bg-green-500`)
- **PUT** - Orange (`bg-orange-500`)
- **PATCH** - Purple (`bg-purple-500`)
- **DELETE** - Red (`bg-red-500`)

Matches the website's primary theme color (green/teal).

## Navigation

API Explorer is accessible via:
- Dashboard navigation bar
- Direct URL: `/dashboard/api-explorer`

## Security

- All API requests include JWT token from Clerk
- Only displays endpoints allowed by user's role
- RBAC permissions fetched fresh on login
- Token automatically managed and refreshed

## Usage Example

1. Navigate to API Explorer
2. Browse endpoints in left panel
3. Click an endpoint to see details
4. Fill in required path/query parameters
5. Edit request body if needed (auto-filled with example)
6. Click "Execute Request"
7. View response with status code
8. Copy request/response for debugging

## Files Created/Modified

### New Files:
- `lib/services/rbacService.ts` - RBAC API service
- `lib/utils/openapiParser.ts` - OpenAPI parsing utilities
- `app/dashboard/api-explorer/page.tsx` - Main API Explorer page
- `components/ui/badge.tsx` - Badge UI component
- `API_EXPLORER_IMPLEMENTATION.md` - This documentation

### Modified Files:
- `contexts/AuthContext.tsx` - Added RBAC integration
- `components/dashboard-navigation.tsx` - Already had API Explorer route

## Dependencies

All required dependencies already installed:
- `axios` - HTTP requests
- `lucide-react` - Icons
- `class-variance-authority` - Badge variants
- OpenAPI spec included in `openapi.json`

## Next Steps

1. Start the dev server: `npm run dev`
2. Sign in as admin or superadmin
3. Navigate to API Explorer
4. Test your APIs!

## Notes

- The OpenAPI spec is parsed client-side for performance
- Request body examples are auto-generated from schemas
- All API calls go through the same authentication flow as the rest of the app
- RBAC permissions are cached in AuthContext for the session

