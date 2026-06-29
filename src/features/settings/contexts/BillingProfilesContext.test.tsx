import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BillingProfilesProvider, useBillingProfiles } from './BillingProfilesContext'
import { logger } from '../../../shared/utils/logger'
import { BillingProfile } from '../types'

vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

const mockProfile: BillingProfile = {
  id: 1,
  name: 'Test Profile',
  type: 'individual',
  status: 'verified',
}

describe('BillingProfilesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('provides an empty profiles array by default when storage is empty', () => {
    const { result } = renderHook(() => useBillingProfiles(), {
      wrapper: BillingProfilesProvider,
    })

    expect(result.current.profiles).toEqual([])
  })

  it('loads profiles from localStorage on mount', () => {
    localStorage.setItem('billing_profiles', JSON.stringify([mockProfile]))

    const { result } = renderHook(() => useBillingProfiles(), {
      wrapper: BillingProfilesProvider,
    })

    expect(result.current.profiles).toEqual([mockProfile])
  })

  it('handles corrupted JSON in localStorage gracefully', () => {
    localStorage.setItem('billing_profiles', 'invalid-json')

    const { result } = renderHook(() => useBillingProfiles(), {
      wrapper: BillingProfilesProvider,
    })

    expect(result.current.profiles).toEqual([])
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to load billing profiles from storage:',
      expect.any(Error)
    )
  })

  it('adds a new profile and persists to storage', () => {
    const { result } = renderHook(() => useBillingProfiles(), {
      wrapper: BillingProfilesProvider,
    })

    act(() => {
      result.current.addProfile(mockProfile)
    })

    expect(result.current.profiles).toEqual([mockProfile])
    expect(localStorage.getItem('billing_profiles')).toBe(JSON.stringify([mockProfile]))
  })

  it('updates an existing profile and persists to storage', () => {
    localStorage.setItem('billing_profiles', JSON.stringify([mockProfile]))

    const { result } = renderHook(() => useBillingProfiles(), {
      wrapper: BillingProfilesProvider,
    })

    const updates: Partial<BillingProfile> = { name: 'Updated Name' }

    act(() => {
      result.current.updateProfile(mockProfile.id, updates)
    })

    const expectedProfile = { ...mockProfile, ...updates }
    expect(result.current.profiles).toEqual([expectedProfile])
    expect(localStorage.getItem('billing_profiles')).toBe(JSON.stringify([expectedProfile]))
  })

  it('sets multiple profiles and persists to storage', () => {
    const { result } = renderHook(() => useBillingProfiles(), {
      wrapper: BillingProfilesProvider,
    })

    const newProfiles = [mockProfile, { ...mockProfile, id: 2, name: 'Profile 2' }]

    act(() => {
      result.current.setProfiles(newProfiles)
    })

    expect(result.current.profiles).toEqual(newProfiles)
    expect(localStorage.getItem('billing_profiles')).toBe(JSON.stringify(newProfiles))
  })

  it('logs an error when localStorage.setItem fails (quota exceeded)', () => {
    const { result } = renderHook(() => useBillingProfiles(), {
      wrapper: BillingProfilesProvider,
    })

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    act(() => {
      result.current.addProfile(mockProfile)
    })

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to save billing profiles to storage:',
      expect.any(Error)
    )

    // Cleanup spy
    setItemSpy.mockRestore()
  })
})
