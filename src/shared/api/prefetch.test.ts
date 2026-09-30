import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prefetch, takePrefetched, prefetchForLocation, clearPrefetched, PREFETCH_KEYS } from './prefetch'
import { getRecommendedProjects } from './client'
import { getBounties } from './bountyAgent'

vi.mock('./client', () => ({ getRecommendedProjects: vi.fn(() => Promise.resolve({ projects: [] })) }))
vi.mock('./bountyAgent', () => ({ getBounties: vi.fn(() => Promise.resolve({ status: null, bounties: [] })) }))

const at = (url: string) => {
  const u = new URL(url, 'https://grainlify.com')
  return { pathname: u.pathname, search: u.search }
}

describe('prefetch', () => {
  beforeEach(() => {
    clearPrefetched()
    vi.mocked(getRecommendedProjects).mockClear()
    vi.mocked(getBounties).mockClear()
    localStorage.setItem('patchwork_jwt', 'token')
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('hands the request already in flight to the page, once', async () => {
    const load = vi.fn(() => Promise.resolve('answer'))
    prefetch('k', load)
    await expect(takePrefetched('k', load)).resolves.toBe('answer')
    expect(load).toHaveBeenCalledTimes(1)

    // A retry or refresh is a new request, never the old answer again.
    await takePrefetched('k', load)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('does not hand over an answer older than 30 seconds', async () => {
    vi.useFakeTimers()
    const load = vi.fn(() => Promise.resolve('answer'))
    prefetch('k', load)
    vi.advanceTimersByTime(30_001)
    await takePrefetched('k', load)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('passes a failure to the page that takes it, and nowhere else', async () => {
    const load = vi.fn(() => Promise.reject(new Error('down')))
    prefetch('k', load)
    await expect(takePrefetched('k', load)).rejects.toThrow('down')
  })

  it('starts Discover\'s projects for a bare /dashboard and for ?tab=discover', () => {
    prefetchForLocation(at('/dashboard'))
    expect(getRecommendedProjects).toHaveBeenCalledWith(50)
    clearPrefetched()
    prefetchForLocation(at('/dashboard?tab=discover'))
    expect(getRecommendedProjects).toHaveBeenCalledTimes(2)
  })

  it('starts the bounty list for the Bounties tab and its /bounties alias', () => {
    prefetchForLocation(at('/dashboard?tab=bounties'))
    clearPrefetched()
    prefetchForLocation(at('/bounties'))
    expect(getBounties).toHaveBeenCalledTimes(2)
    expect(getRecommendedProjects).not.toHaveBeenCalled()
  })

  it('fetches nothing for other pages', () => {
    for (const url of ['/', '/signin', '/docs', '/dashboard?tab=leaderboard', '/bounties/link']) prefetchForLocation(at(url))
    expect(getRecommendedProjects).not.toHaveBeenCalled()
    expect(getBounties).not.toHaveBeenCalled()
  })

  it('fetches nothing for a signed-out visitor, who is on the way to sign-in', () => {
    localStorage.removeItem('patchwork_jwt')
    prefetchForLocation(at('/dashboard'))
    prefetchForLocation(at('/dashboard?tab=bounties'))
    expect(getRecommendedProjects).not.toHaveBeenCalled()
    expect(getBounties).not.toHaveBeenCalled()
  })

  it('uses the key the pages take by', () => {
    prefetchForLocation(at('/dashboard'))
    const load = vi.fn()
    void takePrefetched(PREFETCH_KEYS.recommendedProjects, load)
    expect(load).not.toHaveBeenCalled()
  })
})
