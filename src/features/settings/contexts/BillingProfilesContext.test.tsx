import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../shared/utils/logger';
import { BillingProfile } from '../types';
import { BillingProfilesProvider, useBillingProfiles } from './BillingProfilesContext';

const individual: BillingProfile = {
  id: 1,
  name: 'Personal',
  type: 'individual',
  status: 'verified',
  isDefault: true,
};

const company: BillingProfile = {
  id: 2,
  name: 'Acme',
  type: 'organization',
  status: 'missing-verification',
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <BillingProfilesProvider>{children}</BillingProfilesProvider>
);

function mockSaveFailure(secret = '4111111111111111') {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error(`storage rejected ${secret}`);
  });
}

describe('BillingProfilesContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reads the stored profile list', () => {
    localStorage.setItem('billing_profiles', JSON.stringify([individual]));

    const { result } = renderHook(() => useBillingProfiles(), { wrapper });

    expect(result.current.profiles).toEqual([individual]);
  });

  it('returns an empty list and logs only a safe summary when reading fails', () => {
    const secret = '4111111111111111';
    localStorage.setItem('billing_profiles', `{ "card": "${secret}"`);
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useBillingProfiles(), { wrapper });

    expect(result.current.profiles).toEqual([]);
    expect(loggerSpy).toHaveBeenCalledWith('Billing profile load failed');
    expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain(secret);
  });

  it('replaces and persists the profile list', () => {
    const { result } = renderHook(() => useBillingProfiles(), { wrapper });

    act(() => expect(result.current.setProfiles([individual, company])).toBe(true));

    expect(result.current.profiles).toEqual([individual, company]);
    expect(JSON.parse(localStorage.getItem('billing_profiles')!)).toEqual([individual, company]);
  });

  it('keeps the prior list when replacing it cannot be persisted', () => {
    localStorage.setItem('billing_profiles', JSON.stringify([individual]));
    const { result } = renderHook(() => useBillingProfiles(), { wrapper });
    mockSaveFailure();

    act(() => expect(result.current.setProfiles([company])).toBe(false));

    expect(result.current.profiles).toEqual([individual]);
  });

  it('creates and persists a profile', () => {
    const { result } = renderHook(() => useBillingProfiles(), { wrapper });

    act(() => expect(result.current.addProfile(company)).toBe(true));

    expect(result.current.profiles).toEqual([company]);
  });

  it('rolls back a create that cannot be persisted without logging sensitive data', () => {
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useBillingProfiles(), { wrapper });
    const secret = '4111111111111111';
    mockSaveFailure(secret);

    act(() => expect(result.current.addProfile(company)).toBe(false));

    expect(result.current.profiles).toEqual([]);
    expect(loggerSpy).toHaveBeenCalledWith('Billing profile save failed');
    expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain(secret);
  });

  it('updates a profile while preserving its id', () => {
    localStorage.setItem('billing_profiles', JSON.stringify([individual, company]));
    const { result } = renderHook(() => useBillingProfiles(), { wrapper });

    act(() => expect(result.current.updateProfile(company.id, { id: 99, name: 'Renamed' })).toBe(true));

    expect(result.current.profiles).toEqual([
      individual,
      { ...company, name: 'Renamed' },
    ]);
  });

  it('returns false when the profile to update does not exist', () => {
    const { result } = renderHook(() => useBillingProfiles(), { wrapper });

    act(() => expect(result.current.updateProfile(404, { name: 'Missing' })).toBe(false));

    expect(result.current.profiles).toEqual([]);
  });

  it('rolls back an update that cannot be persisted', () => {
    localStorage.setItem('billing_profiles', JSON.stringify([company]));
    const { result } = renderHook(() => useBillingProfiles(), { wrapper });
    mockSaveFailure();

    act(() => expect(result.current.updateProfile(company.id, { name: 'Renamed' })).toBe(false));

    expect(result.current.profiles).toEqual([company]);
  });

  it('deletes a non-default profile', () => {
    localStorage.setItem('billing_profiles', JSON.stringify([individual, company]));
    const { result } = renderHook(() => useBillingProfiles(), { wrapper });

    act(() => expect(result.current.deleteProfile(company.id)).toBe(true));

    expect(result.current.profiles).toEqual([individual]);
  });

  it('explicitly blocks deletion of the default profile', () => {
    localStorage.setItem('billing_profiles', JSON.stringify([individual, company]));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useBillingProfiles(), { wrapper });

    act(() => expect(result.current.deleteProfile(individual.id)).toBe(false));

    expect(result.current.profiles).toEqual([individual, company]);
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('returns false when the profile to delete does not exist', () => {
    const { result } = renderHook(() => useBillingProfiles(), { wrapper });

    act(() => expect(result.current.deleteProfile(404)).toBe(false));

    expect(result.current.profiles).toEqual([]);
  });

  it('rolls back a delete that cannot be persisted', () => {
    localStorage.setItem('billing_profiles', JSON.stringify([company]));
    const { result } = renderHook(() => useBillingProfiles(), { wrapper });
    mockSaveFailure();

    act(() => expect(result.current.deleteProfile(company.id)).toBe(false));

    expect(result.current.profiles).toEqual([company]);
  });

  it('requires consumers to be wrapped in the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const suppressExpectedError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', suppressExpectedError);

    expect(() => renderHook(() => useBillingProfiles())).toThrow(
      'useBillingProfiles must be used within a BillingProfilesProvider',
    );
    window.removeEventListener('error', suppressExpectedError);
  });
});
