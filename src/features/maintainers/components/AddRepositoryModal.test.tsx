import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../../../test/renderWithTheme';
import { createProject, getEcosystems } from '../../../shared/api/client';
import { AddRepositoryModal } from './AddRepositoryModal';

vi.mock('../../../shared/api/client', () => ({
  createProject: vi.fn(),
  getEcosystems: vi.fn(),
}));

const mockedCreateProject = vi.mocked(createProject);
const mockedGetEcosystems = vi.mocked(getEcosystems);

function installLocalStorageShim() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      clear: vi.fn(() => store.clear()),
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      removeItem: vi.fn((key: string) => store.delete(key)),
      setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    },
  });
}

function renderModal({
  theme = 'light',
  onClose = vi.fn(),
  onSuccess = vi.fn(),
}: {
  theme?: 'light' | 'dark';
  onClose?: () => void;
  onSuccess?: () => void;
} = {}) {
  return renderWithTheme(
    <AddRepositoryModal isOpen onClose={onClose} onSuccess={onSuccess} />,
    { theme },
  );
}

async function selectEcosystem(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(screen.getByRole('option', { name: 'React' })).toBeInTheDocument();
  });
  await user.selectOptions(screen.getByRole('combobox', { name: /ecosystem/i }), 'React');
}

describe('AddRepositoryModal repository validation', () => {
  beforeEach(() => {
    installLocalStorageShim();
    mockedGetEcosystems.mockResolvedValue({
      ecosystems: [
        {
          id: 'ecosystem-1',
          name: 'React',
          slug: 'react',
          description: null,
          logo_url: null,
          website_url: null,
          status: 'active',
          project_count: 1,
          user_count: 1,
          created_at: '2026-06-21T00:00:00Z',
          updated_at: '2026-06-21T00:00:00Z',
        },
      ],
    });
    mockedCreateProject.mockResolvedValue({
      id: 'project-1',
      github_full_name: 'facebook/react',
      status: 'pending',
      ecosystem_name: 'React',
      language: '',
      tags: [],
      category: '',
      created_at: '2026-06-21T00:00:00Z',
      updated_at: '2026-06-21T00:00:00Z',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('submits a valid trimmed owner/repo value', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText(/facebook\/react/i), '  facebook/react  ');
    await selectEcosystem(user);
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    await waitFor(() => {
      expect(mockedCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          github_full_name: 'facebook/react',
          ecosystem_name: 'React',
        }),
      );
    });
  });

  it('rejects repository names without a slash', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText(/facebook\/react/i), 'facebook');
    await selectEcosystem(user);
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Repository name must be in format: owner/repo',
    );
    expect(screen.getByPlaceholderText(/facebook\/react/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(mockedCreateProject).not.toHaveBeenCalled();
  });

  it('rejects an empty repository name with an inline alert', async () => {
    const user = userEvent.setup();
    renderModal();

    await selectEcosystem(user);
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Repository name is required (format: owner/repo)',
    );
    expect(mockedCreateProject).not.toHaveBeenCalled();
  });

  it.each([
    ['missing owner', '/react'],
    ['missing repo', 'facebook/'],
    ['space in owner', 'face book/react'],
    ['invalid owner underscore', 'face_book/react'],
    ['invalid repo character', 'facebook/re act'],
    ['consecutive owner hyphens', 'face--book/react'],
  ])('rejects %s', async (_caseName, repositoryName) => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText(/facebook\/react/i), repositoryName);
    await selectEcosystem(user);
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Use owner/repo with a valid GitHub owner and repository name',
    );
    expect(mockedCreateProject).not.toHaveBeenCalled();
  });

  it('rejects oversized repository names before calling the API', async () => {
    const user = userEvent.setup();
    renderModal();

    fireEvent.change(screen.getByPlaceholderText(/facebook\/react/i), {
      target: { value: `owner/${'a'.repeat(136)}` },
    });
    await selectEcosystem(user);
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Repository name must be 140 characters or fewer',
    );
    expect(mockedCreateProject).not.toHaveBeenCalled();
  });

  it('documents the accepted owner/repository format near the input', () => {
    renderModal();

    expect(
      screen.getByText(/owners may use letters, numbers, and single hyphens/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/facebook\/react/i)).toHaveAttribute(
      'aria-describedby',
      'repository-name-help',
    );
  });

  it('includes optional metadata when provided', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/repository name/i), 'grainlify/frontend');
    await selectEcosystem(user);
    await user.type(screen.getByPlaceholderText(/typescript/i), ' TypeScript ');
    await user.type(screen.getByPlaceholderText(/good first issue/i), ' frontend, bug,  ');
    await user.type(screen.getByPlaceholderText(/frontend, backend/i), ' UI ');
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    await waitFor(() => {
      expect(mockedCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          github_full_name: 'grainlify/frontend',
          language: 'TypeScript',
          tags: ['frontend', 'bug'],
          category: 'UI',
        }),
      );
    });
  });

  it('shows API errors in an assertive alert', async () => {
    const user = userEvent.setup();
    mockedCreateProject.mockRejectedValueOnce(new Error('Backend rejected repository'));
    renderModal();

    await user.type(screen.getByLabelText(/repository name/i), 'grainlify/frontend');
    await selectEcosystem(user);
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Backend rejected repository',
    );
  });

  it('shows ecosystem loading failures in an assertive alert', async () => {
    mockedGetEcosystems.mockRejectedValueOnce(new Error('Failed to fetch ecosystems'));
    renderModal();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to fetch ecosystems',
    );
  });

  it('calls onSuccess and onClose after a successful submit', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    renderModal({ onClose, onSuccess });

    await user.type(screen.getByLabelText(/repository name/i), 'grainlify/frontend');
    await selectEcosystem(user);
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    expect(await screen.findByText('Repository added successfully!')).toBeInTheDocument();

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    }, { timeout: 2500 });
  });

  it('resets field state when closed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });

    await user.type(screen.getByLabelText(/repository name/i), 'bad repo');
    await selectEcosystem(user);
    await user.click(screen.getByRole('button', { name: /add repository/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Repository name must be in format: owner/repo',
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the loading and disabled ecosystem state', () => {
    mockedGetEcosystems.mockReturnValue(new Promise(() => {}));
    renderModal();

    expect(screen.queryByRole('combobox', { name: /ecosystem/i })).not.toBeInTheDocument();
  });

  it('renders validation affordances in the dark theme', async () => {
    const user = userEvent.setup();
    renderModal({ theme: 'dark' });

    await user.type(screen.getByLabelText(/repository name/i), 'grainlify/frontend');
    await selectEcosystem(user);
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    await waitFor(() => {
      expect(mockedCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ github_full_name: 'grainlify/frontend' }),
      );
    });
  });
});
