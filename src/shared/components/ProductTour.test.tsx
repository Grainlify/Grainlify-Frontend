import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../test/renderWithProviders'
import { ProductTour, type TourStep } from './ProductTour'

// Real AnimatePresence keeps the outgoing step's card mounted for its exit
// transition, so the previous and next steps briefly coexist in the DOM after
// every click - not a race worth chasing in jsdom (prefers-reduced-motion is
// mocked to `false` in test/setup.ts, so the animation always actually runs).
// Stripping motion down to plain elements makes step changes atomic instead.
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, variants, ...rest }: any) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const STEPS: TourStep[] = [
  { targetId: 'center', title: 'Welcome to Grainlify!', description: 'Quick look around.' },
  { targetId: 'discover', title: 'Discover', description: 'Your personalized feed.' },
  { targetId: 'browse', title: 'Browse', description: 'Explore every project yourself.' },
]

// ProductTour looks up its target via document.querySelector('[data-tour-id="…"]'),
// so tests render a stand-in nav rail alongside it - exactly what Dashboard.tsx
// provides in the real app.
function renderWithNavRail(steps: TourStep[], onDone: () => void) {
  return renderWithProviders(
    <div>
      <button data-tour-id="discover">Discover nav button</button>
      <button data-tour-id="browse">Browse nav button</button>
      <ProductTour steps={steps} onDone={onDone} />
    </div>,
  )
}

describe('ProductTour', () => {
  it('shows the first step, centered, when its targetId is "center"', () => {
    renderWithNavRail(STEPS, vi.fn())

    expect(screen.getByText('Welcome to Grainlify!')).toBeInTheDocument()
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Skip tour' })).toBeInTheDocument()
  })

  it('advances through steps on Next and shows "Get started" on the last one', async () => {
    const user = userEvent.setup()
    renderWithNavRail(STEPS, vi.fn())

    await user.click(screen.getByRole('button', { name: /Next/i }))
    expect(screen.getByText('Discover')).toBeInTheDocument()
    expect(screen.getByText('2 of 3')).toBeInTheDocument()
    // "Back" replaces "Skip tour" once past the first step.
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Next/i }))
    expect(screen.getByText('Browse')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Get started/i })).toBeInTheDocument()
  })

  it('goes back a step on Back', async () => {
    const user = userEvent.setup()
    renderWithNavRail(STEPS, vi.fn())

    await user.click(screen.getByRole('button', { name: /Next/i }))
    expect(screen.getByText('Discover')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Welcome to Grainlify!')).toBeInTheDocument()
  })

  it('calls onDone when "Skip tour" is clicked on the first step', async () => {
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithNavRail(STEPS, onDone)

    await user.click(screen.getByRole('button', { name: 'Skip tour' }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('calls onDone when the close (X) button is clicked mid-tour', async () => {
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithNavRail(STEPS, onDone)

    await user.click(screen.getByRole('button', { name: /Next/i }))
    await user.click(screen.getByRole('button', { name: 'Close tour' }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('calls onDone when "Get started" is clicked on the last step', async () => {
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithNavRail(STEPS, onDone)

    await user.click(screen.getByRole('button', { name: /Next/i }))
    await user.click(screen.getByRole('button', { name: /Next/i }))
    await user.click(screen.getByRole('button', { name: /Get started/i }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('calls onDone on Escape', async () => {
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithNavRail(STEPS, onDone)

    await user.keyboard('{Escape}')
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('auto-skips a step whose target element is not mounted (e.g. a role-gated nav item)', async () => {
    const stepsWithMissingTarget: TourStep[] = [
      { targetId: 'maintainers', title: 'Maintainers', description: 'Not mounted in this render.' },
      { targetId: 'browse', title: 'Browse', description: 'Explore every project yourself.' },
    ]

    renderWithNavRail(stepsWithMissingTarget, vi.fn())

    // "maintainers" has no matching [data-tour-id] in this render, so the tour
    // should land directly on "Browse" instead of getting stuck pointing at nothing.
    // The skip itself happens inside an effect, so it lands a tick after mount.
    expect(await screen.findByText('Browse')).toBeInTheDocument()
    expect(screen.queryByText('Maintainers')).not.toBeInTheDocument()
  })
})
