# URJA Admin Dashboard

Admin panel for the ROOL electric vehicle charging network.

## Quick Commands
- `npm run dev` - Start dev server (Turbopack) at localhost:3000
- `npm run build` - Production build
- `npm run lint` - ESLint check
- `npm run typecheck` - TypeScript type checking
- `npm run test` - Run tests with Vitest
- `npm run format` - Format code with Prettier
- `npm start` - Start production server

## Project Structure
- `/app` - Next.js App Router pages and layouts
- `/components` - React components (ui/, RouteMap, navigation)
- `/contexts` - React contexts (AuthContext)
- `/hooks` - Custom hooks (useAuth, useUserData)
- `/lib` - Services, utilities, auth helpers
- `/types` - TypeScript type definitions
- `/public` - Static assets (logos, icons)

## Architecture Patterns
- **Auth Flow:** Clerk (OTP) → JWT token → Backend validation
- **Token Management:** Cached with 1hr expiry, 5min refresh buffer
- **API Calls:** Axios interceptors auto-attach auth headers
- **Theme:** next-themes with system preference detection

## Code Conventions
- Use TypeScript strict mode - avoid `any` types
- Prefer Server Components; use `'use client'` only when needed
- Use Tailwind classes; avoid custom CSS
- Keep components focused and under 300 lines
- Define interfaces in `/types` for API responses
- Use skeleton loaders for loading states

## Environment Variables
Required:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret (server-side)
- `NEXT_PUBLIC_API_URL` - Backend API base URL

## Key Files
- `/middleware.ts` - Route protection with Clerk
- `/contexts/AuthContext.tsx` - Central auth state
- `/lib/auth/tokenManager.ts` - JWT caching logic
- `/lib/services/userService.ts` - User API operations
- `/openapi.json` - Backend API specification

## Testing
- Tests use Vitest with React Testing Library
- Run `npm run test` for watch mode, `npm run test:run` for CI
- Test files: `*.test.ts` or `*.test.tsx`
