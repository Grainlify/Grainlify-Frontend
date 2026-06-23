import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TermsTab, CURRENT_TERMS_VERSION } from './TermsTab';
import { getTermsStatus, acceptTerms } from '../../../../shared/api/client';
import { ThemeProvider } from '../../../../shared/contexts/ThemeContext';

// Mock the API client
vi.mock('../../../../shared/api/client', () => ({
  getTermsStatus: vi.fn(),
  acceptTerms: vi.fn(),
}));

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
};

describe('TermsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(getTermsStatus).mockImplementation(() => new Promise(() => {}));
    renderWithTheme(<TermsTab />);
    
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('renders terms content and accept button when not accepted', async () => {
    vi.mocked(getTermsStatus).mockResolvedValue({
      accepted: false,
      version: null,
      accepted_at: null,
    });

    renderWithTheme(<TermsTab />);
    
    const button = await screen.findByRole('button', { name: 'Accept' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    // Check links exist
    const tosLinks = screen.getAllByRole('link', { name: /terms of service/i });
    expect(tosLinks.length).toBeGreaterThan(0);
    expect(tosLinks[0]).toHaveAttribute('href', '/terms');

    const privacyLinks = screen.getAllByRole('link', { name: /privacy policy/i });
    expect(privacyLinks.length).toBeGreaterThan(0);
    expect(privacyLinks[0]).toHaveAttribute('href', '/privacy');
  });

  it('shows accepted state if already accepted from API', async () => {
    vi.mocked(getTermsStatus).mockResolvedValue({
      accepted: true,
      version: '1.0.0',
      accepted_at: '2023-10-01T12:00:00Z',
    });

    renderWithTheme(<TermsTab />);
    
    const button = await screen.findByRole('button', { name: 'Accepted' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();

    // Check version and date message
    const message = await screen.findByText(/✓ Accepted version 1\.0\.0 on/);
    expect(message).toBeInTheDocument();
  });

  it('handles successful terms acceptance', async () => {
    vi.mocked(getTermsStatus).mockResolvedValue({
      accepted: false,
      version: null,
      accepted_at: null,
    });
    
    const acceptedDate = '2023-10-02T12:00:00Z';
    vi.mocked(acceptTerms).mockResolvedValue({
      ok: true,
      version: CURRENT_TERMS_VERSION,
      accepted_at: acceptedDate,
    });

    renderWithTheme(<TermsTab />);
    
    const button = await screen.findByRole('button', { name: 'Accept' });
    
    fireEvent.click(button);
    
    expect(button).toHaveTextContent('Accepting...');
    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(acceptTerms).toHaveBeenCalledWith(CURRENT_TERMS_VERSION);
      expect(button).toHaveTextContent('Accepted');
      expect(button).toBeDisabled();
    });

    const message = await screen.findByText(new RegExp(`✓ Accepted version ${CURRENT_TERMS_VERSION} on`));
    expect(message).toBeInTheDocument();
  });

  it('handles error when accepting terms', async () => {
    vi.mocked(getTermsStatus).mockResolvedValue({
      accepted: false,
      version: null,
      accepted_at: null,
    });
    
    vi.mocked(acceptTerms).mockRejectedValue(new Error('Network error'));

    renderWithTheme(<TermsTab />);
    
    const button = await screen.findByRole('button', { name: 'Accept' });
    
    fireEvent.click(button);
    
    const errorMessage = await screen.findByText('Network error');
    expect(errorMessage).toBeInTheDocument();
    
    // Button should be re-enabled
    expect(button).toHaveTextContent('Accept');
    expect(button).not.toBeDisabled();
  });

  it('handles error when getting status', async () => {
    // Should suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    vi.mocked(getTermsStatus).mockRejectedValue(new Error('Fetch failed'));

    renderWithTheme(<TermsTab />);
    
    const button = await screen.findByRole('button', { name: 'Accept' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch terms status:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
