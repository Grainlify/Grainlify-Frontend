import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

describe('ThemeContext', () => {
  beforeEach(() => {
    // useTheme() throwing outside a provider logs a noisy React error boundary
    // message to console.error; keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
    vi.restoreAllMocks()
  })

  it('throws when useTheme is called outside a ThemeProvider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used within a ThemeProvider'
    )
  })

  it('defaults to the light theme when localStorage has no saved theme', () => {
    expect(localStorage.getItem('theme')).toBeNull()

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })

    expect(result.current.theme).toBe('light')
  })

  it('respects a theme already saved in localStorage on mount', () => {
    localStorage.setItem('theme', 'dark')

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })

    expect(result.current.theme).toBe('dark')
  })

  it('toggleTheme flips light -> dark -> light, persisting to localStorage and toggling the "dark" class on <html>', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })

    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    act(() => {
      result.current.toggleTheme()
    })

    await waitFor(() => expect(result.current.theme).toBe('dark'))
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => {
      result.current.toggleTheme()
    })

    await waitFor(() => expect(result.current.theme).toBe('light'))
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('setThemeFromAnimation sets the theme explicitly based on the isDark flag', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })

    act(() => {
      result.current.setThemeFromAnimation(true)
    })
    await waitFor(() => expect(result.current.theme).toBe('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => {
      result.current.setThemeFromAnimation(false)
    })
    await waitFor(() => expect(result.current.theme).toBe('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
