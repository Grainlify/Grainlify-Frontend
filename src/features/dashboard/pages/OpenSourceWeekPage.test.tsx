import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../../shared/contexts/ThemeContext';
import { OpenSourceWeekPage } from './OpenSourceWeekPage';
import { getOpenSourceWeekEvents } from '../../../shared/api/client';

// Mock the API client
vi.mock('../../../shared/api/client', () => ({
  getOpenSourceWeekEvents: vi.fn(),
}));

const mockOnEventClick = vi.fn();

const renderPage = () =>
  render(
    <ThemeProvider>
      <OpenSourceWeekPage onEventClick={mockOnEventClick} />
    </ThemeProvider>
  );

describe('OpenSourceWeekPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeletons while loading', async () => {
    (getOpenSourceWeekEvents as any).mockReturnValue(new Promise(() => {}));
    renderPage();

    // Better: look for the skeleton layout elements
    const skeletons = document.querySelectorAll('.animate-shimmer');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no events are returned', async () => {
    (getOpenSourceWeekEvents as any).mockResolvedValue({ events: [] });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No Open-Source Week events yet/i)).toBeInTheDocument();
    });
  });

  it('shows error state and retries', async () => {
    (getOpenSourceWeekEvents as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        events: [
          {
            id: '1',
            title: 'Test Event',
            description: 'Desc',
            location: 'Remote',
            status: 'upcoming',
            start_at: '2023-01-01T10:00:00Z',
            end_at: '2023-01-07T10:00:00Z',
          },
        ],
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load events/i)).toBeInTheDocument();
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument();
    });
    expect(getOpenSourceWeekEvents).toHaveBeenCalledTimes(2);
  });

  it('calls onEventClick when an event is clicked', async () => {
    (getOpenSourceWeekEvents as any).mockResolvedValue({
      events: [
        {
          id: '123',
          title: 'Click Me',
          description: 'Desc',
          location: 'Remote',
          status: 'running',
          start_at: '2023-01-01T10:00:00Z',
          end_at: '2023-01-07T10:00:00Z',
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    const eventCard = screen.getByText('Click Me').closest('.cursor-pointer');
    await userEvent.click(eventCard!);

    expect(mockOnEventClick).toHaveBeenCalledWith('123', 'Click Me');
  });
});
