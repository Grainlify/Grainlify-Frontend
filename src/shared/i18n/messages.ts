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
 * - `settings.tabs.*` — SettingsPage tab labels,
 *   extracted from `src/features/settings/pages/SettingsPage.tsx`.
 * - `terms.*` — Settings terms tab copy and consent states,
 *   extracted from `src/features/settings/components/terms/TermsTab.tsx`.
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

  // ── Settings tabs — src/features/settings/pages/SettingsPage.tsx ──
  'settings.tabs.profile': 'Profile',
  'settings.tabs.notifications': 'Notifications',
  'settings.tabs.payout': 'Payout Preferences',
  'settings.tabs.billing': 'Billing Profiles',
  'settings.tabs.terms': 'Terms and Conditions',

  // ── Terms settings tab — src/features/settings/components/terms/TermsTab.tsx ──
  'terms.title': 'Terms and Conditions',
  'terms.description': 'Review our terms of service and privacy policy.',
  'terms.service.title': 'Terms of Service',
  'terms.service.bodyPrefix': 'By using Grainlify, you agree to abide by our',
  'terms.service.bodySuffix':
    '. These terms govern your use of the platform and outline your rights and responsibilities as a user.',
  'terms.privacy.title': 'Privacy Policy',
  'terms.privacy.bodyPrefix': 'We take your privacy seriously. Our',
  'terms.privacy.bodySuffix':
    'explains how we collect, use, and protect your personal information.',
  'terms.dataCollection.title': 'Data Collection',
  'terms.dataCollection.body':
    'We collect information necessary to provide our services, including your GitHub profile data, contribution history, and reward preferences.',
  'terms.userResponsibilities.title': 'User Responsibilities',
  'terms.userResponsibilities.body':
    'Users are responsible for maintaining the security of their accounts, providing accurate information, and complying with all applicable laws and regulations.',
  'terms.acceptance.title': 'Accept Terms',
  'terms.acceptance.bodyPrefix': 'By clicking accept, you agree to our',
  'terms.acceptance.bodyConnector': 'and',
  'terms.acceptance.bodySuffix': '.',
  'terms.links.termsOfService': 'terms of service',
  'terms.links.privacyPolicy': 'privacy policy',
  'terms.status.loading': 'Loading terms status…',
  'terms.status.acceptedVersion': '✓ Accepted version {version} on {date}',
  'terms.actions.loading': 'Loading...',
  'terms.actions.accepting': 'Accepting...',
  'terms.actions.accept': 'Accept',
  'terms.actions.accepted': 'Accepted',
  'terms.status.outdated': '⚠️ Terms have been updated to version {current}. Please re-accept.',
  'terms.errors.loadStatusFailed': 'Failed to load terms status.',
  'terms.errors.acceptFailed': 'Failed to accept terms. Please try again.',

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
    'By continuing, you agree to allow Grainlify to access your GitHub public profile and repository activity.',
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

  // ── Maintainers issues empty state — src/features/maintainers/components/issues/EmptyIssueState.tsx ──
  'maintainers.issues.empty.title': 'No open issues yet',
  'maintainers.issues.empty.description':
    'Create or import issues from GitHub so contributors know where they can help next.',
  'maintainers.issues.empty.cta': 'Create an issue on GitHub',
  'maintainers.issues.empty.count':
    '{count, plural, one {# issue available} other {# issues available}}',

  // ── Install GitHub App modal — src/features/maintainers/components/InstallGitHubAppModal.tsx ──
  'maintainers.installGithubApp.cancelledTitle': 'Installation Cancelled',
  'maintainers.installGithubApp.cancelledBody':
    "You cancelled the GitHub App installation. No changes were made to your account. You can retry whenever you're ready.",
  'maintainers.installGithubApp.errorTitle': 'Installation Failed',
  'maintainers.installGithubApp.errorFallbackBody':
    'Failed to complete GitHub App installation. Please try again.',

  // ── Ecosystems page — src/features/dashboard/pages/EcosystemsPage.tsx ──
  'ecosystems.title': 'Explore Ecosystems',
  'ecosystems.subtitle':
    'Discover a wide range of projects shaping the future of open source, each driving revolutionary change.',
  'ecosystems.searchPlaceholder': 'Search ecosystems...',
  'ecosystems.empty.noMatch': 'No ecosystems found matching your search.',
  'ecosystems.empty.none': 'No ecosystems available yet.',
  'ecosystems.filteredCount': '(Filtered from {count} ecosystems)',
  'ecosystems.card.projects': 'Projects',
  'ecosystems.card.contributors': 'Contributors',
  'ecosystems.card.visitWebsite': 'Visit Website',
  'ecosystems.card.unnamed': 'Unnamed Ecosystem',
  'ecosystems.card.noDescription': 'No description available.',
  'ecosystems.request.title': 'Missing Your Ecosystem?',
  'ecosystems.request.description':
    "Don't see your ecosystem in the list? No worries! Request the admin to add it to our platform.",
  'ecosystems.request.button': 'Request Ecosystem Addition',
  'ecosystems.request.modalTitle': 'Request Ecosystem Addition',
  'ecosystems.request.modalSubtitle': "Fill out the form below and we'll review your request",
  'ecosystems.request.nameLabel': 'Your Name',
  'ecosystems.request.namePlaceholder': 'John Doe',
  'ecosystems.request.emailLabel': 'Your Email',
  'ecosystems.request.emailPlaceholder': 'john@example.com',
  'ecosystems.request.ecoNameLabel': 'Ecosystem Name',
  'ecosystems.request.ecoNamePlaceholder': 'e.g., Web3 Ecosystem',
  'ecosystems.request.reasonLabel': 'Why do you want this ecosystem added?',
  'ecosystems.request.reasonPlaceholder':
    'Tell us why this ecosystem would be valuable to the community...',
  'ecosystems.request.infoLabel': 'Additional Information (Optional)',
  'ecosystems.request.infoPlaceholder': "Any other details you'd like to share...",
  'ecosystems.request.cancel': 'Cancel',
  'ecosystems.request.submit': 'Submit Request',
  'ecosystems.request.submitting': 'Submitting…',
  'ecosystems.request.success': 'Request submitted! The admin will review it shortly.',
  'ecosystems.request.error': 'Failed to submit request.',
  'ecosystems.add.modalTitle': 'Add New Ecosystem',
  'ecosystems.add.nameLabel': 'Ecosystem Name',
  'ecosystems.add.namePlaceholder': 'e.g., Web3 Ecosystem',
  'ecosystems.add.descLabel': 'Description',
  'ecosystems.add.descPlaceholder': 'Describe the ecosystem...',
  'ecosystems.add.statusLabel': 'Status',
  'ecosystems.add.statusActive': 'Active',
  'ecosystems.add.statusInactive': 'Inactive',
  'ecosystems.add.urlLabel': 'Website URL',
  'ecosystems.add.urlPlaceholder': 'https://example.com',
  'ecosystems.add.cancel': 'Cancel',
  'ecosystems.add.submit': 'Add Ecosystem',
  'ecosystems.add.submitting': 'Adding…',
  'ecosystems.add.success': 'Ecosystem added successfully!',
  'ecosystems.add.error': 'Failed to add ecosystem.',
  'ecosystems.validation.nameRequired': 'Ecosystem name is required.',
  'ecosystems.validation.descRequired': 'Description is required.',
  'ecosystems.validation.userNameRequired': 'Your name is required.',
  'ecosystems.validation.userEmailRequired': 'Your email is required.',
  'ecosystems.validation.reasonRequired': 'Please tell us why you want this ecosystem added.',

  // ── Ecosystem detail page — src/features/dashboard/pages/EcosystemDetailPage.tsx ──
  'ecosystems.detail.breadcrumb': 'Ecosystems',
  'ecosystems.detail.overview': 'Overview',
  'ecosystems.detail.projects': 'Projects',
  'ecosystems.detail.community': 'Community',
  'ecosystems.detail.ecosystemLabel': '{name} Ecosystem',
  'ecosystems.detail.descriptionLabel': 'Description',
  'ecosystems.detail.noDescription': 'No description provided',
  'ecosystems.detail.languagesLabel': 'Languages',
  'ecosystems.detail.linksLabel': 'Links',
  'ecosystems.detail.noLinks': 'No links available',
  'ecosystems.detail.stats.contributors': 'Active Contributors',
  'ecosystems.detail.stats.projects': 'Active Projects',
  'ecosystems.detail.stats.issues': 'Available Issues',
  'ecosystems.detail.stats.prs': 'Open PRs',
  'ecosystems.detail.about': 'About {name}',
  'ecosystems.detail.keyAreas': 'Key Areas',
  'ecosystems.detail.noKeyAreas': 'No key areas available',
  'ecosystems.detail.technologies': 'Technologies',
  'ecosystems.detail.techDescription': 'Supported technologies for ecosystem projects:',
  'ecosystems.detail.noTechnologies': 'No technologies available',
  'ecosystems.detail.searchPlaceholder': 'Search',
  'ecosystems.detail.categoriesLabel': 'Categories',
  'ecosystems.detail.noProjects': 'No projects in {name} yet',
  'ecosystems.detail.noProjectsDesc': 'Projects added under this ecosystem will appear here.',
  'ecosystems.detail.communitySoon': 'Community view coming soon',

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

  // ── Backend API Error Taxonomy ──
  'errors.generic': 'An unexpected error occurred. Please try again.',
  'errors.code.UNAUTHORIZED': 'Your session has expired. Please sign in again.',
  'errors.code.FORBIDDEN': 'You do not have permission to perform this action.',
  'errors.code.NOT_FOUND': 'The requested resource could not be found.',
  'errors.code.RATE_LIMITED': 'Too many requests. Please try again later.',
  'errors.code.BAD_REQUEST': 'Invalid request parameters. Please check your input and try again.',
  'errors.code.INTERNAL_ERROR': 'Our servers are experiencing issues. Please try again later.',
  'errors.code.SERVICE_UNAVAILABLE': 'Service is temporarily unavailable. Please try again later.',
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
  'errors.generic': 'Ocurrió un error inesperado. Por favor, inténtelo de nuevo.',
  'errors.code.UNAUTHORIZED': 'Su sesión ha expirado. Por favor, inicie sesión de nuevo.',
  'errors.code.FORBIDDEN': 'No tiene permiso para realizar esta acción.',
  'errors.code.NOT_FOUND': 'El recurso solicitado no se pudo encontrar.',
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
