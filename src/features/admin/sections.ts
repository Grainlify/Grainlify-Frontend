/**
 * Each admin area is its own sidebar entry rather than one long Review page.
 * The page renders the one section it was opened for. The order here is the
 * sidebar's: the queues somebody is waiting on first.
 */
export type AdminSection = 'social' | 'kyc' | 'redemptions' | 'bounty-disputes' | 'bounty-repos' | 'bounty-settings' | 'ecosystems' | 'osw';

export const ADMIN_SECTIONS: { id: AdminSection; label: string }[] = [
  { id: 'social', label: 'Social follow review' },
  { id: 'kyc', label: 'Verification review' },
  { id: 'redemptions', label: 'Redemptions' },
  { id: 'bounty-disputes', label: 'Bounty disputes' },
  { id: 'bounty-repos', label: 'Bounty repositories' },
  { id: 'bounty-settings', label: 'Bounty draw settings' },
  { id: 'ecosystems', label: 'Ecosystems' },
  { id: 'osw', label: 'Open-Source Week' },
];

/** A sidebar id for a section, and back. */
export const adminTabId = (section: AdminSection) => `admin-${section}`;
export const sectionForTab = (tab: string): AdminSection | null => {
  // A bare ?tab=admin (old bookmarks, the ADMIN pill before the split) opens the
  // first queue rather than a page that no longer exists.
  if (tab === 'admin') return ADMIN_SECTIONS[0]!.id;
  const id = tab.startsWith('admin-') ? tab.slice('admin-'.length) : '';
  return ADMIN_SECTIONS.some((x) => x.id === id) ? (id as AdminSection) : null;
};
