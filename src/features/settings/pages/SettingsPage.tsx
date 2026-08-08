import { useSearchParams } from 'react-router-dom';
import { SettingsTabType } from '../types';
import { ProfileTab } from '../components/profile/ProfileTab';
import { NotificationsTab } from '../components/notifications/NotificationsTab';
import { ReferralsTab } from '../components/referrals/ReferralsTab';
import { RewardsTab } from '../components/rewards/RewardsTab';
import { PayoutTab } from '../components/payout/PayoutTab';
import { BillingTab } from '../components/billing/BillingTab';
import { TermsTab } from '../components/terms/TermsTab';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { BillingProfilesProvider } from '../contexts/BillingProfilesContext';

const VALID_TABS: SettingsTabType[] = ['profile', 'notifications', 'referrals', 'rewards', 'payout', 'billing', 'terms'];

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Owns its own ?subtab= so which settings tab is active survives a reload.
  const activeTab: SettingsTabType = (() => {
    const fromUrl = searchParams.get('subtab');
    return (VALID_TABS as string[]).includes(fromUrl ?? '') ? (fromUrl as SettingsTabType) : 'profile';
  })();
  const setActiveTab = (tab: SettingsTabType) => {
    const next = new URLSearchParams(searchParams);
    next.set('subtab', tab);
    setSearchParams(next);
  };
  const { theme } = useTheme();

  const tabs: { id: SettingsTabType; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'referrals', label: 'Referrals' },
    { id: 'rewards', label: 'Rewards' },
    { id: 'payout', label: 'Payout Preferences' },
    { id: 'billing', label: 'Billing Profiles' },
    { id: 'terms', label: 'Terms and Conditions' },
  ];

  return (
    <BillingProfilesProvider>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div
          className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
            theme === 'dark'
              ? 'bg-[#2d2820]/[0.4] border-white/10'
              : 'bg-white/[0.12] border-white/20'
          }`}
        >
          <div className="flex items-center gap-2 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-[16px] text-[14px] font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#a2792c] text-white shadow-[0_4px_16px_rgba(162,121,44,0.25)]'
                    : theme === 'dark'
                      ? 'text-[#d4c5b0] hover:bg-white/[0.1]'
                      : 'text-[#6b5d4d] hover:bg-white/[0.1]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'referrals' && <ReferralsTab />}
        {activeTab === 'rewards' && <RewardsTab />}
        {activeTab === 'payout' && <PayoutTab />}
        {activeTab === 'billing' && <BillingTab />}
        {activeTab === 'terms' && <TermsTab />}
      </div>
    </BillingProfilesProvider>
  );
}