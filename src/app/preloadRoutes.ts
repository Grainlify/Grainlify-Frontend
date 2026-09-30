/**
 * Which chunks each address needs first - read by the route-preload build
 * step (./routePreload.ts). Tested against real addresses in
 * preloadRoutes.test.ts, since a pattern that stops matching fails silently:
 * the page still works, just a round trip slower.
 *
 * First match wins, so the specific dashboard tabs come before the rest of
 * the dashboard.
 */
import type { PreloadRoute } from './routePreload'

const signIn = ['src/features/auth/index.ts']

export const PRELOAD_ROUTES: PreloadRoute[] = [
  {
    // A bare /dashboard is Discover, as is any URL without a ?tab=.
    match: /^\/dashboard\/?(\?(?!(.*&)?tab=)[^#]*)?$|^\/dashboard\/?\?(.*&)?tab=discover(&|$)/,
    modules: ['src/features/dashboard/index.ts', 'src/features/dashboard/pages/DiscoverPage.tsx'],
    signedOutModules: signIn,
  },
  {
    match: /^\/dashboard\/?\?(.*&)?tab=bounties(&|$)|^\/bounties\/?$/,
    modules: ['src/features/dashboard/index.ts', 'src/features/bounties/pages/BountiesTab.tsx'],
    signedOutModules: signIn,
  },
  { match: /^\/dashboard/, modules: ['src/features/dashboard/index.ts'], signedOutModules: signIn },
  { match: /^\/bounties\/link/, modules: ['src/features/bounties/pages/WalletLinkPage.tsx'], signedOutModules: signIn },
  { match: /^\/(signin|signup|auth\/callback)\/?(\?|$)/, modules: ['src/features/auth/index.ts'] },
  { match: /^\/docs(\/|\?|$)/, modules: ['src/features/docs/pages/DocsPage.tsx'] },
  { match: /^\/support\/?(\?|$)/, modules: ['src/features/support/pages/SupportRoutePage.tsx'] },
]
