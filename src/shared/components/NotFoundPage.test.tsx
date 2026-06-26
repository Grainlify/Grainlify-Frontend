import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../contexts/ThemeContext';
import { NotFoundPage } from './NotFoundPage';

function renderNotFoundPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <NotFoundPage />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('renders Page Not Found as the single top-level heading', () => {
    renderNotFoundPage();

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Page Not Found',
    });

    expect(heading).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('keeps the recovery actions available', () => {
    renderNotFoundPage();

    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument();
  });
});