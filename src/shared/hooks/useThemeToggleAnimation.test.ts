import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useThemeToggleAnimation } from './useThemeToggleAnimation'

// Minimal fake DOM node satisfying just what the hook reads off ref.current.
function attachFakeRef(
  ref: { current: HTMLButtonElement | null },
  rect: { top: number; left: number; width: number; height: number }
) {
  ref.current = {
    getBoundingClientRect: () => rect,
  } as unknown as HTMLButtonElement
}

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList)
}

// jsdom does not implement the Web Animations API, so document.documentElement.animate
// is typically absent. Stub it in if missing, then spy on it either way.
function spyOnAnimate() {
  if (typeof document.documentElement.animate !== 'function') {
    ;(document.documentElement as unknown as { animate: unknown }).animate = () =>
      ({}) as Animation
  }
  return vi.spyOn(document.documentElement, 'animate').mockReturnValue({} as Animation)
}

describe('useThemeToggleAnimation', () => {
  afterEach(() => {
    delete (document as { startViewTransition?: unknown }).startViewTransition
    vi.restoreAllMocks()
  })

  it('falls back to calling onToggle directly when startViewTransition is unsupported', () => {
    expect(typeof (document as { startViewTransition?: unknown }).startViewTransition).toBe(
      'undefined'
    )
    mockMatchMedia(false)
    const animateSpy = spyOnAnimate()
    const onToggle = vi.fn()
    const { result } = renderHook(() => useThemeToggleAnimation({ onToggle }))
    attachFakeRef(result.current.ref, { top: 100, left: 200, width: 50, height: 40 })

    expect(() => result.current.toggleWithAnimation()).not.toThrow()

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(animateSpy).not.toHaveBeenCalled()
  })

  it('falls back to calling onToggle directly when prefers-reduced-motion matches, even if startViewTransition exists', () => {
    const startViewTransition = vi.fn((cb: () => void) => {
      cb()
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      }
    })
    ;(document as { startViewTransition?: unknown }).startViewTransition = startViewTransition
    mockMatchMedia(true)
    const animateSpy = spyOnAnimate()
    const onToggle = vi.fn()
    const { result } = renderHook(() => useThemeToggleAnimation({ onToggle }))
    attachFakeRef(result.current.ref, { top: 100, left: 200, width: 50, height: 40 })

    result.current.toggleWithAnimation()

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(startViewTransition).not.toHaveBeenCalled()
    expect(animateSpy).not.toHaveBeenCalled()
  })

  it('runs the View Transition animation path when supported and motion is allowed', async () => {
    mockMatchMedia(false)
    const startViewTransition = vi.fn((cb: () => void) => {
      cb()
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      }
    })
    ;(document as { startViewTransition?: unknown }).startViewTransition = startViewTransition
    const animateSpy = spyOnAnimate()

    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })

    const onToggle = vi.fn()
    const { result } = renderHook(() => useThemeToggleAnimation({ onToggle }))
    // Center of this rect is (225, 120), fully deterministic given the mocked
    // rect and window dimensions above.
    attachFakeRef(result.current.ref, { top: 100, left: 200, width: 50, height: 40 })

    result.current.toggleWithAnimation()

    expect(startViewTransition).toHaveBeenCalledTimes(1)
    // The callback passed to startViewTransition calls onToggle synchronously
    // (wrapped in flushSync in the real implementation).
    expect(onToggle).toHaveBeenCalledTimes(1)

    await waitFor(() => expect(animateSpy).toHaveBeenCalledTimes(1))

    const [keyframes, options] = animateSpy.mock.calls[0]
    // The real implementation passes a single property-indexed keyframes
    // object (`{ clipPath: [from, to] }`), not an array of keyframe objects.
    expect(Array.isArray(keyframes)).toBe(false)
    expect(keyframes).toHaveProperty('clipPath')
    const clipPath = (keyframes as { clipPath: string[] }).clipPath
    expect(clipPath).toHaveLength(2)
    expect(clipPath[0]).toBe('circle(0px at 225px 120px)')
    expect(clipPath[1]).toMatch(/^circle\(\d+(\.\d+)?px at 225px 120px\)$/)

    expect(options).toMatchObject({
      duration: 600,
      easing: 'ease-in-out',
      pseudoElement: '::view-transition-new(root)',
    })
  })
})
