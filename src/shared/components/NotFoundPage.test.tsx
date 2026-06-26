import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotFoundPage } from './NotFoundPage';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

describe('NotFoundPage', () => {
  it('renders Page Not Found as the single top-level heading', () => {
    render(<NotFoundPage />);

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Page Not Found',
    });

    expect(heading).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('keeps the recovery actions available', () => {
    render(<NotFoundPage />);

    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument();
  });
});