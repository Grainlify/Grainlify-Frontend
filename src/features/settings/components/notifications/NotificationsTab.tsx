import { useEffect, useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { NotificationSection } from './NotificationSection';
import { NotificationRow } from './NotificationRow';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreference,
} from '../../../../shared/api/client';

interface NotificationTypeInfo {
  section: string;
  title: string;
  description: string;
}

// Keep in sync with internal/notifications/types.go's Type constants on the backend.
const NOTIFICATION_TYPE_INFO: Record<string, NotificationTypeInfo> = {
  issue_assigned: {
    section: 'Contributor',
    title: 'Issue assigned to you',
    description: 'When a maintainer assigns you to an issue you applied for.',
  },
  issue_application_rejected: {
    section: 'Contributor',
    title: 'Application not accepted',
    description: "When a maintainer doesn't accept your application to an issue.",
  },
  pr_merged: {
    section: 'Contributor',
    title: 'Pull request merged',
    description: 'When a pull request you opened gets merged.',
  },
  reward_received: {
    section: 'Contributor',
    title: 'Reward received',
    description: 'When you receive a reward for a completed contribution.',
  },
  referral_completed: {
    section: 'Contributor',
    title: 'Referral reward earned',
    description: 'When someone you referred completes GitHub sign-in and identity verification.',
  },
  social_follow_completed: {
    section: 'Contributor',
    title: 'Social follow reward earned',
    description: 'When your follow proof is approved for every platform.',
  },
  redemption_paid: {
    section: 'Contributor',
    title: 'Redemption paid',
    description: 'When a points-to-USDC redemption request is paid out.',
  },
  redemption_rejected: {
    section: 'Contributor',
    title: 'Redemption rejected',
    description: 'When a redemption request is rejected and your points are refunded.',
  },
  issue_application_submitted: {
    section: 'Maintainer',
    title: 'New application',
    description: 'When a contributor applies to work on an issue in one of your projects.',
  },
};

const SECTION_ORDER = ['Contributor', 'Maintainer'];

type PreferenceMap = Record<string, { in_app: boolean; email: boolean }>;

function toMap(preferences: NotificationPreference[]): PreferenceMap {
  const map: PreferenceMap = {};
  for (const p of preferences) {
    map[p.type] = { in_app: p.in_app, email: p.email };
  }
  return map;
}

export function NotificationsTab() {
  const { theme } = useTheme();
  const [preferences, setPreferences] = useState<PreferenceMap>({});
  const [initialPreferences, setInitialPreferences] = useState<PreferenceMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getNotificationPreferences()
      .then((data) => {
        if (cancelled) return;
        const map = toMap(data.preferences);
        setPreferences(map);
        setInitialPreferences(map);
      })
      .catch((error) => {
        console.error('Failed to load notification preferences:', error);
        if (!cancelled) toast.error('Failed to load notification preferences.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = JSON.stringify(preferences) !== JSON.stringify(initialPreferences);

  const updatePreference = (type: string, channel: 'in_app' | 'email', value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: { ...(prev[type] ?? { in_app: true, email: true }), [channel]: value },
    }));
  };

  const setAll = (value: boolean) => {
    setPreferences((prev) => {
      const next: PreferenceMap = {};
      for (const type of Object.keys(NOTIFICATION_TYPE_INFO)) {
        next[type] = { in_app: value, email: value };
      }
      return { ...prev, ...next };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: NotificationPreference[] = Object.entries(preferences).map(([type, v]) => ({
        type,
        in_app: v.in_app,
        email: v.email,
      }));
      await updateNotificationPreferences(payload);
      setInitialPreferences(preferences);
      toast.success('Notification preferences saved.');
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      toast.error('Failed to save notification preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const sections = SECTION_ORDER.map((section) => ({
    section,
    types: Object.entries(NOTIFICATION_TYPE_INFO).filter(([, info]) => info.section === section),
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className={`w-6 h-6 animate-spin ${theme === 'dark' ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
        theme === 'dark'
          ? 'bg-[#2d2820]/[0.4] border-white/10'
          : 'bg-white/[0.12] border-white/20'
      }`}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className={`text-[28px] font-bold mb-2 transition-colors ${
              theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}>Notification Preferences</h2>
            <p className={`text-[14px] transition-colors ${
              theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
            }`}>Choose which updates you get in-app and by email.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAll(true)}
              className={`px-5 py-2.5 rounded-[12px] backdrop-blur-[30px] border font-medium text-[14px] hover:bg-white/[0.25] transition-all ${
                theme === 'dark'
                  ? 'bg-[#3d342c]/[0.5] border-white/20 text-[#d4c5b0]'
                  : 'bg-white/[0.2] border-white/30 text-[#2d2820]'
              }`}
            >
              Enable all
            </button>
            <button
              onClick={() => setAll(false)}
              className={`px-5 py-2.5 rounded-[12px] backdrop-blur-[30px] border font-medium text-[14px] hover:bg-white/[0.25] transition-all ${
                theme === 'dark'
                  ? 'bg-[#3d342c]/[0.5] border-white/20 text-[#d4c5b0]'
                  : 'bg-white/[0.2] border-white/30 text-[#2d2820]'
              }`}
            >
              Disable all
            </button>
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_140px_140px] gap-4 pb-4 border-b border-white/10">
          <div></div>
          <div className={`text-[13px] font-semibold text-center transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>In-App</div>
          <div className={`text-[13px] font-semibold text-center flex items-center justify-center gap-2 transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>
            Email
            <Info className={`w-4 h-4 transition-colors ${
              theme === 'dark' ? 'text-[#8a7e70]' : 'text-[#7a6b5a]'
            }`} />
          </div>
        </div>
      </div>

      {sections.map(({ section, types }) => (
        <NotificationSection key={section} title={section}>
          {types.map(([type, info], index) => {
            const pref = preferences[type] ?? { in_app: true, email: true };
            return (
              <NotificationRow
                key={type}
                title={info.title}
                description={info.description}
                inAppEnabled={pref.in_app}
                emailEnabled={pref.email}
                onInAppChange={(val) => updatePreference(type, 'in_app', val)}
                onEmailChange={(val) => updatePreference(type, 'email', val)}
                showBorder={index < types.length - 1}
              />
            );
          })}
        </NotificationSection>
      ))}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="px-8 py-3 rounded-[16px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[15px] shadow-[0_6px_24px_rgba(162,121,44,0.4)] hover:shadow-[0_8px_28px_rgba(162,121,44,0.5)] transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_6px_24px_rgba(162,121,44,0.4)]"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
