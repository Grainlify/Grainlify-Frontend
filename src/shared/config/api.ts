/**
 * API Configuration
 * 
 * This module centralizes all API configuration and URLs for the Grainlify frontend.
 * All configuration is driven by environment variables (VITE_* prefix required by Vite).
 * 
 * **IMPORTANT:** Never hardcode backend URLs directly in API calls. Always import and use
 * `API_BASE_URL` from this file to ensure consistency across the application.
 * 
 * ## Environment Variables
 * 
 * Required:
 * - `VITE_API_BASE_URL`: Backend API base URL
 *   - Development: `http://localhost:8080`
 *   - Production: `https://api.grainlify.com` (or your production backend URL)
 * 
 * Optional:
 * - `VITE_FRONTEND_BASE_URL`: Frontend base URL (defaults to `window.location.origin`)
 *   - Development: `http://localhost:5173`
 *   - Production: `https://grainlify.com`
 * 
 * ## Usage
 * 
 * ```typescript
 * import { API_BASE_URL } from '@/shared/config/api';
 * 
 * // Make API request
 * const response = await fetch(`${API_BASE_URL}/projects`);
 * ```
 * 
 * ## Security Note
 * 
 * Environment variables prefixed with `VITE_` are exposed to the browser and should NOT
 * contain sensitive secrets. Backend secrets (OAuth client secrets, admin tokens) must
 * remain server-side only.
 * 
 * @module shared/config/api
 */

/**
 * Backend API base URL
 * 
 * Source of truth for all backend API requests. This value comes from the
 * `VITE_API_BASE_URL` environment variable.
 * 
 * **Default:** `http://localhost:8080` (for development)
 * 
 * @example
 * ```typescript
 * import { API_BASE_URL } from '@/shared/config/api';
 * 
 * // Fetch user profile
 * const response = await fetch(`${API_BASE_URL}/profile`, {
 *   headers: {
 *     'Authorization': `Bearer ${token}`
 *   }
 * });
 * ```
 * 
 * @constant
 * @type {string}
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Frontend base URL
 * 
 * Used for constructing OAuth callback URLs and other frontend-specific URLs.
 * Defaults to the current browser origin if not specified.
 * 
 * **Default:** `window.location.origin`
 * 
 * @example
 * ```typescript
 * import { FRONTEND_BASE_URL } from '@/shared/config/api';
 * 
 * // Construct callback URL
 * const callbackUrl = `${FRONTEND_BASE_URL}/auth/callback`;
 * ```
 * 
 * @constant
 * @type {string}
 */
export const FRONTEND_BASE_URL = import.meta.env.VITE_FRONTEND_BASE_URL || window.location.origin;

/**
 * OAuth callback URL
 * 
 * The URL where GitHub OAuth will redirect users after authentication.
 * The backend uses this URL to redirect users back to the frontend with a JWT token.
 * 
 * The callback page (`/auth/callback`) extracts the token from the URL query parameter
 * and stores it in localStorage under the key `patchwork_jwt`.
 * 
 * **Format:** `{FRONTEND_BASE_URL}/auth/callback`
 * 
 * **Security Note:** The JWT is stored in localStorage, which is vulnerable to XSS attacks.
 * For production, consider using httpOnly cookies for enhanced security.
 * 
 * @example
 * ```typescript
 * import { OAUTH_CALLBACK_URL } from '@/shared/config/api';
 * 
 * // Backend redirects here after OAuth: /auth/callback?token=<jwt>
 * console.log(OAUTH_CALLBACK_URL); // http://localhost:5173/auth/callback
 * ```
 * 
 * @constant
 * @type {string}
 * @see {@link AuthCallbackPage} The component that handles this callback
 */
export const OAUTH_CALLBACK_URL = `${FRONTEND_BASE_URL}/auth/callback`;