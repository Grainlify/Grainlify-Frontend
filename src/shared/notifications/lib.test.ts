import { describe, it, expect } from 'vitest'
import {
  CONTROLS_THRESHOLD,
  groupByDate,
  formatStamp,
  matchesQuery,
  notificationsPagePath,
  linkLabel,
} from './lib'
import type { AppNotification } from '../api/client'

const at = (iso: string, over: Partial<AppNotification> = {}): AppNotification =>
  ({
    id: iso, type: 'kyc_reset', title: 't', body: 'b',
    link_path: null, read_at: null, created_at: iso, ...over,
  }) as AppNotification

describe('groupByDate', () => {
  // Fixed instant so the boundaries are examined rather than approached.
  const now = new Date('2026-08-20T09:00:00Z')

  it('puts today, this week and earlier in that order and skips empty groups', () => {
    const groups = groupByDate(
      [
        at('2026-08-20T08:00:00Z'),
        at('2026-08-17T08:00:00Z'),
        at('2026-06-01T08:00:00Z'),
      ],
      now
    )
    expect(groups.map((g) => g.label)).toEqual(['Today', 'This week', 'Earlier'])

    const onlyToday = groupByDate([at('2026-08-20T08:00:00Z')], now)
    expect(onlyToday.map((g) => g.label)).toEqual(['Today'])
  })

  /** "Today" is the calendar day, not the last 24 hours.
   *
   *  Something from 11pm last night is yesterday at 1am — a rolling window
   *  would keep calling it "today" for another twenty-three hours, which is not
   *  what the word means to the person reading it.
   */
  it('treats today as a calendar day, not a rolling 24 hours', () => {
    // Built in LOCAL time on purpose. The grouping is local-calendar by design
    // - it is what the reader's own "today" means - so UTC instants would make
    // this assertion pass or fail on the runner's timezone rather than on the
    // behaviour. 23:30 last night, read at 01:00 this morning: ninety minutes
    // ago, and not today.
    const lateLastNight = new Date(2026, 7, 19, 23, 30)
    const groups = groupByDate(
      [at(lateLastNight.toISOString())],
      new Date(2026, 7, 20, 1, 0)
    )
    expect(groups[0].label).toBe('This week')
  })

  it('keeps every notification exactly once', () => {
    const items = [
      at('2026-08-20T08:00:00Z'), at('2026-08-19T08:00:00Z'), at('2026-01-01T08:00:00Z'),
    ]
    const flat = groupByDate(items, now).flatMap((g) => g.items)
    expect(flat).toHaveLength(items.length)
    expect(new Set(flat.map((n) => n.id)).size).toBe(items.length)
  })
})

describe('matchesQuery', () => {
  const n = at('2026-08-20T08:00:00Z', { title: 'Verification reset', body: 'Photograph the original' })

  it('matches title and body, case-insensitively', () => {
    expect(matchesQuery(n, 'VERIFICATION')).toBe(true)
    expect(matchesQuery(n, 'photograph')).toBe(true)
    expect(matchesQuery(n, 'nothing here')).toBe(false)
  })

  it('an empty query matches everything', () => {
    expect(matchesQuery(n, '   ')).toBe(true)
  })

  /** Not the type string. Matching it would let "kyc" hit a row whose visible
   *  text contains no such word, which reads as a broken search. */
  it('does not match the type, which is not on screen', () => {
    expect(matchesQuery(n, 'kyc_reset')).toBe(false)
  })

  it('survives a missing body', () => {
    expect(matchesQuery(at('2026-08-20T08:00:00Z', { body: undefined }), 'anything')).toBe(false)
    expect(matchesQuery(at('2026-08-20T08:00:00Z', { body: '' }), 'anything')).toBe(false)
  })
})

describe('notificationsPagePath', () => {
  // The canonical URL, not the /notifications alias: an internal link should
  // not take a redirect hop to reach its own surface.
  it('is the dashboard tab, not the alias', () => {
    expect(notificationsPagePath()).toBe('/dashboard?tab=notifications')
    expect(notificationsPagePath()).not.toContain('/notifications?')
  })

  it('anchors at one notification when given an id', () => {
    expect(notificationsPagePath('abc')).toBe('/dashboard?tab=notifications&n=abc')
  })

  it('encodes an id that would otherwise break the query string', () => {
    expect(notificationsPagePath('a&b=c')).toBe('/dashboard?tab=notifications&n=a%26b%3Dc')
  })
})

describe('formatStamp', () => {
  /** Absolute, deliberately. A relative "2 minutes ago" needs a timer to stay
   *  honest, and a page left open renders a stale one indefinitely. */
  it('is absolute rather than relative', () => {
    const s = formatStamp('2026-08-16T15:04:00Z')
    expect(s).toContain('2026')
    expect(s).not.toMatch(/ago|just now/i)
  })
})

describe('linkLabel', () => {
  it('names the destination rather than saying View', () => {
    expect(linkLabel('kyc_reset')).toBe('Go to verification')
    expect(linkLabel('founding_position')).toBe('Go to rewards')
    expect(linkLabel('pr_merged')).toBe('Go to the project')
  })

  it('falls back to something honest for a type added later', () => {
    expect(linkLabel('grainhack_assigned')).toBe('Open')
  })
})

describe('CONTROLS_THRESHOLD', () => {
  // Derived from one viewport at the tightened row height, not fitted to the
  // current distribution — the distribution moves and the viewport does not.
  it('is a small single-digit count', () => {
    expect(CONTROLS_THRESHOLD).toBeGreaterThan(3)
    expect(CONTROLS_THRESHOLD).toBeLessThan(15)
  })
})
