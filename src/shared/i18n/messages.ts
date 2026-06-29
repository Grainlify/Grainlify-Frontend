/**
 * @packageDocumentation
 * Message catalog for the application's internationalization (i18n) layer.
 *
 * The catalog is a flat map of dot-namespaced keys to English source strings.
 * English (`en`) is the base locale and the single source of truth: every key
 * the UI can render MUST exist here. Future locales are layered on top of `en`
 * (see {@link resolveMessages}), so any key missing from another locale
 * transparently falls back to its English value.
 *
 * ## Adding a key
 * 1. Add `'namespace.key': 'English text'` to {@link en} below.
 * 2. The {@link MessageId} union updates automatically — no extra wiring.
 * 3. Use it via `useTranslation().t('namespace.key')` (type-checked) or
 *    `<FormattedMessage id="namespace.key" />`.
 */

/**
 * Supported locale codes. English is the base/default locale; add new codes
 * here as their catalogs are introduced.
 */
export type Locale = 'en' | 'es'

/** The default (and base) locale used as the fallback for every key. */
export const DEFAULT_LOCALE: Locale = 'en'

/**
 * Every supported locale paired with a human-readable display name, in the
 * order they should appear in the locale switcher. The single source of truth
 * for "which locales exist", used both to render the selector and to validate
 * any persisted locale before it is applied.
 */
export const LOCALES: ReadonlyArray<{ code: Locale; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const

/**
 * Narrows an arbitrary value to a supported {@link Locale}. Used to validate
 * persisted / user-supplied locale codes before they are applied, so unknown
 * values can never reach the IntlProvider (they resolve to `en`).
 *
 * @param value - Any value (e.g. a string read from `localStorage`).
 * @returns `true` if `value` is one of the supported locale codes.
 */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.some((l) => l.code === value)
}

/**
 * English message catalog — the base locale and source of truth for every key.
 *
 * Keys are dot-namespaced by surface so the two distinct navigations never
 * collide:
 * - `landingNav.*` — the public landing-page top navbar (section links + CTAs),
 *   extracted from `src/features/landing/components/Navbar.tsx`.
 * - `dashboardNav.*` — the authenticated dashboard sidebar navigation,
 *   extracted from `src/features/dashboard/DashboardLayout.tsx`.
 * - `auth.signin.*` — the sign-in page's static OAuth labels, consent copy,
 *   and navigation links. Values are static strings only; no markup or
 *   untrusted interpolation is allowed in this namespace.
 * - `auth.signup.*` — the sign-up page's static OAuth labels, access summary,
 *   legal-link text, and navigation links. Legal links compose adjacent static
 *   messages in JSX rather than using rich-text interpolation.
 * - `invoices.*` — the billing invoices tab's section copy, table labels,
 *   empty state, row actions, status labels, and fallback download error.
 *   Dynamic invoice data stays outside the catalog and is rendered as escaped
 *   React text.
 *
 * `as const` keeps every value a string literal so {@link MessageId} can be
 * derived from the keys with full type-safety.
 */
