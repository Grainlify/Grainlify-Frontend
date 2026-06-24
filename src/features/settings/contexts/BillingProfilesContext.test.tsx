import { renderHook, act } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest';
import { BillingProfilesProvider, useBillingProfiles } from './BillingProfilesContext';
import { BillingProfile } from '../types';

vi.mock('../../../shared/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const STORAGE_KEY = 'billing_profiles';

function wrapper({ children }: { children: React.ReactNode }) {
  return <BillingProfilesProvider>{children}</BillingProfilesProvider>;
}

function makeProfile(overrides: Partial<BillingProfile> = {}): BillingProfile {
  return {
    id: 1,
    name: 'Test Profile',
    type: 'individual',
    status: 'verified',
    ...overrides,
  };
}

describe('BillingProfilesContext', () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    setItemSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // Loading from storage
  // ---------------------------------------------------------------------------

  describe('loading from localStorage', () => {
    it('starts with an empty list when storage is empty', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      expect(result.current.profiles).toEqual([]);
    });

    it('loads valid profiles on mount', () => {
      const profile = makeProfile({ id: 2, name: 'Saved' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify([profile]));
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      expect(result.current.profiles).toHaveLength(1);
      expect(result.current.profiles[0].id).toBe(2);
      expect(result.current.profiles[0].name).toBe('Saved');
    });

    it('returns empty array for malformed JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      expect(result.current.profiles).toEqual([]);
    });

    it('returns empty array when stored value is not an array', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 1, name: 'Object not array' }));
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      expect(result.current.profiles).toEqual([]);
    });

    it('filters out entries where id is not a finite number', () => {
      const badId = { id: 'not-a-number', name: 'Bad', type: 'individual', status: 'verified' };
      const nanId = { id: NaN, name: 'NaN id', type: 'individual', status: 'verified' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([badId, nanId]));
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      expect(result.current.profiles).toEqual([]);
    });

    it('filters out entries with an empty name', () => {
      const emptyName = { id: 1, name: '', type: 'individual', status: 'verified' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([emptyName]));
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      expect(result.current.profiles).toEqual([]);
    });

    it('filters out entries with an invalid type', () => {
      const badType = { id: 1, name: 'Bad Type', type: 'hacker', status: 'verified' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([badType]));
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      expect(result.current.profiles).toEqual([]);
    });

    it('filters out entries with an invalid status', () => {
      const badStatus = { id: 1, name: 'Bad Status', type: 'individual', status: 'injected' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([badStatus]));
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      expect(result.current.profiles).toEqual([]);
    });

    it('filters out primitive entries mixed into the array', () => {
      const valid = makeProfile({ id: 1, name: 'Valid' });
      const mixed = [valid, 'string', 42, null, true, []];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mixed));
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      expect(result.current.profiles).toHaveLength(1);
      expect(result.current.profiles[0].id).toBe(1);
    });

    it('accepts all valid BillingProfileType values', () => {
      const profiles = [
        makeProfile({ id: 1, type: 'individual' }),
        makeProfile({ id: 2, type: 'self-employed' }),
        makeProfile({ id: 3, type: 'organization' }),
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      expect(result.current.profiles).toHaveLength(3);
    });

    it('accepts all valid BillingProfileStatus values', () => {
      const profiles = [
        makeProfile({ id: 1, status: 'verified' }),
        makeProfile({ id: 2, status: 'missing-verification' }),
        makeProfile({ id: 3, status: 'limit-reached' }),
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      expect(result.current.profiles).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Sensitive-field stripping
  // ---------------------------------------------------------------------------

  describe('sensitive field stripping on save', () => {
    it('does not store taxId in localStorage', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => {
        result.current.addProfile(makeProfile({ taxId: 'SECRET-TAX-123' }));
      });
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored[0]).not.toHaveProperty('taxId');
    });

    it('does not store paymentMethods in localStorage', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => {
        result.current.addProfile(
          makeProfile({
            paymentMethods: [
              {
                id: 1,
                ecosystem: 'stellar',
                cryptoType: 'usdc',
                walletAddress: 'SENSITIVE_WALLET_ADDR',
                isDefault: true,
                createdAt: '2024-01-01',
              },
            ],
          })
        );
      });
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored[0]).not.toHaveProperty('paymentMethods');
    });

    it('does not store invoices in localStorage', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => {
        result.current.addProfile(
          makeProfile({
            invoices: [
              {
                id: 'inv-1',
                invoiceNumber: 'INV-001',
                date: '2024-01-01',
                amount: 500,
                currency: 'USD',
                status: 'paid',
                description: 'Service fee',
                billingPeriod: 'Jan 2024',
              },
            ],
          })
        );
      });
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored[0]).not.toHaveProperty('invoices');
    });

    it('preserves non-sensitive fields in localStorage', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => {
        result.current.addProfile(
          makeProfile({
            firstName: 'Jane',
            lastName: 'Doe',
            address: '123 Main St',
            city: 'Berlin',
            postalCode: '10115',
            country: 'DE',
          })
        );
      });
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')[0];
      expect(stored.firstName).toBe('Jane');
      expect(stored.lastName).toBe('Doe');
      expect(stored.address).toBe('123 Main St');
      expect(stored.city).toBe('Berlin');
      expect(stored.postalCode).toBe('10115');
      expect(stored.country).toBe('DE');
    });

    it('keeps sensitive fields in memory even though they are not persisted', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => {
        result.current.addProfile(makeProfile({ taxId: 'IN_MEMORY_ONLY' }));
      });
      expect(result.current.profiles[0].taxId).toBe('IN_MEMORY_ONLY');
    });

    it('strips sensitive fields from profiles loaded from old storage that had them', () => {
      // Simulate old code that wrote taxId to storage
      const oldProfile = { id: 1, name: 'Old', type: 'individual', status: 'verified', taxId: 'LEGACY' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([oldProfile]));

      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      // Wait for the useEffect to persist (in act, effects flush synchronously)
      act(() => {});

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored[0]).not.toHaveProperty('taxId');
      // In-memory the profile is still accessible as loaded
      expect(result.current.profiles).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Quota-exceeded and storage errors
  // ---------------------------------------------------------------------------

  describe('storage error handling', () => {
    it('does not throw when localStorage throws QuotaExceededError', () => {
      const quotaError = new DOMException('QuotaExceededError', 'QuotaExceededError');
      setItemSpy.mockImplementation(() => { throw quotaError; });

      expect(() => {
        renderHook(() => useBillingProfiles(), { wrapper });
      }).not.toThrow();
    });

    it('does not throw when localStorage throws NS_ERROR_DOM_QUOTA_REACHED', () => {
      const firefoxError = new DOMException('NS_ERROR_DOM_QUOTA_REACHED', 'NS_ERROR_DOM_QUOTA_REACHED');
      setItemSpy.mockImplementation(() => { throw firefoxError; });

      expect(() => {
        renderHook(() => useBillingProfiles(), { wrapper });
      }).not.toThrow();
    });

    it('does not throw when localStorage throws a generic error', () => {
      setItemSpy.mockImplementation(() => { throw new Error('disk full'); });

      expect(() => {
        renderHook(() => useBillingProfiles(), { wrapper });
      }).not.toThrow();
    });

    it('preserves in-memory state even when the save fails', () => {
      setItemSpy.mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => {
        result.current.addProfile(makeProfile({ id: 99, name: 'Still Here' }));
      });
      // In-memory state is intact even though localStorage write failed
      expect(result.current.profiles).toHaveLength(1);
      expect(result.current.profiles[0].name).toBe('Still Here');
    });
  });

  // ---------------------------------------------------------------------------
  // Missing provider guard
  // ---------------------------------------------------------------------------

  describe('useBillingProfiles outside provider', () => {
    it('throws a descriptive error when used without a BillingProfilesProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useBillingProfiles())).toThrow(
        'useBillingProfiles must be used within a BillingProfilesProvider'
      );
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  describe('addProfile', () => {
    it('appends a profile to the list', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => { result.current.addProfile(makeProfile({ id: 1, name: 'First' })); });
      act(() => { result.current.addProfile(makeProfile({ id: 2, name: 'Second' })); });
      expect(result.current.profiles).toHaveLength(2);
      expect(result.current.profiles[0].name).toBe('First');
      expect(result.current.profiles[1].name).toBe('Second');
    });

    it('persists the new profile to localStorage', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => { result.current.addProfile(makeProfile({ id: 5, name: 'Persisted' })); });
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(5);
    });
  });

  describe('updateProfile', () => {
    it('merges updates into the matching profile', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => { result.current.addProfile(makeProfile({ id: 1, name: 'Original' })); });
      act(() => { result.current.updateProfile(1, { name: 'Updated', city: 'Berlin' }); });
      expect(result.current.profiles[0].name).toBe('Updated');
      expect(result.current.profiles[0].city).toBe('Berlin');
    });

    it('does not mutate other profiles', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => {
        result.current.addProfile(makeProfile({ id: 1, name: 'First' }));
        result.current.addProfile(makeProfile({ id: 2, name: 'Second' }));
      });
      act(() => { result.current.updateProfile(1, { name: 'Changed' }); });
      expect(result.current.profiles[1].name).toBe('Second');
    });

    it('is a no-op when the id does not exist', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => { result.current.addProfile(makeProfile({ id: 1 })); });
      act(() => { result.current.updateProfile(999, { name: 'Ghost' }); });
      expect(result.current.profiles).toHaveLength(1);
      expect(result.current.profiles[0].id).toBe(1);
    });

    it('persists the updated profile to localStorage', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => { result.current.addProfile(makeProfile({ id: 1, name: 'Before' })); });
      act(() => { result.current.updateProfile(1, { name: 'After' }); });
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored[0].name).toBe('After');
    });
  });

  describe('setProfiles', () => {
    it('replaces the full profile list', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => { result.current.addProfile(makeProfile({ id: 1 })); });
      act(() => { result.current.setProfiles([makeProfile({ id: 2, name: 'Replaced' })]); });
      expect(result.current.profiles).toHaveLength(1);
      expect(result.current.profiles[0].id).toBe(2);
    });

    it('persists the replacement list to localStorage', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => { result.current.setProfiles([makeProfile({ id: 10, name: 'Only' })]); });
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(10);
    });

    it('accepts an empty array to clear all profiles', () => {
      const { result } = renderHook(() => useBillingProfiles(), { wrapper });
      act(() => { result.current.addProfile(makeProfile()); });
      act(() => { result.current.setProfiles([]); });
      expect(result.current.profiles).toEqual([]);
    });
  });
});
