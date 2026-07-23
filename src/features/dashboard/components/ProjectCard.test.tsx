import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { ProjectCard, type Project } from './ProjectCard'
import { ProjectCardSkeleton } from './ProjectCardSkeleton'

const project: Project = {
  id: 42,
  name: 'Grainlify Frontend',
  icon: 'GF',
  stars: '1.2k',
  forks: '88',
  contributors: 12,
  openIssues: 7,
  prs: 4,
  description: 'Open-source contribution dashboard',
  tags: ['React', 'A11y'],
  color: 'from-[#c9983a] to-[#8b6f3a]',
}

describe('ProjectCard', () => {
  it('uses a semantic button that supports pointer and keyboard activation', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    renderWithTheme(<ProjectCard project={project} onClick={onClick} />)

    const card = screen.getByRole('button', {
      name: 'Open Grainlify Frontend project',
    })

    await user.click(card)
    expect(onClick).toHaveBeenLastCalledWith('42')

    onClick.mockClear()
    card.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenLastCalledWith('42')

    onClick.mockClear()
    await user.keyboard(' ')
    expect(onClick).toHaveBeenLastCalledWith('42')
    expect(card).toHaveClass('focus-visible:ring-2')
  })

  it('labels project stats and hides decorative icons from assistive tech', () => {
    renderWithTheme(<ProjectCard project={project} />)

    expect(screen.getByLabelText('Stars: 1.2k')).toHaveTextContent('1.2k')
    expect(screen.getByLabelText('Forks: 88')).toHaveTextContent('88')
    expect(screen.getByLabelText('Contributors: 12')).toHaveTextContent('12')
    expect(screen.getByLabelText('Open issues: 7')).toHaveTextContent('7')
    expect(screen.getByLabelText('Pull requests: 4')).toHaveTextContent('4')

    expect(document.querySelectorAll("svg:not([aria-hidden='true'])")).toHaveLength(0)
  })

  it('does not crash when project data is missing', () => {
    const onClick = vi.fn()

    const { container } = renderWithTheme(
      <ProjectCard project={null as unknown as Project} onClick={onClick} />
    )

    expect(container).toBeEmptyDOMElement()
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('ProjectCard Layout Parity', () => {
  it('skeleton and real card share the same outer container structure', () => {
    const { container: skeletonContainer } = renderWithTheme(<ProjectCardSkeleton />)
    const skeletonElement = skeletonContainer.firstElementChild as HTMLElement

    const { container: cardContainer } = renderWithTheme(<ProjectCard project={project} />)
    const cardElement = cardContainer.firstElementChild as HTMLElement

    // Note: Visual regression testing is ideal here, but asserting shared layout classes
    // is a good unit-test proxy to prevent layout shifts.
    const sharedClasses = [
      'w-full',
      'text-left',
      'backdrop-blur-[30px]',
      'rounded-[18px]',
      'border',
      'p-5',
    ]
    sharedClasses.forEach((cls) => {
      expect(skeletonElement).toHaveClass(cls)
      expect(cardElement).toHaveClass(cls)
    })
  })

  it('maintains layout bounds even with missing optional fields or long wrapping text', () => {
    // Edge case: card with a long title/description wrapping to two lines
    // and missing an optional field (e.g. no tags) vs skeleton's fixed placeholders.
    const edgeCaseProject = {
      ...project,
      name: 'A very very long project name that will likely wrap into multiple lines if the container is narrow enough to force it',
      description:
        'An extremely long description that takes up a lot of vertical space and pushes content down, which might cause layout shift if the skeleton does not account for typical wrapping bounds.',
      tags: [], // missing optional field
    }

    const { container: edgeCardContainer } = renderWithTheme(
      <ProjectCard project={edgeCaseProject} />
    )
    const cardElement = edgeCardContainer.firstElementChild as HTMLElement

    const { container: skeletonContainer } = renderWithTheme(<ProjectCardSkeleton />)
    const skeletonElement = skeletonContainer.firstElementChild as HTMLElement

    // Asserting class structure is maintained despite edge case content
    const sharedClasses = [
      'w-full',
      'text-left',
      'backdrop-blur-[30px]',
      'rounded-[18px]',
      'border',
      'p-5',
    ]
    sharedClasses.forEach((cls) => {
      expect(cardElement).toHaveClass(cls)
      expect(skeletonElement).toHaveClass(cls)
    })

    // Check that tags container is present but empty, verifying structural integrity
    const tagContainer = edgeCardContainer.querySelector('.flex.flex-wrap.gap-1\\.5')
    expect(tagContainer).toBeInTheDocument()
    expect(tagContainer?.children).toHaveLength(0)
  })
})
