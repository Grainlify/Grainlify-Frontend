import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { getAuthToken, setAuthToken, removeAuthToken, getCurrentUser } from '../api/client'

vi.mock('../api/client', () => ({
  getAuthToken: vi.fn(),
  setAuthToken: vi.fn(),
  removeAuthToken: vi.fn(),
  getCurrentUser: vi.fn(),
}))

describe('AuthContext', () => {
  beforeEach(() => {
    // AuthContext.tsx is intentionally chatty with console.log/console.error
    // for production debugging; keep test output clean.
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('with no token in localStorage: isLoading resolves false, user stays null, isAuthenticated is false, and getCurrentUser is never called', async () => {
    vi.mocked(getAuthToken).mockReturnValue(null)

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(getCurrentUser).not.toHaveBeenCalled()
  })

  it('with a token present on mount: getCurrentUser is called and user/userRole/userId populate on success', async () => {
    vi.mocked(getAuthToken).mockReturnValue('tok-abc')
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u-1',
      role: 'maintainer',
      github: { login: 'octocat', avatar_url: 'https://example.com/a.png' },
    })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getCurrentUser).toHaveBeenCalledTimes(1)
    expect(result.current.user?.id).toBe('u-1')
    expect(result.current.userRole).toBe('maintainer')
    expect(result.current.userId).toBe('u-1')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('populates user state without crashing when getCurrentUser resolves with no "github" field (github is optional on User)', async () => {
    vi.mocked(getAuthToken).mockReturnValue('tok-no-github')
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u-2', role: 'contributor' })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.user).toEqual({ id: 'u-2', role: 'contributor' })
    expect(result.current.user?.github).toBeUndefined()
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('when getCurrentUser rejects on mount (expired/invalid token): removeAuthToken is called and user state clears', async () => {
    vi.mocked(getAuthToken).mockReturnValue('bad-tok')
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('401 Unauthorized'))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(removeAuthToken).toHaveBeenCalledTimes(1)
    expect(result.current.user).toBeNull()
    expect(result.current.userRole).toBeNull()
    expect(result.current.userId).toBeNull()
  })

  it('login(token) success: setAuthToken and getCurrentUser are called, and user state populates', async () => {
    vi.mocked(getAuthToken).mockReturnValue(null)
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u-3', role: 'admin' })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.login('new-token')
    })

    expect(setAuthToken).toHaveBeenCalledWith('new-token')
    expect(getCurrentUser).toHaveBeenCalled()
    expect(result.current.user).toEqual({ id: 'u-3', role: 'admin' })
    expect(result.current.userRole).toBe('admin')
    expect(result.current.userId).toBe('u-3')
  })

  it('login(token) failure: removeAuthToken is called and the error re-throws out of login()', async () => {
    vi.mocked(getAuthToken).mockReturnValue(null)
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(
      act(async () => {
        await result.current.login('bad-token')
      })
    ).rejects.toThrow('network down')

    expect(setAuthToken).toHaveBeenCalledWith('bad-token')
    expect(removeAuthToken).toHaveBeenCalledTimes(1)
  })

  it('logout(): removeAuthToken is called and user state clears', async () => {
    vi.mocked(getAuthToken).mockReturnValue('existing-tok')
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u-4', role: 'contributor' })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).not.toBeNull()

    act(() => {
      result.current.logout()
    })

    expect(removeAuthToken).toHaveBeenCalledTimes(1)
    expect(result.current.user).toBeNull()
    expect(result.current.userRole).toBeNull()
    expect(result.current.userId).toBeNull()
  })
})
