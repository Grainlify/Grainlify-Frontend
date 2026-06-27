import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BillingProfileCard } from './BillingProfileCard';
import { ThemeProvider } from '../../../../shared/contexts/ThemeContext';
import { BillingProfile } from '../../types';

vi.mock('lucide-react', () => ({
  CheckCircle2: () => <svg data-testid="icon-check" />,
  AlertTriangle: () => <svg data-testid="icon-alert" />,
  XOctagon: () => <svg data-testid="icon-x" />
}));

const mockProfile: BillingProfile = {
  id: '1',
  name: 'Test Profile',
  type: 'organization' as any,
  status: 'verified' as any,
  email: 'test@example.com',
};

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
};

describe('BillingProfileCard', () => {
  it('renders profile name and type', () => {
    renderWithTheme(<BillingProfileCard profile={mockProfile} onClick={() => {}} />);
    expect(screen.getByText('Test Profile')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
  });

  it('renders correctly with personal type', () => {
    renderWithTheme(<BillingProfileCard profile={{...mockProfile, type: 'personal' as any}} onClick={() => {}} />);
    expect(screen.getByText('personal')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    renderWithTheme(<BillingProfileCard profile={mockProfile} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter key is pressed', () => {
    const handleClick = vi.fn();
    renderWithTheme(<BillingProfileCard profile={mockProfile} onClick={handleClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('calls onClick when Space key is pressed', () => {
    const handleClick = vi.fn();
    renderWithTheme(<BillingProfileCard profile={mockProfile} onClick={handleClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders verified status with correct icon and accessible name', () => {
    renderWithTheme(<BillingProfileCard profile={{...mockProfile, status: 'verified' as any}} onClick={() => {}} />);
    const statusDiv = screen.getByRole('status');
    expect(statusDiv).toHaveAttribute('aria-label', 'Status: Verified');
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('renders missing-verification status with correct icon and accessible name', () => {
    renderWithTheme(<BillingProfileCard profile={{...mockProfile, status: 'missing-verification' as any}} onClick={() => {}} />);
    const statusDiv = screen.getByRole('status');
    expect(statusDiv).toHaveAttribute('aria-label', 'Status: Missing Verification');
    expect(screen.getByTestId('icon-alert')).toBeInTheDocument();
  });

  it('renders limit-reached status with correct icon and accessible name', () => {
    renderWithTheme(<BillingProfileCard profile={{...mockProfile, status: 'limit-reached' as any}} onClick={() => {}} />);
    const statusDiv = screen.getByRole('status');
    expect(statusDiv).toHaveAttribute('aria-label', 'Status: Individual Limit Reached');
    expect(screen.getByTestId('icon-x')).toBeInTheDocument();
  });

  it('handles unknown status gracefully', () => {
    renderWithTheme(<BillingProfileCard profile={{...mockProfile, status: 'unknown' as any}} onClick={() => {}} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('handles missing type gracefully', () => {
    renderWithTheme(<BillingProfileCard profile={{...mockProfile, type: undefined as any}} onClick={() => {}} />);
    expect(screen.getByText('Test Profile')).toBeInTheDocument();
  });
});
