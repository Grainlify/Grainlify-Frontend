import { createContext, ReactNode, useContext, useState } from 'react';
import { logger } from '../../../shared/utils/logger';
import { BillingProfile } from '../types';

interface BillingProfilesContextType {
  profiles: BillingProfile[];
  setProfiles: (profiles: BillingProfile[]) => boolean;
  addProfile: (profile: BillingProfile) => boolean;
  updateProfile: (id: number, updates: Partial<BillingProfile>) => boolean;
  deleteProfile: (id: number) => boolean;
}

const BillingProfilesContext = createContext<BillingProfilesContextType | undefined>(undefined);

const STORAGE_KEY = 'billing_profiles';

function logStorageFailure(operation: 'load' | 'save') {
  // Billing profiles may contain PII. Log a fixed summary instead of the thrown
  // object because browser/storage errors can include serialized input values.
  logger.error(`Billing profile ${operation} failed`);
}

function loadProfilesFromStorage(): BillingProfile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    logStorageFailure('load');
    return [];
  }
}

function saveProfilesToStorage(profiles: BillingProfile[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    return true;
  } catch {
    logStorageFailure('save');
    return false;
  }
}

export function BillingProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, updateProfiles] = useState<BillingProfile[]>(loadProfilesFromStorage);

  const commit = (nextProfiles: BillingProfile[]) => {
    if (!saveProfilesToStorage(nextProfiles)) return false;
    updateProfiles(nextProfiles);
    return true;
  };

  const setProfiles = (newProfiles: BillingProfile[]) => commit(newProfiles);

  const addProfile = (profile: BillingProfile) => commit([...profiles, profile]);

  const updateProfile = (id: number, updates: Partial<BillingProfile>) => {
    const index = profiles.findIndex((profile) => profile.id === id);
    if (index === -1) return false;

    const nextProfiles = profiles.map((profile) =>
      profile.id === id ? { ...profile, ...updates, id: profile.id } : profile,
    );
    return commit(nextProfiles);
  };

  const deleteProfile = (id: number) => {
    const profile = profiles.find((candidate) => candidate.id === id);
    if (!profile || profile.isDefault) return false;
    return commit(profiles.filter((candidate) => candidate.id !== id));
  };

  return (
    <BillingProfilesContext.Provider
      value={{ profiles, setProfiles, addProfile, updateProfile, deleteProfile }}
    >
      {children}
    </BillingProfilesContext.Provider>
  );
}

export function useBillingProfiles() {
  const context = useContext(BillingProfilesContext);
  if (context === undefined) {
    throw new Error('useBillingProfiles must be used within a BillingProfilesProvider');
  }
  return context;
}
