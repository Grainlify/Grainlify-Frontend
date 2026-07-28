import { render, screen, waitFor } from '@testing-library/react';
import { DataPage } from '../DataPage';

// Mock the fetch for the map data
global.fetch = jest.fn();

describe('DataPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<DataPage />);
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('should render map when data loads successfully', async () => {
    const mockData = { type: 'Topology', objects: {} };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<DataPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading map...')).not.toBeInTheDocument();
    });
    // The map should be rendered
    expect(document.querySelector('.rsm-svg')).toBeInTheDocument();
  });

  it('should show error when data fails to load', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    render(<DataPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load map data. Please refresh the page.')
      ).toBeInTheDocument();
    });
  });

  it('should show error when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(<DataPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load map data. Please refresh the page.')
      ).toBeInTheDocument();
    });
  });
});
