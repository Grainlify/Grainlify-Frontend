/// <reference types="vite/client" />

/**
 * Environment variables exposed to the browser (prefixed with `VITE_`).
 *
 * **Security:** Only public, non-secret variables are declared here. Never add
 * server-only secrets (API keys, auth tokens, etc.) — they are exposed to the
 * client bundle and visible in the browser.
 *
 * @see https://vite.dev/guide/env-and-mode
 */
interface ImportMetaEnv {
  /**
   * Backend API base URL.
   * - Development: `http://localhost:8080`
   * - Production:  `https://api.grainlify.com`
   */
  readonly VITE_API_BASE_URL: string

  /**
   * Frontend base URL (optional — defaults to `window.location.origin`).
   * - Development: `http://localhost:5173`
   * - Production:  `https://grainlify.com`
   */
  readonly VITE_FRONTEND_BASE_URL?: string
}

/**
 * Augment Vite's `ImportMeta` so `import.meta.env` is typed with our
 * project-specific `ImportMetaEnv`.
 */
interface ImportMeta {
  readonly env: ImportMetaEnv
}
