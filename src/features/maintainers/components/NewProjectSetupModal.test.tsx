// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '../../../test/renderWithTheme';
import { NewProjectSetupModal } from './NewProjectSetupModal';
import type { PendingSetupProject } from '../../../shared/api/client';

// --- Mock the API client -------------------------------------------------
// The modal calls `getEcosystems` on open and `updateProjectMetadata` on
// submit. Both are mocked so tests stay deterministic and offline.
const getEcosystems = vi.fn();
const updateProjectMetadata = vi.fn();
vi.mock('../../../shared/api/client', () => ({
  getEcosystems: (...args: unknown[]) => getEcosystems(...args),
  updateProjectMetadata: (...args: unknown[]) => updateProjectMetadata(...args),
}));

const ECOSYSTEMS = {
  ecosystems: [
    { name: 'Stellar', slug: 'stellar' },
    { name: 'Ethereum', slug: 'ethereum' },
  ],
};

function makeProject(overrides: Partial<PendingSetupProject> = {}): PendingSetupProject {
  return {
    id: 'proj-1',
    github_full_name: 'acme/widgets',
    description: 'Original description',
    ecosystem_id: 'eco-1',
    ecosystem_name: 'Stellar',
    language: 'TypeScript',
    tags: ['Payments', 'DeFi'],
    category: 'Backend',
    ...overrides,
  };
}

/** A deferred promise so a test can hold a submission "in flight". */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const getDescription = () =>
  screen.getByPlaceholderText('Brief description of the project') as HTMLTextAreaElement;
const getTags = () =>
  screen.getByPlaceholderText('e.g., Payments, DeFi, Tooling') as HTMLInputElement;
const getCategory = () =>
  screen.getByPlaceholderText('e.g., Frontend, Backend') as HTMLInputElement;

