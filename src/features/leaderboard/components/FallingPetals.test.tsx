// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FallingPetals } from './FallingPetals'
import { Petal } from '../types'

function makeMediaQuery(matches: boolean) {
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
}

function mockMatchMedia(matches: boolean) {
  const mql = makeMediaQuery(matches)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  })
  return mql as unknown as MediaQueryList
}

const petals: Petal[] = [
  {
    id: 1,
    left: 15,
    delay: 0.2,
    duration: 8,
    size: 0.9,
    rotation: 12,
  },
]

describe('FallingPetals', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  it('renders decorative petals when reduced motion is not requested', () => {
    const { container } = render(<FallingPetals petals={petals} />)

    expect(container.firstChild).not.toBeNull()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders nothing when prefers-reduced-motion: reduce is active', () => {
    mockMatchMedia(true)
    const { container } = render(<FallingPetals petals={petals} />)

    expect(container.firstChild).toBeNull()
  })

  it('removes the animation overlay when the OS reduced-motion preference changes at runtime', async () => {
    const mql = mockMatchMedia(false)
    const { container } = render(<FallingPetals petals={petals} />)

    expect(container.querySelector('svg')).toBeInTheDocument()

    const [, handler] = (mql.addEventListener as ReturnType<typeof vi.fn>).mock.calls[0]

    await Promise.resolve()
    handler({ matches: true } as MediaQueryListEvent)

    expect(container.firstChild).toBeNull()
  })
})
