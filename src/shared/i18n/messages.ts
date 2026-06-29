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
export type Locale = 'en'

/** The default (and base) locale used as the fallback for every key. */
export const DEFAULT_LOCALE: Locale = 'en'

/**
 * English message catalog — the base locale and source of truth for every key.
 *
 * Keys are dot-namespaced by surface so the two distinct navigations never
 * collide:
 * - `landingNav.*` — the public landing-page top navbar (section links + CTAs),
 *   extracted from `src/features/landing/components/Navbar.tsx`.
 * - `dashboardNav.*` — the authenticated dashboard sidebar navigation,
 *   extracted from `src/features/dashboard/DashboardLayout.tsx`.
 *
 * `as const` keeps every value a string literal so {@link MessageId} can be
 * derived from the keys with full type-safety.
 */
export const en = {
  // ── Common labels ──
  'common.skipToContent': 'Skip to main content',

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
 * Per-locale message catalogs. `en` is always present and complete; future
 * locales may be partial and inherit any missing keys from `en` via
 * {@link resolveMessages}.
 */
export const catalogs: Record<Locale, Partial<Messages>> = {
  en,
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
