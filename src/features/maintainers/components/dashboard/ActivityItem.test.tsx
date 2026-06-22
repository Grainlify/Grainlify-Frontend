import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import { ActivityItem } from './ActivityItem';
import { useTheme } from '../../../../shared/contexts/ThemeContext';

// Mock theme hook to avoid needing full provider
vi.mock('../../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

const baseActivity = {
  id: 1,
  type: 'issue',
  number: 42,
  title: 'A sample activity',
  label: 'Open',
  timeAgo: '2 hours ago',
};

describe('ActivityItem', () => {
  it('is non-interactive when no onClick is provided', () => {
    const { container, queryByRole } = render(<ActivityItem activity={baseActivity as any} index={0} />);
    expect(queryByRole('button')).toBeNull();
    expect(container.firstChild).toHaveClass('cursor-default');
  });

  it('calls onClick when clicked and shows interactive attributes', () => {
    const handler = vi.fn();
    const { getByRole, container } = render(<ActivityItem activity={baseActivity as any} index={0} onClick={handler} />);
    const row = getByRole('button');
    expect(row).toHaveAttribute('tabindex', '0');
    expect(container.firstChild).toHaveClass('cursor-pointer');

    fireEvent.click(row);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('activates on Enter and Space key presses', () => {
    const handler = vi.fn();
    const { getByRole } = render(<ActivityItem activity={baseActivity as any} index={0} onClick={handler} />);
    const row = getByRole('button');

    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
