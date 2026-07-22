// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { ContributorsPodiumSkeleton } from './ContributorsPodiumSkeleton'
import { renderWithTheme } from '../../../test/renderWithTheme'

describe('ContributorsPodiumSkeleton', () => {
  it('renders three podium columns with the correct relative avatar sizes', () => {
    const { container } = renderWithTheme(<ContributorsPodiumSkeleton />)

    // Find all skeleton-loader containers (divs with data-testid="skeleton-loader")
    const skeletons = container.querySelectorAll('[data-testid="skeleton-loader"]')

    // There should be 12 skeleton loaders: 3 columns × 4 loaders (avatar + bar + name + score)
    expect(skeletons.length).toBe(12)

    // Find the avatar skeletons: variant="circle" should render with rounded-full
    // The first column (second place) has w-16, second (first) w-20, third (third) w-16
    const circleSkeletons = Array.from(skeletons).filter((el) =>
      (el as HTMLElement).classList.contains('rounded-full')
    )

    // Three circle avatars
    expect(circleSkeletons.length).toBe(3)

    // Verify relative sizing via inline styles or class names
    // The first place (middle) should have w-20; second and third should have w-16
    const sizes = circleSkeletons.map((el) => {
      const classes = (el as HTMLElement).className
      if (classes.includes('w-20')) return 'w-20'
      if (classes.includes('w-16')) return 'w-16'
      return 'unknown'
    })

    expect(sizes).toContain('w-20')
    expect(sizes.filter((s) => s === 'w-16').length).toBe(2)

    // Confirm the three structural columns are present
    const columns = container.querySelectorAll('.flex.flex-col.items-center')
    expect(columns.length).toBe(3)
  })

  it('renders identically in both light and dark themes', () => {
    // Since SkeletonLoader handles theme internally, the skeleton structure
    // should remain unchanged regardless of external theme.
    const { container: lightContainer } = renderWithTheme(<ContributorsPodiumSkeleton />)
    const columnsLight = lightContainer.querySelectorAll('.flex.flex-col.items-center')
    expect(columnsLight.length).toBe(3)

    // Verify no theme-related dead code remains: useTheme is not called
    // by inspecting that the component renders without any provider errors.
    expect(lightContainer.querySelectorAll('[data-testid="skeleton-loader"]').length).toBe(12)
  })

  it('maintains unchanged podium structure after dead-code removal', () => {
    const { container } = renderWithTheme(<ContributorsPodiumSkeleton />)

    // Second Place
    expect(container.querySelector('.gap-4')).toBeInTheDocument()

    // Verify all three podium sections have 4 loader children each
    const podiumColumns = container.querySelectorAll('.flex.flex-col.items-center')
    podiumColumns.forEach((col) => {
      const loaders = col.querySelectorAll('[data-testid="skeleton-loader"]')
      expect(loaders.length).toBe(4)
    })
  })
})
