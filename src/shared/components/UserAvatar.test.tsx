import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getUserInitials, UserAvatar } from './UserAvatar'

describe('getUserInitials', () => {
  it('uses the first letters of the first two words in a display name', () => {
    expect(getUserInitials('Ada Lovelace', 'octocat')).toBe('AL')
  })

  it('ignores extra whitespace between display-name words', () => {
    expect(getUserInitials('  Grace   Hopper  ', 'grace')).toBe('GH')
  })

  it('uses the first two characters of a single-word display name', () => {
    expect(getUserInitials('ada', 'octocat')).toBe('AD')
  })

  it('uses a single-word login when the display name is empty', () => {
    expect(getUserInitials('', 'octocat')).toBe('OC')
  })

  it('returns a neutral initial when no identity is available', () => {
    expect(getUserInitials()).toBe('?')
    expect(getUserInitials('  ', '')).toBe('?')
  })

  it('recognizes underscores and hyphens as word separators', () => {
    expect(getUserInitials('ada_lovelace')).toBe('AL')
    expect(getUserInitials('grace-hopper')).toBe('GH')
  })
})

describe('UserAvatar', () => {
  it('renders an accessible initials fallback when no source is provided', () => {
    render(<UserAvatar name="Ada Lovelace" size="large" />)

    expect(screen.getByLabelText('Ada Lovelace avatar fallback')).toHaveTextContent('AL')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders an image with an accessible name and the provided source', () => {
    render(
      <UserAvatar src="https://example.test/ada.png" name="Ada Lovelace" login="ada" size="small" />
    )

    expect(screen.getByRole('img', { name: 'Ada Lovelace avatar' })).toHaveAttribute(
      'src',
      'https://example.test/ada.png'
    )
  })

  it('uses a generic accessible name when image identity is unavailable', () => {
    render(<UserAvatar src="https://example.test/user.png" size="small" />)

    expect(screen.getByRole('img', { name: 'User avatar' })).toHaveAttribute(
      'src',
      'https://example.test/user.png'
    )
  })

  it('replaces an image with the initials fallback when loading fails', () => {
    render(<UserAvatar src="https://example.test/broken.png" name="Ada Lovelace" size="small" />)

    fireEvent.error(screen.getByRole('img', { name: 'Ada Lovelace avatar' }))

    expect(screen.getByLabelText('Ada Lovelace avatar fallback')).toHaveTextContent('AL')
    expect(screen.queryByRole('img', { name: 'Ada Lovelace avatar' })).not.toBeInTheDocument()
  })

  it.each([
    ['small', ['w-7', 'h-7', 'text-[10px]']],
    ['large', ['w-12', 'h-12', 'text-sm']],
  ] as const)('applies the %s size classes', (size, expectedClasses) => {
    render(<UserAvatar login="octocat" size={size} />)

    expect(screen.getByLabelText('octocat avatar fallback')).toHaveClass(...expectedClasses)
  })

  it('retries the image when the source changes after a loading failure', () => {
    const { rerender } = render(
      <UserAvatar src="https://example.test/broken.png" name="Ada Lovelace" size="small" />
    )

    fireEvent.error(screen.getByRole('img', { name: 'Ada Lovelace avatar' }))
    expect(screen.getByLabelText('Ada Lovelace avatar fallback')).toBeInTheDocument()

    rerender(
      <UserAvatar src="https://example.test/replacement.png" name="Ada Lovelace" size="small" />
    )

    expect(screen.getByRole('img', { name: 'Ada Lovelace avatar' })).toHaveAttribute(
      'src',
      'https://example.test/replacement.png'
    )
    expect(screen.queryByLabelText('Ada Lovelace avatar fallback')).not.toBeInTheDocument()
  })
})
