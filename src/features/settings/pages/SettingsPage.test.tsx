import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPage } from './SettingsPage';
import { I18nProvider } from '../../../shared/i18n';

// Mock contexts and components to isolate testing of the tab functionality
vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('../contexts/BillingProfilesContext', () => ({
  BillingProfilesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/profile/ProfileTab', () => ({ ProfileTab: () => <div>Profile Content</div> }));
vi.mock('../components/notifications/NotificationsTab', () => ({ NotificationsTab: () => <div>Notifications Content</div> }));
vi.mock('../components/payout/PayoutTab', () => ({ PayoutTab: () => <div>Payout Content</div> }));
vi.mock('../components/billing/BillingTab', () => ({ BillingTab: () => <div>Billing Content</div> }));
vi.mock('../components/terms/TermsTab', () => ({ TermsTab: () => <div>Terms Content</div> }));

function renderSettingsPage(props?: React.ComponentProps<typeof SettingsPage>) {
  return render(
    <I18nProvider>
      <SettingsPage {...props} />
    </I18nProvider>
  );
}

describe('SettingsPage Tabs Accessibility', () => {
  beforeEach(() => {
    // We need to mock requestAnimationFrame for the focus management to work synchronously in tests
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 0;
    });
  });

  it('renders tab labels from the i18n catalog', () => {
    renderSettingsPage();

    expect(screen.getByRole('tab', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Payout Preferences' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Billing Profiles' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Terms and Conditions' })).toBeInTheDocument();
  });

  it('applies correct ARIA roles and associations', () => {
    renderSettingsPage();

    // Check tablist
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveAttribute('aria-label', 'Settings');

    // Check tabs
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);

    // Initial state: first tab is active
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabIndex', '0');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('tabIndex', '-1');

    // Check active tabpanel association
    const activePanel = screen.getByRole('tabpanel');
    expect(activePanel).toBeInTheDocument();
    expect(activePanel).toHaveAttribute('id', 'panel-profile');
    expect(activePanel).toHaveAttribute('aria-labelledby', 'tab-profile');
    
    // Verify first tab controls first panel
    expect(tabs[0]).toHaveAttribute('aria-controls', 'panel-profile');
    expect(tabs[0]).toHaveAttribute('id', 'tab-profile');
  });

  it('updates aria-selected when a tab is clicked', () => {
    renderSettingsPage();
    const tabs = screen.getAllByRole('tab');
    
    fireEvent.click(tabs[1]); // Click 'Notifications' tab
    
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    
    const activePanel = screen.getByRole('tabpanel');
    expect(activePanel).toHaveAttribute('id', 'panel-notifications');
    expect(screen.getByText('Notifications Content')).toBeInTheDocument();
  });

  describe('Keyboard Navigation', () => {
    it('moves focus and selection to the next tab on ArrowRight', () => {
      renderSettingsPage();
      const tabs = screen.getAllByRole('tab');
      
      // Starting on first tab
      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
      
      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveFocus();
    });

    it('moves focus and selection to the previous tab on ArrowLeft', () => {
      renderSettingsPage({ initialTab: 'notifications' });
      const tabs = screen.getAllByRole('tab');
      
      // Starting on second tab
      fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });
      
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[0]).toHaveFocus();
    });

    it('wraps around to the first tab when pressing ArrowRight on the last tab', () => {
      renderSettingsPage({ initialTab: 'terms' }); // 'terms' is the last tab
      const tabs = screen.getAllByRole('tab');
      
      fireEvent.keyDown(tabs[4], { key: 'ArrowRight' });
      
      expect(tabs[4]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[0]).toHaveFocus();
    });

    it('wraps around to the last tab when pressing ArrowLeft on the first tab', () => {
      renderSettingsPage(); // 'profile' is the first tab
      const tabs = screen.getAllByRole('tab');
      
      fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
      
      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[4]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[4]).toHaveFocus();
    });

    it('jumps to the first tab when pressing Home', () => {
      renderSettingsPage({ initialTab: 'payout' }); // middle tab
      const tabs = screen.getAllByRole('tab');
      
      fireEvent.keyDown(tabs[2], { key: 'Home' });
      
      expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[0]).toHaveFocus();
    });

    it('jumps to the last tab when pressing End', () => {
      renderSettingsPage({ initialTab: 'profile' }); // first tab
      const tabs = screen.getAllByRole('tab');
      
      fireEvent.keyDown(tabs[0], { key: 'End' });
      
      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[4]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[4]).toHaveFocus();
    });
  });
});
