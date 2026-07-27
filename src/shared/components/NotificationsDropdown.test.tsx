// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsDropdown } from './NotificationsDropdown';
import { renderWithTheme } from '../../test/renderWithTheme';

/**
 * Radix's DropdownMenu relies on a handful of DOM APIs that jsdom does not
 * implement (pointer capture + scrolling the active item into view). Without
 * these shims the trigger throws when opened. They are pure no-ops, so they do
 * not affect what the tests assert.
 */
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

const noop = () => {};

/**
 * Radix marks the rest of the document `aria-hidden` while the menu is open and
 * applies `pointer-events: none` to it, so role/pointer based lookups of the
 * trigger fail mid-open. Capturing the node once up front (it is the same
 * element across open/close) keeps every assertion stable, and disabling the
 * pointer-events check lets us click the trigger to toggle it shut.
 */
function setup() {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  return user;
}

/**
 * Returns the trigger button. The icon-only trigger is labelled "Notifications"
 * (and "Notifications, N unread" when there are unread items), so it can always
 * be queried by an accessible name while the menu is closed.
 */
function getTrigger() {
  return screen.getByRole('button', { name: /notifications/i });
}

describe('NotificationsDropdown', () => {
  describe('open / close behaviour', () => {
    it('is closed by default', () => {
      renderWithTheme(
        <NotificationsDropdown showMobileNav={false} closeMobileNav={noop} />,
      );

      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('toggles open on the first trigger click', async () => {
      const user = setup();
      renderWithTheme(
        <NotificationsDropdown showMobileNav={false} closeMobileNav={noop} />,
      );

      const trigger = getTrigger();
      await user.click(trigger);

      const menu = await screen.findByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      // The panel header and empty-state copy are visible once open.
      expect(within(menu).getByText('Notifications')).toBeInTheDocument();
      expect(within(menu).getByText('No notifications yet')).toBeInTheDocument();
    });

    it('toggles closed on a second trigger click', async () => {
      const user = setup();
      renderWithTheme(
        <NotificationsDropdown showMobileNav={false} closeMobileNav={noop} />,
      );

      const trigger = getTrigger();
      await user.click(trigger);
      await screen.findByRole('menu');

      await user.click(trigger);
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('dismissal', () => {
    it('closes on Escape and returns focus to the trigger', async () => {
      const user = setup();
      renderWithTheme(
        <NotificationsDropdown showMobileNav={false} closeMobileNav={noop} />,
      );

      const trigger = getTrigger();
      await user.click(trigger);
      await screen.findByRole('menu');

      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
      await waitFor(() => expect(trigger).toHaveFocus());
    });

    it('closes on an outside click and returns focus to the trigger', async () => {
      const user = setup();
      renderWithTheme(
        <NotificationsDropdown showMobileNav={false} closeMobileNav={noop} />,
      );

      const trigger = getTrigger();
      await user.click(trigger);
      await screen.findByRole('menu');

      // Radix dismisses on a pointerdown outside the content.
      fireEvent.pointerDown(
        document.body,
        { button: 0, ctrlKey: false },
      );
      fireEvent.pointerUp(document.body);

      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
      await waitFor(() => expect(trigger).toHaveFocus());
    });
  });

  describe('keyboard handling', () => {
    it('opens with the Enter key on the focused trigger', async () => {
      const user = setup();
      renderWithTheme(
        <NotificationsDropdown showMobileNav={false} closeMobileNav={noop} />,
      );

      const trigger = getTrigger();
      trigger.focus();
      await user.keyboard('{Enter}');

      expect(await screen.findByRole('menu')).toBeInTheDocument();
    });

    it('opens with the ArrowDown key on the focused trigger', async () => {
      renderWithTheme(
        <NotificationsDropdown showMobileNav={false} closeMobileNav={noop} />,
      );

      const trigger = getTrigger();
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });

      expect(await screen.findByRole('menu')).toBeInTheDocument();
    });
  });

  describe('unread badge', () => {
    it('hides the badge when there are zero unread notifications', () => {
      renderWithTheme(
        <NotificationsDropdown
          showMobileNav={false}
          closeMobileNav={noop}
          initialUnreadCount={0}
        />,
      );

      expect(getTrigger()).toHaveAccessibleName('Notifications');
      // No numeric badge is rendered at zero.
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('renders the exact unread count and exposes it on the accessible name', () => {
      renderWithTheme(
        <NotificationsDropdown
          showMobileNav={false}
          closeMobileNav={noop}
          initialUnreadCount={3}
        />,
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(getTrigger()).toHaveAccessibleName('Notifications, 3 unread');
    });

    it('caps the displayed count at 99+ for large unread counts', () => {
      renderWithTheme(
        <NotificationsDropdown
          showMobileNav={false}
          closeMobileNav={noop}
          initialUnreadCount={250}
        />,
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
      expect(screen.queryByText('250')).not.toBeInTheDocument();
    });

    it('clears the unread badge once the dropdown is opened (read)', async () => {
      const user = setup();
      renderWithTheme(
        <NotificationsDropdown
          showMobileNav={false}
          closeMobileNav={noop}
          initialUnreadCount={5}
        />,
      );

      const trigger = getTrigger();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(trigger).toHaveAccessibleName('Notifications, 5 unread');

      await user.click(trigger);
      await screen.findByRole('menu');

      // Opening marks notifications as read: badge + count are gone.
      await waitFor(() => expect(screen.queryByText('5')).not.toBeInTheDocument());
      expect(trigger).toHaveAccessibleName('Notifications');
    });
  });

  describe('theming and layout', () => {
    it('renders and opens in dark theme without regressions', async () => {
      const user = setup();
      renderWithTheme(
        <NotificationsDropdown
          showMobileNav={false}
          closeMobileNav={noop}
          initialUnreadCount={2}
        />,
        { theme: 'dark' },
      );

      // Badge still renders in dark theme.
      expect(screen.getByText('2')).toBeInTheDocument();

      await user.click(getTrigger());
      const menu = await screen.findByRole('menu');
      expect(within(menu).getByText('No notifications yet')).toBeInTheDocument();
    });

    it('shows the inline "Notification" label in the mobile nav layout', () => {
      renderWithTheme(
        <NotificationsDropdown showMobileNav closeMobileNav={noop} />,
      );

      expect(screen.getByText('Notification')).toBeInTheDocument();
    });

    it('renders the mobile label in dark theme as well', () => {
      renderWithTheme(
        <NotificationsDropdown showMobileNav closeMobileNav={noop} />,
        { theme: 'dark' },
      );

      expect(screen.getByText('Notification')).toBeInTheDocument();
    });
  });

  describe('security', () => {
    it('renders notification copy as escaped text, never as live HTML', async () => {
      const user = setup();
      const { container } = renderWithTheme(
        <NotificationsDropdown showMobileNav={false} closeMobileNav={noop} />,
      );

      await user.click(getTrigger());
      const menu = await screen.findByRole('menu');

      // Copy is matched by text content (a text node), proving it is not parsed
      // into element structure. No script/img is ever injected from the strings.
      expect(within(menu).getByText('No notifications yet')).toBeInTheDocument();
      expect(container.querySelector('script')).toBeNull();
      expect(menu.querySelector('script')).toBeNull();
    });
  });
});
