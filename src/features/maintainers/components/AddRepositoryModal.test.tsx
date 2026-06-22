// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddRepositoryModal, validateRepoFormat } from './AddRepositoryModal';
import { renderWithTheme } from '../../../test/renderWithTheme';

const createProject = vi.fn();
const getEcosystems = vi.fn();

vi.mock('../../../shared/api/client', () => ({
  createProject: (...args: unknown[]) => createProject(...args),
  getEcosystems: (...args: unknown[]) => getEcosystems(...args),
}));

describe('validateRepoFormat unit tests', () => {
  it('accepts valid GitHub repository formats', () => {
    expect(validateRepoFormat('facebook/react')).toBeNull();
    expect(validateRepoFormat('owner-name/repo.name')).toBeNull();
    expect(validateRepoFormat('owner/repo_name-123')).toBeNull();
    expect(validateRepoFormat('39characterowner-1234567890123456789/repo')).toBeNull();
    expect(validateRepoFormat('owner/100characterrepo-12345678901234567890123456789012345678901234567890123456789012345678901234567890')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(validateRepoFormat('')).toContain('required');
    expect(validateRepoFormat('   ')).toContain('required');
  });

  it('rejects inputs longer than 140 characters', () => {
    const longInput = 'a'.repeat(40) + '/' + 'b'.repeat(101);
    expect(validateRepoFormat(longInput)).toContain('too long');
  });

  it('rejects input missing a slash', () => {
    expect(validateRepoFormat('owner-repo')).toContain('must be in format');
  });

  it('rejects input with multiple slashes', () => {
    expect(validateRepoFormat('owner/repo/extra')).toContain('exactly one slash');
  });

  it('rejects empty owner or repo segments', () => {
    expect(validateRepoFormat('/repo')).toContain('Owner segment cannot be empty');
    expect(validateRepoFormat('owner/')).toContain('Repository segment cannot be empty');
    expect(validateRepoFormat('/')).toContain('Owner segment cannot be empty');
  });

  it('rejects invalid GitHub owner names', () => {
    // Cannot start with hyphen
    expect(validateRepoFormat('-owner/repo')).toContain('Owner name must contain only');
    // Cannot end with hyphen
    expect(validateRepoFormat('owner-/repo')).toContain('Owner name must contain only');
    // Cannot have consecutive hyphens
    expect(validateRepoFormat('owner--name/repo')).toContain('Owner name must contain only');
    // Cannot contain invalid chars
    expect(validateRepoFormat('owner$/repo')).toContain('Owner name must contain only');
    expect(validateRepoFormat('owner name/repo')).toContain('Owner name must contain only');
    // Cannot be > 39 characters
    expect(validateRepoFormat('a'.repeat(40) + '/repo')).toContain('Owner name must contain only');
  });

  it('rejects invalid GitHub repository names', () => {
    // Cannot contain invalid characters (spaces, special chars)
    expect(validateRepoFormat('owner/repo name')).toContain('Repository name must contain only');
    expect(validateRepoFormat('owner/repo$')).toContain('Repository name must contain only');
    // Cannot be "." or ".."
    expect(validateRepoFormat('owner/.')).toContain('cannot be "." or ".."');
    expect(validateRepoFormat('owner/..')).toContain('cannot be "." or ".."');
    // Cannot be > 100 characters
    expect(validateRepoFormat('owner/' + 'b'.repeat(101))).toContain('Repository name must contain only');
  });
});

describe('AddRepositoryModal UI integration tests', () => {
  beforeEach(() => {
    createProject.mockReset();
    getEcosystems.mockReset();
    getEcosystems.mockResolvedValue({
      ecosystems: [
        { name: 'JavaScript', slug: 'javascript' },
        { name: 'TypeScript', slug: 'typescript' },
      ],
    });
  });

  it('renders input, select, and button fields correctly when open', async () => {
    renderWithTheme(
      <AddRepositoryModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Repository Name/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Repository/i })).toBeInTheDocument();
    });
  });

  it('validates and displays inline error on input blur', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <AddRepositoryModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />
    );

    const input = screen.getByLabelText(/Repository Name/i);
    await user.type(input, 'invalid owner/repo');
    fireEvent.blur(input);

    await waitFor(() => {
      const error = screen.getByRole('alert');
      expect(error).toBeInTheDocument();
      expect(error).toHaveTextContent(/Owner name must contain only/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'github-fullname-error');
    });
  });

  it('clears inline error when user types into the input', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <AddRepositoryModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />
    );

    const input = screen.getByLabelText(/Repository Name/i);
    await user.type(input, 'invalid owner/repo');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    await user.type(input, 'a');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-describedby', 'github-fullname-help');
  });

  it('blocks submission and displays inline error for invalid formats on submit', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <AddRepositoryModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />
    );

    await waitFor(() => expect(screen.getByRole('combobox')).not.toBeDisabled());

    const input = screen.getByLabelText(/Repository Name/i);
    await user.type(input, 'owner/repo$');

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'TypeScript');

    const submitBtn = screen.getByRole('button', { name: /Add Repository/i });
    await user.click(submitBtn);

    await waitFor(() => {
      const error = screen.getByRole('alert');
      expect(error).toBeInTheDocument();
      expect(error).toHaveTextContent(/Repository name must contain only/i);
      expect(createProject).not.toHaveBeenCalled();
    });
  });

  it('trims whitespace and submits successfully for valid inputs', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    createProject.mockResolvedValue({});

    renderWithTheme(
      <AddRepositoryModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />
    );

    await waitFor(() => expect(screen.getByRole('combobox')).not.toBeDisabled());

    const input = screen.getByLabelText(/Repository Name/i);
    await user.type(input, '  facebook/react   ');

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'TypeScript');

    const submitBtn = screen.getByRole('button', { name: /Add Repository/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith({
        github_full_name: 'facebook/react',
        ecosystem_name: 'TypeScript',
        language: undefined,
        tags: undefined,
        category: undefined,
      });
      expect(screen.getByText(/Repository added successfully!/i)).toBeInTheDocument();
    });
  });
});
