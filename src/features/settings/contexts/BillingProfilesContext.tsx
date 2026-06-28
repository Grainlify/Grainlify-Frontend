import { logger } from '../../../shared/utils/logger';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BillingProfile, BillingProfileType, BillingProfileStatus } from '../types';

/**
 * Subset of BillingProfile that is safe to persist in localStorage.
 * taxId, paymentMethods, and invoices are intentionally excluded to avoid
 * storing sensitive financial data in plaintext client-side storage.
 */
type StoredProfile = Omit<BillingProfile, 'taxId' | 'paymentMethods' | 'invoices'>;

/**
 * Public API exposed by BillingProfilesContext.
 */
interface BillingProfilesContextType {
  /** Currently loaded billing profiles (in-memory; sensitive fields may be present). */
  profiles: BillingProfile[];
  /** Replace the full profile list. */
  setProfiles: (profiles: BillingProfile[]) => void;
  /** Append a new profile. */
  addProfile: (profile: BillingProfile) => void;
  /** Merge partial updates into the profile matching the given id. */
  updateProfile: (id: number, updates: Partial<BillingProfile>) => void;
}

const BillingProfilesContext = createContext<BillingProfilesContextType | undefined>(undefined);

const STORAGE_KEY = 'billing_profiles';

const VALID_TYPES: BillingProfileType[] = ['individual', 'self-employed', 'organization'];
const VALID_STATUSES: BillingProfileStatus[] = ['verified', 'missing-verification', 'limit-reached'];

/**
 * Returns true when `val` satisfies the minimum required shape for a stored
 * billing profile. Filters out entries that are corrupted or from an older
 * schema version rather than crashing on load.
 */
function isValidStoredProfile(val: unknown): val is StoredProfile {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  const p = val as Record<string, unknown>;
  return (
    typeof p.id === 'number' &&
    Number.isFinite(p.id) &&
    typeof p.name === 'string' &&
    p.name.length > 0 &&
    VALID_TYPES.includes(p.type as BillingProfileType) &&
    VALID_STATUSES.includes(p.status as BillingProfileStatus)
  );
}

/**
 * Returns a shallow copy of `profile` with sensitive fields removed.
 * These fields are never written to localStorage.
 */
function stripSensitiveFields(profile: BillingProfile): StoredProfile {
  const { taxId: _t, paymentMethods: _pm, invoices: _inv, ...safe } = profile;
  return safe;
}

/**
 * Reads and validates billing profiles from localStorage.
 * Returns an empty array on any parse or validation failure instead of
 * propagating exceptions to the caller.
 */
function loadProfilesFromStorage(): BillingProfile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      logger.error('Billing profiles in storage is not an array; discarding.');
      return [];
    }
    return parsed.filter(isValidStoredProfile);
  } catch (error) {
    logger.error('Failed to parse billing profiles from storage:', error);
    return [];
  }
}

/**
 * Persists billing profiles to localStorage with all sensitive fields stripped.
 * Handles QuotaExceededError gracefully: logs the error and continues without
 * propagating the exception, so the app remains functional even when storage
 * is full.
 */
function saveProfilesToStorage(profiles: BillingProfile[]) {
  try {
    const safe = profiles.map(stripSensitiveFields);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      logger.error('localStorage quota exceeded; billing profiles not persisted.', error);
    } else {
      logger.error('Failed to save billing profiles to storage:', error);
    }
  }
}

/**
 * Provides billing profile state to child components.
 *
 * Persistence strategy:
 * - Profiles are loaded once via the useState lazy initialiser (no extra mount effect).
 * - A single useEffect persists sanitised profiles after every state change.
 * - Sensitive fields (taxId, paymentMethods, invoices) are stripped before every write.
 */
export function BillingProfilesProvider({ children }: { children: ReactNode }) {
  // Lazy initialiser: reads storage exactly once on mount
  const [profiles, setProfilesState] = useState<BillingProfile[]>(loadProfilesFromStorage);

  // Persist sanitised profiles to localStorage after every state change.
  // Also runs on mount, which repairs any sensitive fields left by older code.
  useEffect(() => {
    saveProfilesToStorage(profiles);
  }, [profiles]);

  const setProfiles = (newProfiles: BillingProfile[]) => {
    setProfilesState(newProfiles);
  };

  const addProfile = (profile: BillingProfile) => {
    setProfilesState((prev) => [...prev, profile]);
  };

  const updateProfile = (id: number, updates: Partial<BillingProfile>) => {
    setProfilesState((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  return (
    <BillingProfilesContext.Provider value={{ profiles, setProfiles, addProfile, updateProfile }}>
      {children}
    </BillingProfilesContext.Provider>
  );
}

/**
 * Returns the current billing profiles context.
 * @throws {Error} if called outside a {@link BillingProfilesProvider}.
 */
export function useBillingProfiles() {
  const context = useContext(BillingProfilesContext);
  if (context === undefined) {
    throw new Error('useBillingProfiles must be used within a BillingProfilesProvider');
  }
  return context;
}