export const en = {
  // ── Landing navbar — src/features/landing/components/Navbar.tsx ──
  'landingNav.features': 'Features',
  'landingNav.howItWorks': 'How it Works',
  'landingNav.whyChooseUs': 'Why Choose Us',
  'landingNav.testimonials': 'Testimonials',
  'landingNav.dashboard': 'Dashboard',
  'landingNav.signOut': 'Sign Out',
  'landingNav.getStarted': 'Get Started',

  // ── Dashboard sidebar — src/features/dashboard/DashboardLayout.tsx ──
  'dashboardNav.discover': 'Discover',
  'dashboardNav.browse': 'Browse',
  'dashboardNav.openSourceWeek': 'Open-Source Week',
  'dashboardNav.ecosystems': 'Ecosystems',
  'dashboardNav.maintainers': 'Maintainers',
  'dashboardNav.contributors': 'Contributors',
  'dashboardNav.data': 'Data',
  'dashboardNav.leaderboard': 'Leaderboard',
  'dashboardNav.blog': 'Grainlify Blog',

  // ── Sign-in auth page — src/features/auth/pages/SignInPage.tsx ──
  'auth.signin.backToHome': 'Back to Home',
  'auth.signin.title': 'Welcome Back',
  'auth.signin.subtitle': 'Sign in with your GitHub account',
  'auth.signin.redirecting': 'Redirecting...',
  'auth.signin.githubButton': 'Sign in with GitHub',
  'auth.signin.oauthSecurity': 'Secure authentication via GitHub OAuth',
  'auth.signin.consentDisclaimer':
    'By signing in, you agree to share your public GitHub profile information. We never access your private repositories without explicit permission.',
  'auth.signin.signupPrompt': "Don't have an account?",
  'auth.signin.signupLink': 'Sign Up',

  // ── Sign-up auth page — src/features/auth/pages/SignUpPage.tsx ──
  'auth.signup.backToHome': 'Back to Home',
  'auth.signup.title': 'Get Started',
  'auth.signup.subtitle': 'Create your account with GitHub',
  'auth.signup.redirecting': 'Redirecting...',
  'auth.signup.githubButton': 'Sign up with GitHub',
  'auth.signup.oauthSecurity': 'Secure authentication via GitHub OAuth',
  'auth.signup.accessHeading': "What we'll access:",
  'auth.signup.accessPublicProfile': 'Your public profile information',
  'auth.signup.accessPublicRepositories': 'Your public repositories and contributions',
  'auth.signup.accessActivity': 'Your GitHub activity for matching projects',
  'auth.signup.privateReposDisclaimer':
    'We never access private repositories without your explicit permission.',
  'auth.signup.termsPrefix': 'By continuing, you agree to our',
  'auth.signup.termsOfService': 'Terms of Service',
  'auth.signup.termsConnector': 'and',
  'auth.signup.privacyPolicy': 'Privacy Policy',
  'auth.signup.signinPrompt': 'Already have an account?',
  'auth.signup.signinLink': 'Sign In',

  // ── Billing invoices tab — src/features/settings/components/billing/InvoicesTab.tsx ──
  'invoices.title': 'Invoices',
  'invoices.description': 'View and download your billing invoices.',
  'invoices.table.invoice': 'Invoice',
  'invoices.table.date': 'Date',
  'invoices.table.amount': 'Amount',
  'invoices.table.period': 'Period',
  'invoices.table.status': 'Status',
  'invoices.table.action': 'Action',
  'invoices.empty.title': 'No invoices yet',
  'invoices.empty.description': 'Your billing invoices will appear here',
  'invoices.actions.downloadInvoice': 'Download Invoice',
  'invoices.actions.downloading': 'Downloading…',
  'invoices.status.paid': 'paid',
  'invoices.status.pending': 'pending',
  'invoices.status.overdue': 'overdue',
  'invoices.errors.downloadFailed': 'Download failed. Please try again.',
} as const

/**
 * Union of every valid message key, derived from the {@link en} catalog. Using
 * this type for lookups turns a typo into a compile-time error instead of a
 * silent missing-translation at runtime.
 */
export type MessageId = keyof typeof en

/** Shape of a fully-populated message catalog for a single locale. */
export type Messages = Record<MessageId, string>

/**
 * Spanish message catalog — an intentionally partial stub. Only a handful of
 * keys are translated; everything else transparently falls back to {@link en}
 * via {@link resolveMessages}. This demonstrates the multi-locale machinery and
 * gives the locale switcher something to switch to.
 */
export const es: Partial<Messages> = {
  'landingNav.features': 'Características',
  'landingNav.getStarted': 'Comenzar',
  'dashboardNav.discover': 'Descubrir',
  'dashboardNav.browse': 'Explorar',
  'dashboardNav.leaderboard': 'Clasificación',
}

/**
 * Per-locale message catalogs. `en` is always present and complete; future
 * locales may be partial and inherit any missing keys from `en` via
 * {@link resolveMessages}.
 */
export const catalogs: Record<Locale, Partial<Messages>> = {
  en,
  es,
}

/**
 * Resolves the effective message map for `locale`, layered on top of the base
 * English catalog so that any key missing from `locale` falls back to its
 * English value. This is the mechanism behind "missing-key → English" and the
 * reason `en` must stay complete.
 *
 * @param locale - Target locale code. Unknown locales resolve to `en` only.
 * @param registry - Catalog registry to resolve from (injectable for testing;
 *   defaults to the module-level {@link catalogs}).
 * @returns A complete message map with English as the guaranteed fallback.
 *
 * @example
 * resolveMessages('en')['dashboardNav.discover']; // 'Discover'
 */
export function resolveMessages(
  locale: Locale = DEFAULT_LOCALE,
  registry: Record<string, Partial<Messages>> = catalogs
): Messages {
  return { ...en, ...(registry[locale] ?? {}) }
}
