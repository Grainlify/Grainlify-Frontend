# API Integration Reference

> **Source**: `src/shared/api/client.ts` — barrel re-exported from `src/shared/api/index.ts`

All backend HTTP requests go through the centralized `apiRequest` helper. Never hand-roll `fetch` — use the typed functions below to keep auth, error handling, and CORS behavior consistent.

---

## Table of Contents

1. [Core API Helper](#core-api-helper)
2. [`ApiRequestOptions` Contract](#apirequestoptions-contract)
3. [Error Handling](#error-handling)
4. [AbortSignal Convention](#abortsignal-convention)
5. [Canonical Fetch Pattern (useOptimisticData)](#canonical-fetch-pattern-useoptimisticdata)
6. [Endpoint Reference](#endpoint-reference)
   - [Health & Status](#health--status)
   - [Landing / Analytics](#landing--analytics)
   - [Authentication](#authentication)
   - [Profile](#profile)
   - [Projects](#projects)
   - [Ecosystems](#ecosystems)
   - [Admin Ecosystems](#admin-ecosystems)
   - [Open Source Week](#open-source-week)
   - [Leaderboard](#leaderboard)
   - [Admin Bootstrap](#admin-bootstrap)
   - [KYC](#kyc)
   - [Billing & Payouts](#billing--payouts)
   - [Blog](#blog)
   - [Maintainer Data](#maintainer-data)
   - [Issue / PR Actions](#issue--pr-actions)
   - [Terms & Notifications](#terms--notifications)
7. [Security Notes](#security-notes)
8. [Deprecations](#deprecations)

---

## Core API Helper

```ts
async function apiRequest<T>(endpoint: string, options?: ApiRequestOptions): Promise<T>
```

- Prepends `API_BASE_URL` (from `VITE_API_BASE_URL` env var, defaults to `http://localhost:8080`) to `endpoint`.
- Sets `Content-Type: application/json` automatically — **except** when the body is `FormData` (let the browser set `multipart/form-data`), or when the request is a simple `GET`/`HEAD` with no body (avoids unnecessary CORS preflight).
- On success, parses and returns the JSON body as type `T`.
- Throws `Error` on failures (see [Error Handling](#error-handling)).
- For a few project-list endpoints, gracefully returns `[]` when the response body is empty or not JSON.

---

## `ApiRequestOptions` Contract

```ts
interface ApiRequestOptions extends RequestInit {
  /** Attach the JWT from localStorage as `Authorization: Bearer <token>` */
  requiresAuth?: boolean
}
```

Because `ApiRequestOptions` extends `RequestInit`, you also have access to all standard `fetch` options:

| Option | Type | Notes |
|---|---|---|
| `requiresAuth` | `boolean` | Default `false`. When `true`, reads `patchwork_jwt` from localStorage and injects the Bearer header. |
| `signal` | `AbortSignal` | Standard `RequestInit` field. Used by maintainer fetchers to wire up `useOptimisticData` cancellation. |
| `method` | `string` | Default `"GET"` if omitted. |
| `body` | `BodyInit` | Stringified JSON or `FormData`. `Content-Type` is set automatically (see above). |
| `headers` | `Record<string, string>` | Merged with auto-generated headers. |

---

## Error Handling

`apiRequest` throws `Error` objects in four categories. All are safe to catch and display.

| Condition | Error Message | User-Friendly Display |
|---|---|---|
| Network failure (`TypeError` from `fetch`) | `"Network error: Unable to connect to the server. Please check your connection."` | `getUserFriendlyError(err)` maps to `"Unable to connect to the server. Please check your internet connection and try again."` |
| HTTP 401 (Unauthorized) | `"Authentication failed. Please sign in again."` — also calls `removeAuthToken()` and dispatches `patchwork-auth-token` event. | `getUserFriendlyError(err)` maps to `"Your session has expired. Please sign in again."` |
| HTTP 403 (Forbidden) | `"Permission denied: <server message>. You may need admin privileges to perform this action."` — parses `message` or `error` from response body. | Raw message is usually descriptive enough; falls back to `"The requested resource could not be found."` if not matched. |
| HTTP 4xx / 5xx (other) | Parsed `message` or `error` from response body, or `"API request failed with status <code>"` if body is not JSON. | `getUserFriendlyError(err)` matches known patterns (`500`, `404`, `timeout`) or returns `"Unable to complete your request. Please try again."` |

### Display Pattern

```tsx
import { getUserFriendlyError } from '../../shared/utils/errorHandler'
import { DataState } from '../../shared/components/DataState'

<DataState
  isLoading={isLoading}
  isEmpty={items.length === 0}
  hasError={hasError}
  error={error}
  onRetry={retry}
  emptyMessage="No items found."
>
  {/* content */}
</DataState>
```

`DataState` internally calls `getUserFriendlyError(error)` for the error message and renders a Retry button when `onRetry` is provided.

---

## AbortSignal Convention

The two maintainer data fetchers accept an optional second `options` parameter that is spread directly into `apiRequest`:

```ts
getMaintainerIssues(projectId, { signal })
getMaintainerPRs(projectId, { signal })
```

This allows them to be wired into `useOptimisticData`'s built-in abort-controller lifecycle. When the hook re-fetches or the component unmounts, the in-flight request is automatically cancelled.

```ts
// Inside a useOptimisticData fetchData callback:
await fetchData(async (signal) => {
  const response = await getMaintainerIssues(projectId, { signal })
  return response.issues
})
```

All other client functions omit the `options` parameter — they do **not** support AbortSignal out of the box. If you need abort for a non-maintainer endpoint, pass `{ signal }` as the second argument (it's valid `RequestInit`):

```ts
apiRequest<T>('/some/endpoint', { requiresAuth: true, signal })
```

---

## Canonical Fetch Pattern (`useOptimisticData`)

The recommended pattern uses `useOptimisticData` (from `src/shared/hooks/useOptimisticData.ts`) paired with a `client.ts` function. This gives you caching, loading/error state, and automatic request cancellation.

```tsx
import { useOptimisticData } from '../../shared/hooks/useOptimisticData'
import { getMaintainerPRs } from '../../shared/api/client'

interface PR {
  /* ... */
}

function MyComponent({ projectId }: { projectId: string }) {
  const {
    data: prs,
    isLoading,
    hasError,
    error,
    retry,
    fetchData,
  } = useOptimisticData<PR[]>([], {
    cacheKey: `prs-${projectId}`,
    cacheDuration: 30000, // 30s in-memory cache
  })

  const loadData = useCallback(async () => {
    await fetchData(async (signal) => {
      const response = await getMaintainerPRs(projectId, { signal })
      return response.prs
    })
  }, [projectId, fetchData])

  useEffect(() => { loadData() }, [loadData])

  return (
    <DataState
      isLoading={isLoading}
      isEmpty={prs.length === 0}
      hasError={hasError}
      error={error}
      onRetry={retry}
    >
      {/* render prs */}
    </DataState>
  )
}
```

**Key points:**
- `fetchData` accepts an `(signal: AbortSignal) => Promise<T>` callback.
- The hook manages an internal `AbortController` — a new fetch aborts any in-flight one.
- `cacheKey` + `cacheDuration` control the in-memory cache.
- `retry()` re-triggers the last fetch function with exponential backoff (full jitter).

---

## Endpoint Reference

### Health & Status

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `checkHealth()` | GET | `/health` | — |
| `checkReady()` | GET | `/ready` | — |

### Landing / Analytics

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `getLandingStats()` | GET | `/stats/landing` | — |
| `getProjectActivity(interval)` | GET | `/stats/project-activity?interval=...` | — |
| `getContributorActivity(interval)` | GET | `/stats/contributor-activity?interval=...` | — |
| `getContributorsByRegion()` | GET | `/stats/contributors-by-region` | — |
| `getAnalyticsStats()` | GET | `/stats/analytics-summary` | — |

### Authentication

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `getCurrentUser()` | GET | `/me` | ✅ |
| `resyncGitHubProfile()` | POST | `/me/github/resync` | ✅ |
| `getGitHubLoginUrl()` | — | Returns constructed URL to `/auth/github/login/start?redirect=...` | — |
| `getGitHubStatus()` | GET | `/auth/github/status` | ✅ |
| `bootstrapAdmin(bootstrapToken)` | POST | `/admin/bootstrap` (sends `X-Admin-Bootstrap-Token` header) | ✅ |

### Profile

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `getUserProfile()` | GET | `/profile` | ✅ |
| `getPublicProfile(userId?, login?)` | GET | `/profile/public?user_id=...&login=...` | — |
| `getProfileCalendar(userId?, login?)` | GET | `/profile/calendar?user_id=...&login=...` | ✅ |
| `getProfileActivity(limit, offset, userId?, login?)` | GET | `/profile/activity?limit=...&offset=...` | ✅ |
| `getProfileRewards()` | GET | `/profile/rewards` | ✅ |
| `getProfileContributions()` | GET | `/profile/contributions` | ✅ |
| `getProjectsContributed(userId?, login?)` | GET | `/profile/projects?user_id=...&login=...` | ✅ |
| `getProjectsLed(userId?, login?)` | GET | `/profile/projects-led?user_id=...&login=...` | ✅ |
| `updateProfile(data)` | PUT | `/profile/update` | ✅ |
| `updateAvatar(avatarUrl)` | PUT | `/profile/avatar` | ✅ |

### Projects

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `getPublicProjects(params?)` | GET | `/projects?ecosystem=...&language=...&category=...&tags=...&limit=...&offset=...` | — |
| `getRecommendedProjects(limit?)` | GET | `/projects/recommended?limit=...` | — |
| `getPublicProject(projectId)` | GET | `/projects/:id` | — |
| `getPublicProjectIssues(projectId)` | GET | `/projects/:id/issues/public` | — |
| `getPublicProjectPRs(projectId)` | GET | `/projects/:id/prs/public` | — |
| `getProjectFilters()` | GET | `/projects/filters` | — |
| `getMyProjects()` | GET | `/projects/mine` | ✅ |
| `createProject(data)` | POST | `/projects` | ✅ |
| `getPendingSetupProjects()` | GET | `/projects/pending-setup` | ✅ |
| `updateProjectMetadata(projectId, data)` | PUT | `/projects/:id/metadata` | ✅ |
| `verifyProject(projectId)` | POST | `/projects/:id/verify` | ✅ |
| `syncProject(projectId)` | POST | `/projects/:id/sync` | ✅ |

### Ecosystems

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `getEcosystems()` | GET | `/ecosystems` | — |
| `getEcosystemDetail(id)` | GET | `/ecosystems/:id` | — |
| `requestEcosystem(data)` | POST | `/ecosystems/request` | — |

### Admin Ecosystems

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `createEcosystem(data)` | POST | `/admin/ecosystems` | ✅ |
| `getAdminEcosystems()` | GET | `/admin/ecosystems` | ✅ |
| `getAdminEcosystem(id)` | GET | `/admin/ecosystems/:id` | ✅ |
| `deleteEcosystem(id)` | DELETE | `/admin/ecosystems/:id` | ✅ |
| `updateEcosystem(id, data)` | PUT | `/admin/ecosystems/:id` | ✅ |

### Open Source Week

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `getOpenSourceWeekEvents()` | GET | `/open-source-week/events` | — |
| `getOpenSourceWeekEvent(id)` | GET | `/open-source-week/events/:id` | — |
| `getAdminOpenSourceWeekEvents()` | GET | `/admin/open-source-week/events` | ✅ |
| `createOpenSourceWeekEvent(data)` | POST | `/admin/open-source-week/events` | ✅ |
| `deleteOpenSourceWeekEvent(id)` | DELETE | `/admin/open-source-week/events/:id` | ✅ |

### Leaderboard

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `getLeaderboard(limit?, offset?, ecosystem?)` | GET | `/leaderboard?limit=...&offset=...&ecosystem=...` | — |

### Admin Bootstrap

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `bootstrapAdmin(bootstrapToken)` | POST | `/admin/bootstrap` | ✅ |

### KYC

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `startKYCVerification()` | POST | `/auth/kyc/start` | ✅ |
| `getKYCStatus()` | GET | `/auth/kyc/status` | ✅ |

### Billing & Payouts

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `getBillingProfiles()` | GET | `/billing/profiles` | ✅ |
| `getPayoutMappings()` | GET | `/profile/payout-mappings` | ✅ |
| `savePayoutMappings(mappings)` | PUT | `/profile/payout-mappings` | ✅ |
| `downloadInvoice(invoiceId)` | GET | `/billing/invoices/:id/download` | ✅ |

> **Note**: `downloadInvoice` uses a raw `fetch` (not `apiRequest`) because the endpoint returns a binary PDF blob. It mirrors the same auth and error-handling contract — attaches the Bearer token, clears on 401, and throws typed errors.

### Blog

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `getBlogPosts()` | GET | `/blog/posts` | — |

### Maintainer Data

These functions accept `options?: ApiRequestOptions` as a second parameter for passing `{ signal }`.

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `getMaintainerIssues(projectId, options?)` | GET | `/projects/:id/issues` | ✅ |
| `getMaintainerPRs(projectId, options?)` | GET | `/projects/:id/prs` | ✅ |

### Issue / PR Actions

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `applyToIssue(projectId, issueNumber, message)` | POST | `/projects/:id/issues/:number/apply` | ✅ |
| `postBotComment(projectId, issueNumber, body)` | POST | `/projects/:id/issues/:number/bot-comment` | ✅ |
| `withdrawApplication(projectId, issueNumber, commentId)` | POST | `/projects/:id/issues/:number/withdraw` | ✅ |
| `assignApplicant(projectId, issueNumber, assignee)` | POST | `/projects/:id/issues/:number/assign` | ✅ |
| `unassignApplicant(projectId, issueNumber)` | POST | `/projects/:id/issues/:number/unassign` | ✅ |
| `rejectApplication(projectId, issueNumber, assignee)` | POST | `/projects/:id/issues/:number/reject` | ✅ |

### Terms & Notifications

| Function | Method | Endpoint | Auth |
|---|---|---|---|
| `getTermsStatus()` | GET | `/profile/terms` | ✅ |
| `acceptTerms(version)` | POST | `/profile/terms` | ✅ |
| `getNotificationSettings()` | GET | `/profile/notifications` | ✅ |
| `updateNotificationSettings(settings)` | PUT | `/profile/notifications` | ✅ |

---

## Security Notes

- **`VITE_` environment variables are public.** `VITE_API_BASE_URL` and `VITE_FRONTEND_BASE_URL` are compiled into the client bundle and visible in browser DevTools. Never put secrets in `VITE_` vars.
- **JWT lives in `localStorage`** under the key `patchwork_jwt`. It is read by `getAuthToken()` on every authenticated request. Because `localStorage` is accessible to any JavaScript running on the same origin, the app is vulnerable to XSS attacks. For production, consider httpOnly cookies instead.
- **Token lifecycle**: On HTTP 401, `apiRequest` calls `removeAuthToken()` and dispatches a `patchwork-auth-token` custom event to notify `AuthContext`. The user is signed out automatically.
- **No credentials in tests**: The test suite (`client.test.ts`) asserts that raw tokens never leak into stdout, console logs, or error strings.

---

## Deprecations

| Deprecated | Replaced By |
|---|---|
| `getProjectIssues(projectId)` | `getMaintainerIssues(projectId)` |
| `getProjectPRs(projectId)` | `getMaintainerPRs(projectId)` |

These are thin wrappers kept for backward compatibility. New code should use the `getMaintainer*` variants directly.
