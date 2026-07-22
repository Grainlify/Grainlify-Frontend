// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationRow } from '../notifications/NotificationRow';
import { ToggleSwitch } from './ToggleSwitch';

vi.mock('../../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

describe('ToggleSwitch accessibility', () => {
  it('exposes switch role, checked state, and accessible label', () => {
    render(
      <ToggleSwitch
        enabled
        onChange={() => {}}
        aria-label="Email notifications"
      />,
    );

    const toggle = screen.getByRole('switch', { name: 'Email notifications' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('reflects disabled state through aria-checked', () => {
    render(
      <ToggleSwitch
        enabled={false}
        onChange={() => {}}
        aria-label="Email notifications"
      />,
    );

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('supports aria-labelledby for a visible label', () => {
    render(
      <>
        <span id="billing-toggle-label">Billing notifications</span>
        <ToggleSwitch
          enabled
          onChange={() => {}}
          aria-labelledby="billing-toggle-label"
        />
      </>,
    );

    expect(
      screen.getByRole('switch', { name: 'Billing notifications' }),
    ).toBeInTheDocument();
  });

  it('calls onChange with the next value when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ToggleSwitch
        enabled
        onChange={onChange}
        aria-label="Email notifications"
      />,
    );

    await user.click(screen.getByRole('switch', { name: 'Email notifications' }));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('calls onChange with true when clicked while disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ToggleSwitch
        enabled={false}
        onChange={onChange}
        aria-label="Email notifications"
      />,
    );

    await user.click(screen.getByRole('switch', { name: 'Email notifications' }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles with Space using native button behavior', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ToggleSwitch
        enabled={false}
        onChange={onChange}
        aria-label="Email notifications"
      />,
    );

    const toggle = screen.getByRole('switch', { name: 'Email notifications' });
    toggle.focus();
    await user.type(toggle, '{space}');

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles with Enter using native button behavior', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ToggleSwitch
        enabled={false}
        onChange={onChange}
        aria-label="Email notifications"
      />,
    );

    const toggle = screen.getByRole('switch', { name: 'Email notifications' });
    toggle.focus();
    await user.type(toggle, '{enter}');

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('includes visible focus ring classes', () => {
    render(
      <ToggleSwitch
        enabled
        onChange={() => {}}
        aria-label="Email notifications"
      />,
    );

    expect(screen.getByRole('switch')).toHaveClass(
      'focus-visible:ring-2',
      'focus-visible:ring-[#c9983a]',
    );
  });
});

describe('NotificationRow ToggleSwitch labels', () => {
  it('passes accessible labels and checked states to both switches', () => {
    render(
      <NotificationRow
        title="Billing Profile"
        description="Billing profile notifications."
        emailEnabled
        weeklyEnabled={false}
        onEmailChange={() => {}}
        onWeeklyChange={() => {}}
      />,
    );

    expect(
      screen.getByRole('switch', { name: 'Email notifications for Billing Profile' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('switch', { name: 'Weekly summary email for Billing Profile' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('calls each NotificationRow switch handler', async () => {
    const user = userEvent.setup();
    const onEmailChange = vi.fn();
    const onWeeklyChange = vi.fn();
    render(
      <NotificationRow
        title="Billing Profile"
        description="Billing profile notifications."
        emailEnabled={false}
        weeklyEnabled
        onEmailChange={onEmailChange}
        onWeeklyChange={onWeeklyChange}
      />,
    );

    await user.click(
      screen.getByRole('switch', { name: 'Email notifications for Billing Profile' }),
    );
    await user.click(
      screen.getByRole('switch', { name: 'Weekly summary email for Billing Profile' }),
    );

    expect(onEmailChange).toHaveBeenCalledWith(true);
    expect(onWeeklyChange).toHaveBeenCalledWith(false);
  });
});