beforeEach(() => {
  getEcosystems.mockReset();
  updateProjectMetadata.mockReset();
  getEcosystems.mockResolvedValue(ECOSYSTEMS);
  updateProjectMetadata.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('NewProjectSetupModal', () => {
  describe('rendering', () => {
    it('renders nothing when closed', () => {
      const { container } = renderWithTheme(
        <NewProjectSetupModal
          isOpen={false}
          project={makeProject()}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByText('New Project Setup')).not.toBeInTheDocument();
    });

    it('populates the form from the project when opened', async () => {
      renderWithTheme(
        <NewProjectSetupModal
          isOpen
          project={makeProject()}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));
      expect(getTags()).toHaveValue('Payments, DeFi');
      expect(getCategory()).toHaveValue('Backend');
    });
  });

  describe('form reset on close', () => {
    it('starts clean when reopened for a different project after closing before submit', async () => {
      const user = userEvent.setup();
      const project = makeProject();
      const { rerender } = renderWithTheme(
        <NewProjectSetupModal
          isOpen
          project={project}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));

      // User edits the draft, then the modal is closed without submitting.
      await user.clear(getDescription());
      await user.type(getDescription(), 'Half-written draft');
      await user.clear(getTags());
      await user.type(getTags(), 'leaky, draft');
      expect(getDescription()).toHaveValue('Half-written draft');

      rerender(
        <NewProjectSetupModal
          isOpen={false}
          project={project}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      // Reopen for a DIFFERENT project: no trace of the previous draft.
      const other = makeProject({
        id: 'proj-2',
        github_full_name: 'acme/other',
        description: 'Other description',
        tags: ['Tooling'],
        category: 'Frontend',
      });
      rerender(
        <NewProjectSetupModal
          isOpen
          project={other}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Other description'));
      expect(getTags()).toHaveValue('Tooling');
      expect(getCategory()).toHaveValue('Frontend');
      // The stale draft text is nowhere to be found.
      expect(screen.queryByDisplayValue('Half-written draft')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('leaky, draft')).not.toBeInTheDocument();
    });

    it('clears the form to empty when reopened with a project that has empty metadata', async () => {
      const user = userEvent.setup();
      const project = makeProject();
      const { rerender } = renderWithTheme(
        <NewProjectSetupModal
          isOpen
          project={project}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));
      await user.clear(getDescription());
      await user.type(getDescription(), 'Edited');

      // Close, then reopen for a sparse project (nulls/empty arrays).
      rerender(
        <NewProjectSetupModal
          isOpen={false}
          project={project}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );
      const sparse = makeProject({
        id: 'proj-3',
        github_full_name: 'acme/sparse',
        description: null,
        ecosystem_name: '',
        language: null,
        tags: [],
        category: null,
      });
      rerender(
        <NewProjectSetupModal
          isOpen
          project={sparse}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      await waitFor(() => expect(screen.getByText('acme/sparse')).toBeInTheDocument());
      expect(getDescription()).toHaveValue('');
      expect(getTags()).toHaveValue('');
      expect(getCategory()).toHaveValue('');
      expect(screen.getByText('Select an ecosystem')).toBeInTheDocument();
    });
  });

  describe('in-flight submission on close', () => {
    it('does not fire success callbacks when the modal is closed mid-submission', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      const pending = deferred<{ ok: boolean }>();
      updateProjectMetadata.mockReturnValue(pending.promise);

      const project = makeProject();
      const { rerender } = renderWithTheme(
        <NewProjectSetupModal isOpen project={project} onClose={onClose} onSuccess={onSuccess} />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));

      // Start the submission; it stays pending.
      await user.click(screen.getByRole('button', { name: /save & continue/i }));
      await waitFor(() => expect(updateProjectMetadata).toHaveBeenCalledTimes(1));
      expect(screen.getByText('Saving...')).toBeInTheDocument();

      // Parent force-closes the modal while the request is still in flight.
      rerender(
        <NewProjectSetupModal isOpen={false} project={project} onClose={onClose} onSuccess={onSuccess} />,
      );

      // Now the in-flight request resolves — but the modal already closed.
      pending.resolve({ ok: true });
      await Promise.resolve();

      // The stale submission must not re-trigger success/close handlers.
      await waitFor(() => expect(onSuccess).not.toHaveBeenCalled());
      expect(screen.queryByText('Project details saved.')).not.toBeInTheDocument();
    });

    it('reopens with a clean form after a submission is abandoned by closing', async () => {
      const user = userEvent.setup();
      const pending = deferred<{ ok: boolean }>();
      updateProjectMetadata.mockReturnValue(pending.promise);

      const project = makeProject();
      const { rerender } = renderWithTheme(
        <NewProjectSetupModal isOpen project={project} onClose={vi.fn()} onSuccess={vi.fn()} />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));
      await user.clear(getDescription());
      await user.type(getDescription(), 'Submitting this one');
      await user.click(screen.getByRole('button', { name: /save & continue/i }));
      await waitFor(() => expect(updateProjectMetadata).toHaveBeenCalledTimes(1));

      // Close mid-submission, then let the request settle.
      rerender(
        <NewProjectSetupModal isOpen={false} project={project} onClose={vi.fn()} onSuccess={vi.fn()} />,
      );
      pending.resolve({ ok: true });
      await Promise.resolve();

      // Reopen for another project — clean slate, no leaked draft and no
      // lingering "Saving..." state.
      const next = makeProject({ id: 'proj-9', github_full_name: 'acme/next', description: 'Fresh' });
      rerender(
        <NewProjectSetupModal isOpen project={next} onClose={vi.fn()} onSuccess={vi.fn()} />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Fresh'));
      expect(screen.queryByDisplayValue('Submitting this one')).not.toBeInTheDocument();
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save & continue/i })).toBeEnabled();
    });

    it('closes via the backdrop when no submission is in flight', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithTheme(
        <NewProjectSetupModal isOpen project={makeProject()} onClose={onClose} onSuccess={vi.fn()} />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));

      // The modal renders through a portal on document.body; the backdrop is
      // the aria-hidden overlay sitting behind the dialog.
      const backdrop = document.querySelector('.bg-black\\/50[aria-hidden]') as HTMLElement;
      expect(backdrop).toBeTruthy();
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('blocks the user-initiated close (X button) while submitting', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const pending = deferred<{ ok: boolean }>();
      updateProjectMetadata.mockReturnValue(pending.promise);

      renderWithTheme(
        <NewProjectSetupModal isOpen project={makeProject()} onClose={onClose} onSuccess={vi.fn()} />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));
      await user.click(screen.getByRole('button', { name: /save & continue/i }));
      await waitFor(() => expect(screen.getByText('Saving...')).toBeInTheDocument());

      // The X button is disabled mid-submit, so onClose is never called.
      const xButton = screen.getAllByRole('button').find((b) => b.querySelector('svg.lucide-x'));
      expect(xButton).toBeDefined();
      if (xButton) await user.click(xButton);
      expect(onClose).not.toHaveBeenCalled();

      pending.resolve({ ok: true });
    });
  });

  describe('successful submit', () => {
    it('saves, shows success, and fires onSuccess + onClose', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onClose = vi.fn();

      renderWithTheme(
        <NewProjectSetupModal isOpen project={makeProject()} onClose={onClose} onSuccess={onSuccess} />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));
      await user.click(screen.getByRole('button', { name: /save & continue/i }));

      await waitFor(() => expect(updateProjectMetadata).toHaveBeenCalledTimes(1));
      expect(updateProjectMetadata).toHaveBeenCalledWith('proj-1', {
        description: 'Original description',
        ecosystem_name: 'Stellar',
        language: 'TypeScript',
        tags: ['Payments', 'DeFi'],
        category: 'Backend',
      });

      await waitFor(() => expect(screen.getByText('Project details saved.')).toBeInTheDocument());

      // The success path waits 800ms before closing; give it room with a
      // real-timer wait so it does not race the async ecosystem load.
      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 2000 });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows a validation error and never calls the API when ecosystem is empty', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <NewProjectSetupModal
          isOpen
          project={makeProject({ ecosystem_name: '' })}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));
      await user.click(screen.getByRole('button', { name: /save & continue/i }));

      expect(await screen.findByText('Ecosystem is required')).toBeInTheDocument();
      expect(updateProjectMetadata).not.toHaveBeenCalled();
    });

    it('surfaces an API error and stays open for retry', async () => {
      const user = userEvent.setup();
      updateProjectMetadata.mockRejectedValue(new Error('Server exploded'));

      renderWithTheme(
        <NewProjectSetupModal isOpen project={makeProject()} onClose={vi.fn()} onSuccess={vi.fn()} />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));
      await user.click(screen.getByRole('button', { name: /save & continue/i }));

      expect(await screen.findByText('Server exploded')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save & continue/i })).toBeEnabled();
    });
  });

  describe('ecosystem dropdown', () => {
    it('opens the dropdown and selects an ecosystem, submitting the chosen value', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <NewProjectSetupModal
          isOpen
          project={makeProject({ ecosystem_name: '' })}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));

      // Open the listbox and pick an ecosystem.
      await user.click(screen.getByRole('button', { name: /select an ecosystem/i }));
      const listbox = await screen.findByRole('listbox');
      await user.click(screen.getByRole('option', { name: 'Ethereum' }));

      await waitFor(() => expect(listbox).not.toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /save & continue/i }));

      await waitFor(() => expect(updateProjectMetadata).toHaveBeenCalledTimes(1));
      expect(updateProjectMetadata.mock.calls[0][1].ecosystem_name).toBe('Ethereum');
    });

    it('closes the open dropdown on an outside click', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <NewProjectSetupModal isOpen project={makeProject()} onClose={vi.fn()} onSuccess={vi.fn()} />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));
      await user.click(screen.getByRole('button', { name: /stellar/i }));
      expect(await screen.findByRole('listbox')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    });
  });

  describe('theming', () => {
    it('renders without regressions in dark theme', async () => {
      renderWithTheme(
        <NewProjectSetupModal isOpen project={makeProject()} onClose={vi.fn()} onSuccess={vi.fn()} />,
        { theme: 'dark' },
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));
      expect(screen.getByText('New Project Setup')).toBeInTheDocument();
      expect(screen.getByText('acme/widgets')).toBeInTheDocument();
    });

    it('surfaces a submit error in dark theme', async () => {
      const user = userEvent.setup();
      updateProjectMetadata.mockRejectedValue(new Error('Dark mode failure'));
      renderWithTheme(
        <NewProjectSetupModal isOpen project={makeProject()} onClose={vi.fn()} onSuccess={vi.fn()} />,
        { theme: 'dark' },
      );

      await waitFor(() => expect(getDescription()).toHaveValue('Original description'));
      await user.click(screen.getByRole('button', { name: /save & continue/i }));
      expect(await screen.findByText('Dark mode failure')).toBeInTheDocument();
    });

    it('uses the title override when provided', async () => {
      renderWithTheme(
        <NewProjectSetupModal
          isOpen
          project={makeProject()}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          title="Edit project"
        />,
      );

      await waitFor(() => expect(screen.getByText('Edit project')).toBeInTheDocument());
      expect(screen.queryByText('New Project Setup')).not.toBeInTheDocument();
    });
  });

  describe('ecosystem load failure', () => {
    it('shows an error when ecosystems fail to load', async () => {
      getEcosystems.mockRejectedValue(new Error('Network down'));
      renderWithTheme(
        <NewProjectSetupModal isOpen project={makeProject()} onClose={vi.fn()} onSuccess={vi.fn()} />,
      );

      expect(await screen.findByText('Network down')).toBeInTheDocument();
    });
  });

  describe('security', () => {
    it('does not submit a previous project draft for a newly opened project', async () => {
      const user = userEvent.setup();
      const projectA = makeProject({ id: 'A', description: 'A secret draft' });
      const { rerender } = renderWithTheme(
        <NewProjectSetupModal isOpen project={projectA} onClose={vi.fn()} onSuccess={vi.fn()} />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('A secret draft'));
      await user.clear(getDescription());
      await user.type(getDescription(), 'Tampered draft for A');

      // Close A's modal without submitting, then open project B.
      rerender(
        <NewProjectSetupModal isOpen={false} project={projectA} onClose={vi.fn()} onSuccess={vi.fn()} />,
      );
      const projectB = makeProject({ id: 'B', github_full_name: 'acme/b', description: 'B description' });
      rerender(
        <NewProjectSetupModal isOpen project={projectB} onClose={vi.fn()} onSuccess={vi.fn()} />,
      );

      await waitFor(() => expect(getDescription()).toHaveValue('B description'));
      await user.click(screen.getByRole('button', { name: /save & continue/i }));

      await waitFor(() => expect(updateProjectMetadata).toHaveBeenCalledTimes(1));
      // B's id is used and A's tampered draft never reaches the API.
      const [calledId, payload] = updateProjectMetadata.mock.calls[0];
      expect(calledId).toBe('B');
      expect(payload.description).toBe('B description');
      expect(payload.description).not.toBe('Tampered draft for A');
    });
  });
});
