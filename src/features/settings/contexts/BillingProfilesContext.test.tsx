// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BillingProfile } from '../types'
import { BillingProfilesProvider, useBillingProfiles } from './BillingProfilesContext'

const { mockLoggerError } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
}))

vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}))

const STORAGE_KEY = 'billing_profiles'

const verifiedProfile: BillingProfile = {
  id: 1,
  name: 'Verified test profile',
  type: 'individual',
  status: 'verified',
}

const pendingProfile: BillingProfile = {
  id: 2,
  name: 'Pending test profile',
  type: 'organization',
  status: 'missing-verification',
}

function storedProfiles() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as BillingProfile[]
}

function BillingProfilesProbe() {
  const { profiles, setProfiles, addProfile, updateProfile } = useBillingProfiles()

  return (
    <section>
      <output aria-label="profile count">{profiles.length}</output>
      <ul>
        {profiles.map((profile) => (
          <li key={profile.id}>
            {profile.name} - {profile.status}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setProfiles([verifiedProfile])}>
        Replace profiles
      </button>
      <button type="button" onClick={() => addProfile(pendingProfile)}>
        Add profile
      </button>
      <button
        type="button"
        onClick={() =>
          updateProfile(1, {
            name: 'Updated verified profile',
            status: 'limit-reached',
          })
        }
      >
        Update profile
      </button>
    </section>
  )
}

function renderBillingProfilesProvider() {
  return render(
    <BillingProfilesProvider>
      <BillingProfilesProbe />
    </BillingProfilesProvider>
  )
}

describe('BillingProfilesProvider storage handling', () => {
  beforeEach(() => {
    localStorage.clear()
    mockLoggerError.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('loads an empty profile list when storage has no saved value', async () => {
    renderBillingProfilesProvider()

    expect(screen.getByLabelText('profile count')).toHaveTextContent('0')
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBe('[]'))
    expect(mockLoggerError).not.toHaveBeenCalled()
  })

  it('restores valid stored profiles without losing non-sensitive profile metadata', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([verifiedProfile]))

    renderBillingProfilesProvider()

    expect(screen.getByText('Verified test profile - verified')).toBeInTheDocument()
    expect(storedProfiles()).toEqual([verifiedProfile])
    expect(mockLoggerError).not.toHaveBeenCalled()
  })

  it('falls back to an empty list and logs when stored JSON is corrupted', async () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')

    renderBillingProfilesProvider()

    expect(screen.getByLabelText('profile count')).toHaveTextContent('0')
    await waitFor(() =>
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to load billing profiles from storage:',
        expect.any(SyntaxError)
      )
    )
  })

  it('persists replacement profiles to storage', async () => {
    const user = userEvent.setup()
    renderBillingProfilesProvider()

    await user.click(screen.getByRole('button', { name: 'Replace profiles' }))

    expect(await screen.findByText('Verified test profile - verified')).toBeInTheDocument()
    await waitFor(() => expect(storedProfiles()).toEqual([verifiedProfile]))
    expect(mockLoggerError).not.toHaveBeenCalled()
  })

  it('keeps provider state usable and logs when localStorage quota writes fail', async () => {
    const user = userEvent.setup()
    const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError')

    renderBillingProfilesProvider()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw quotaError
    })
    mockLoggerError.mockClear()

    await user.click(screen.getByRole('button', { name: 'Replace profiles' }))

    expect(await screen.findByText('Verified test profile - verified')).toBeInTheDocument()
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to save billing profiles to storage:',
      quotaError
    )
  })

  it('appends and updates profiles through the exposed reducers', async () => {
    const user = userEvent.setup()
    localStorage.setItem(STORAGE_KEY, JSON.stringify([verifiedProfile]))
    renderBillingProfilesProvider()

    await user.click(screen.getByRole('button', { name: 'Add profile' }))
    expect(
      await screen.findByText('Pending test profile - missing-verification')
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Update profile' }))

    expect(await screen.findByText('Updated verified profile - limit-reached')).toBeInTheDocument()
    await waitFor(() =>
      expect(storedProfiles()).toEqual([
        {
          ...verifiedProfile,
          name: 'Updated verified profile',
          status: 'limit-reached',
        },
        pendingProfile,
      ])
    )
  })
})
