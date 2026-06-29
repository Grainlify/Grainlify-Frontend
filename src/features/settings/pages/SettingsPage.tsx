import { useState, KeyboardEvent } from 'react'
import { SettingsTabType } from '../types'
import { ProfileTab } from '../components/profile/ProfileTab'
import { NotificationsTab } from '../components/notifications/NotificationsTab'
import { PayoutTab } from '../components/payout/PayoutTab'
import { BillingTab } from '../components/billing/BillingTab'
import { TermsTab } from '../components/terms/TermsTab'
import { useTheme } from '../../../shared/contexts/ThemeContext'
import { BillingProfilesProvider } from '../contexts/BillingProfilesContext'
import { LocaleSwitcher } from '../../../shared/i18n'

interface SettingsPageProps {
  initialTab?: SettingsTabType
}

/**
 * SettingsPage component implements the WAI-ARIA tabs pattern.
 * It provides accessible navigation between different settings sections.
 *
 * ARIA Pattern Implementation:
 * - `role="tablist"` on the container identifying it as a list of tabs
 * - `role="tab"` on each button, with `aria-selected` indicating active state
 * - `aria-controls` on each tab pointing to its associated tabpanel
 * - `tabIndex` management to ensure only the active tab is in the focus sequence
 * - Arrow key navigation (Left/Right) to move between tabs, with wrap-around
 * - Home/End key support to jump to first/last tab
 * - `role="tabpanel"` on the content container, associated with the active tab via `aria-labelledby`
 */
export function SettingsPage({ initialTab = 'profile' }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab)
  const { theme } = useTheme()

  const tabs: { id: SettingsTabType; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'payout', label: 'Payout Preferences' },
    { id: 'billing', label: 'Billing Profiles' },
    { id: 'terms', label: 'Terms and Conditions' },
  ]

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index

    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1
    } else {
      return
    }

    e.preventDefault()
    const nextTabId = tabs[nextIndex].id
    setActiveTab(nextTabId)

    // Focus the next tab slightly after React processes the state update
    requestAnimationFrame(() => {
      const nextTab = document.getElementById(`tab-${nextTabId}`)
      nextTab?.focus()
    })
  }

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
          <div role="tablist" aria-label="Settings" className="flex items-center gap-2 p-2">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
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

        {/* Language preference */}
        <div
          className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors p-6 ${
            theme === 'dark'
              ? 'bg-[#2d2820]/[0.4] border-white/10'
              : 'bg-white/[0.12] border-white/20'
          }`}
        >
          <LocaleSwitcher className="max-w-xs" />
        </div>

        {/* Tab Content */}
        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'payout' && <PayoutTab />}
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'terms' && <TermsTab />}
        </div>
      </div>
    </BillingProfilesProvider>
  )
}
