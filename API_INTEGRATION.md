# Backend API Integration

This document describes how the Grainlify frontend integrates with the Patchwork backend API.

## Configuration

### Backend URL

The backend URL is configured via environment variables and centralized in `src/shared/config/api.ts`:

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const FRONTEND_BASE_URL = import.meta.env.VITE_FRONTEND_BASE_URL || window.location.origin;
```

**Never hardcode the backend URL.** Always use the `VITE_API_BASE_URL` environment variable.

Set the backend URL in your `.env` file:

```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_FRONTEND_BASE_URL=http://localhost:5173
```

For production, update `.env` or configure environment variables in your deployment platform:

```bash
VITE_API_BASE_URL=https://api.grainlify.com
VITE_FRONTEND_BASE_URL=https://grainlify.com
```

## Authentication Flow

### GitHub OAuth

Grainlify uses **GitHub OAuth** for authentication. There is no email/password authentication.

#### Flow Diagram

```
1. User clicks "Sign In" or "Sign Up"
   ↓
2. Frontend redirects to: {VITE_API_BASE_URL}/auth/github/login/start
   ↓
3. Backend redirects to GitHub OAuth
   ↓
4. User authorizes Grainlify
   ↓
5. GitHub redirects to backend callback
   ↓
6. Backend processes OAuth and redirects to: {VITE_FRONTEND_BASE_URL}/auth/callback?token=<jwt>
   ↓
7. Frontend extracts token, stores in localStorage, fetches user info
   ↓
8. User is redirected to /dashboard
```

#### Implementation

**Sign In/Sign Up Pages** (`src/features/auth/pages/SignInPage.tsx`, `SignUpPage.tsx`)
- Both redirect to the same GitHub OAuth flow
- No role selection needed upfront (backend assigns roles)

**OAuth Callback Handler** (`src/features/auth/pages/AuthCallbackPage.tsx`)
- Extracts JWT from URL query parameter: `?token=<jwt>`
- Stores token in localStorage as `patchwork_jwt`
- Calls `login(token)` from AuthContext
- Redirects to `/dashboard`

**Authentication Context** (`src/app/contexts/AuthContext.tsx`)
- Manages auth state: `isAuthenticated`, `userRole`, `userId`
- Provides `login(token)` and `logout()` methods
- Fetches user info from `/me` endpoint after login

### Token Storage

JWT tokens are stored in **localStorage** with the key `patchwork_jwt`:

```typescript
// Store token
localStorage.setItem('patchwork_jwt', token);

// Retrieve token
const token = localStorage.getItem('patchwork_jwt');

