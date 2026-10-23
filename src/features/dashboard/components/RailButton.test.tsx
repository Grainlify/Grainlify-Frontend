import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Compass } from 'lucide-react';
import { RailButton } from './RailButton';

describe('RailButton', () => {
  it('defaults accessible name to label when ariaLabel is omitted', () => {
    render(
      <RailButton
        icon={Compass}
        label="Discover"
        isActive={false}
        onClick={vi.fn()}
        onHover={vi.fn()}
        darkTheme={false}
      />
    );

    const button = screen.getByRole('button', { name: 'Discover' });
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-label')).toBe('Discover');
  });

  it('uses explicit ariaLabel when provided', () => {
    render(
      <RailButton
        icon={Compass}
        label="Get help"
        ariaLabel="Get help or report a problem"
        isActive={false}
        onClick={vi.fn()}
        onHover={vi.fn()}
        darkTheme={false}
      />
    );

    const button = screen.getByRole('button', { name: 'Get help or report a problem' });
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-label')).toBe('Get help or report a problem');
  });

  it('sets aria-current="page" when active', () => {
    render(
      <RailButton
        icon={Compass}
        label="Browse"
        isActive={true}
        onClick={vi.fn()}
        onHover={vi.fn()}
        darkTheme={false}
      />
    );

    const button = screen.getByRole('button', { name: 'Browse' });
    expect(button.getAttribute('aria-current')).toBe('page');
  });
});
