import { describe, it, expect } from 'vitest'
import { PRELOAD_ROUTES } from './preloadRoutes'

// Which page's chunks an address gets, the way the injected script decides:
// pathname + search, first match wins.
const routeFor = (url: string) => {
  const u = new URL(url, 'https://grainlify.com')
  const route = PRELOAD_ROUTES.find((r) => r.match.test(u.pathname + u.search))
  return route?.modules[route.modules.length - 1]?.split('/').pop() ?? null
}

describe('route preload table', () => {
  it.each([
    ['/dashboard', 'DiscoverPage.tsx'],
    ['/dashboard/', 'DiscoverPage.tsx'],
    ['/dashboard?tab=discover', 'DiscoverPage.tsx'],
    ['/dashboard?ref=x', 'DiscoverPage.tsx'],
    ['/dashboard?tab=bounties', 'BountiesTab.tsx'],
    ['/dashboard?view=admin&tab=bounties', 'BountiesTab.tsx'],
    ['/bounties', 'BountiesTab.tsx'],
    ['/dashboard?tab=leaderboard', 'index.ts'],
    ['/dashboard?tab=discovery', 'index.ts'],
    ['/bounties/link', 'WalletLinkPage.tsx'],
    ['/signin', 'index.ts'],
    ['/signin?returnTo=%2Fdashboard', 'index.ts'],
    ['/auth/callback?code=1', 'index.ts'],
    ['/docs', 'DocsPage.tsx'],
    ['/docs/contributors/grainhack', 'DocsPage.tsx'],
    ['/support', 'SupportRoutePage.tsx'],
  ])('%s preloads %s', (url, file) => {
    expect(routeFor(url)).toBe(file)
  })

  it.each(['/', '/bounties/rules', '/bounties/ledger', '/docsx', '/signinx', '/nowhere'])('%s preloads nothing', (url) => {
    expect(routeFor(url)).toBeNull()
  })

  it('sends signed-out visitors to protected pages the sign-in chunk instead', () => {
    for (const r of PRELOAD_ROUTES.filter((r) => r.modules.some((m) => m.includes('dashboard') || m.includes('WalletLink')))) {
      expect(r.signedOutModules).toEqual(['src/features/auth/index.ts'])
    }
  })
})