// Clear token
localStorage.removeItem('patchwork_jwt');
```

**Security Considerations:**
- ⚠️ localStorage is vulnerable to XSS attacks
- ✅ Suitable for development and prototyping
- ⚠️ For production, consider httpOnly cookies
- ✅ Never log or expose tokens in console
- ✅ Clear tokens on logout

### Authenticated Requests

All authenticated API requests include the JWT in the Authorization header:

```typescript
Authorization: Bearer <jwt_token>
```

The API client (`src/shared/api/client.ts`) automatically includes this header:

```typescript
const token = localStorage.getItem('patchwork_jwt');
const response = await fetch(`${API_BASE_URL}/endpoint`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### Token Expiration

If the backend returns `401 Unauthorized`:
- Token is expired or invalid
- Frontend clears the token
- User is redirected to sign-in page

## API Client

All API calls are centralized in `src/shared/api/client.ts`.

### Example Usage

```typescript
import { getCurrentUser, getUserProfile, getPublicProjects } from '@/shared/api/client';

// Get current authenticated user
const user = await getCurrentUser();
console.log(user.id, user.role); // UUID, 'contributor' | 'maintainer' | 'admin'

// Get user profile with contributions
const profile = await getUserProfile();
console.log(profile.contributions_count, profile.languages);

// Get public projects with filters
const projects = await getPublicProjects({
  language: 'TypeScript',
  ecosystem: 'Starknet',
  limit: 20,
});
```

### Correlation ID (`X-Request-Id`)

Every outgoing API request automatically includes an `X-Request-Id` header containing a random UUID (v4). This allows support and backend teams to correlate a frontend error report with a specific request in the server logs.

**Behaviour:**
- A fresh UUID is generated per request via `crypto.randomUUID()` (with a cryptographic fallback for older environments).
- If the caller already supplies an `X-Request-Id` header (e.g. when retrying), that value is **preserved** and not overwritten.
- The request ID is attached to the thrown `ApiError` as `error.requestId` so error handlers can surface it in UI or telemetry.
- The same request ID is forwarded to `logger.error(...)` on every failure path for local debugging.

```typescript
import { apiRequest, ApiError } from '@/shared/api/client';

try {
  const data = await apiRequest('/some-endpoint');
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`Request ${error.requestId} failed:`, error.message);
    // Show "If this keeps happening, please provide this code: <requestId>"
  }
}
```

**Security:** The ID is purely random and contains no PII (no JWTs, emails, or user identifiers are embedded). It is safe to log and safe to share with end users as a support reference.

### Available Endpoints

#### Authentication
- `getCurrentUser()` → Get current user info (id, role)
- `getGitHubLoginUrl()` → Get GitHub OAuth start URL
- `getGitHubStatus()` → Check if GitHub account is linked

#### User Profile
- `getUserProfile()` → Get contributions, languages, ecosystems
- `getProfileCalendar()` → Get 365-day contribution calendar
- `getProfileActivity(limit, offset)` → Get paginated activity feed

#### Projects
- `getPublicProjects(params)` → Get filtered project list
- `getProjectFilters()` → Get available filters (languages, tags, ecosystems)
- `getMyProjects()` → Get projects owned by user (maintainers only)
- `createProject(data)` → Create a new project
- `verifyProject(id)` → Verify project ownership
- `syncProject(id)` → Sync project data from GitHub

#### Ecosystems
- `getEcosystems()` → Get list of ecosystems

#### KYC
- `startKYCVerification()` → Start KYC verification session
- `getKYCStatus()` → Get KYC verification status

## Error Handling

The API client automatically handles errors. All non-2xx responses and network failures throw an `ApiError` (subclass of `Error`) that carries the request's correlation ID as `.requestId`.

**401 Unauthorized** - Token expired/invalid
```typescript
// Automatically clears token and redirects to sign-in
localStorage.removeItem('patchwork_jwt');
window.location.href = '/auth/signin';
```

**Other Errors** - Throws `ApiError` with backend message
```typescript
import { ApiError } from '@/shared/api/client';

try {
  const profile = await getUserProfile();
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`Request ${error.requestId} failed:`, error.message);
    // Handle error (show toast, etc.)
  }
}
```

## CORS Configuration

The backend must allow requests from your frontend domain.

**Development:**
- Backend should allow `http://localhost:5173` (or your Vite dev server port)
- Or configure CORS to allow all origins (development only)

**Production:**
- Backend should allow `https://your-frontend-domain.com`
- Use specific origins, not wildcard (`*`)

## File Structure

```
/src
├── shared/
│   ├── api/
│   │   ├── client.ts          # API client with all endpoints
│   │   └── index.ts           # Exports
│   └── config/
│       └── api.ts             # API configuration (VITE_API_BASE_URL)
├── app/
│   └── contexts/
│       └── AuthContext.tsx    # Authentication state management
└── features/
    └── auth/
        └── pages/
            ├── AuthCallbackPage.tsx   # OAuth callback handler
            ├── SignInPage.tsx         # GitHub OAuth sign-in
            └── SignUpPage.tsx         # GitHub OAuth sign-up
```

## Environment Variables

All environment variables must use the `VITE_` prefix to be exposed to the browser.

**.env**
```bash
# Backend API base URL (required)
VITE_API_BASE_URL=http://localhost:8080

# Frontend base URL (optional, defaults to window.location.origin)
VITE_FRONTEND_BASE_URL=http://localhost:5173
```

**src/shared/config/api.ts**
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const FRONTEND_BASE_URL = import.meta.env.VITE_FRONTEND_BASE_URL || window.location.origin;
```

## Security Best Practices

### Frontend (Current Implementation)

✅ **Do:**
- Store JWT in localStorage as `patchwork_jwt`
- Clear token on 401 response
- Never log tokens to console
- Use HTTPS in production
- Validate token presence before authenticated requests
- Include `X-Request-Id` on every API request for end-to-end tracing
- Surface `error.requestId` to users so support can look up the failing request

⚠️ **Security Considerations:**
- localStorage is vulnerable to XSS attacks
- JWT payload is readable (don't store sensitive data)
- Tokens persist across browser sessions (no automatic expiry on close)

### Backend (Required)

The backend must:
- ✅ Keep OAuth client secrets secure (never expose to frontend)
- ✅ Set appropriate JWT expiration times
- ✅ Validate JWTs on every request
- ✅ Use HTTPS in production
- ✅ Configure CORS appropriately
- ✅ Never expose `ADMIN_BOOTSTRAP_TOKEN` to frontend

### Production Recommendations

For production deployments, consider:
- Using httpOnly cookies instead of localStorage
- Implementing refresh token rotation
- Adding CSRF protection
- Setting up rate limiting
- Enabling security headers (CSP, HSTS, etc.)

## Troubleshooting

### "Authentication failed" error
- ✅ Check backend is running at `VITE_API_BASE_URL`
- ✅ Verify CORS is configured correctly
- ✅ Check browser console for detailed errors
- ✅ Ensure `.env` file exists and is loaded

### OAuth redirect not working
- ✅ Verify backend's `PUBLIC_BASE_URL` includes your frontend URL
- ✅ Check `/auth/callback` route is registered in React Router
- ✅ Ensure GitHub OAuth app callback URL matches backend callback

### Token expires immediately
- ✅ Check backend's JWT expiration settings
- ✅ Verify token is stored correctly in localStorage
- ✅ Check browser console for 401 responses

### CORS errors
- ✅ Backend must allow requests from `VITE_FRONTEND_BASE_URL`
- ✅ Check backend CORS configuration includes your frontend domain
- ✅ Verify preflight OPTIONS requests are handled

## Next Steps

### Integration Checklist

- ✅ Authentication (GitHub OAuth)
- ✅ Profile pages with real API data
- ✅ Projects browsing with filters
- ✅ Ecosystems integration
- ✅ Maintainer dashboard
- ⬜ KYC verification flow
- ⬜ Admin panel (admin role)
- ⬜ Real-time notifications (WebSocket/SSE)
- ⬜ Payment processing integration

### Testing Authentication

1. Start backend: Ensure it's running at `VITE_API_BASE_URL`
2. Start frontend: `pnpm run dev`
3. Click "Sign In" or "Sign Up"
4. Authorize on GitHub
5. Verify redirect to `/auth/callback` with token
6. Verify redirect to `/dashboard`
7. Check localStorage contains `patchwork_jwt`
8. Verify API requests include Authorization header

## Additional Resources

- [Vite Environment Variables](https://vite.dev/guide/env-and-mode.html)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## Roles & Access

### Role Model

The backend issues a JWT whose payload includes the user's `role` field. The frontend reads this via `AuthContext` and exposes it as `userRole` (type `'contributor' | 'maintainer' | 'admin' | null`).

| Role | Permitted views |
|------|----------------|
| `contributor` | All standard dashboard pages |
| `maintainer` | All contributor views + Maintainers dashboard (`/dashboard/maintainers`) |
| `admin` | All maintainer views + Admin panel (`/dashboard/admin`) + Data page |

### Client-Side Guard (`RoleGuard`)

`src/shared/components/RoleGuard.tsx` provides a `<RoleGuard allow={[...roles]}>` component that renders children only when the current `userRole` is listed in `allow`. Unauthorized roles see a themed "Access Restricted" state.

```tsx
// Only admins can reach this subtree
<RoleGuard allow={['admin']}>
  <AdminPage />
</RoleGuard>

// Maintainers and admins
<RoleGuard allow={['maintainer', 'admin']}>
  <MaintainersPage />
</RoleGuard>
```

### ⚠️ Security Note

**Client-side role checks are a UX guard only.** They prevent accidental navigation to wrong views and surface clear "no access" states, but they do not constitute a security boundary. The backend must independently enforce authorization on every admin/maintainer endpoint — do not rely on the frontend guard to protect sensitive data or mutations.

