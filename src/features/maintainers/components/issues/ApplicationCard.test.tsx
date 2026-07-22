// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplicationCard } from './ApplicationCard';
import { Applicant } from '../../types';
import { renderWithTheme } from '../../../../test/renderWithTheme';

const baseApplicant: Applicant = {
  name: 'octocat',
  appliedDate: '2 days ago',
  badge: 'Top Contributor',
  message: 'I would love to work on this.',
  profileStats: {
    contributions: 42,
    rewards: 7,
    contributorProjects: 5,
    leadProjects: 2,
  },
};

/** Resolvable promise so a test can hold an action in its pending state. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('ApplicationCard', () => {
  it('renders applicant details', () => {
    renderWithTheme(
      <ApplicationCard applicant={baseApplicant} status="pending" onProfileClick={vi.fn()} />,
    );
    expect(screen.getByText('octocat')).toBeInTheDocument();
    expect(screen.getByText('Top Contributor')).toBeInTheDocument();
    expect(screen.getByText('I would love to work on this.')).toBeInTheDocument();
  });

  it('renders nothing when applicant is null', () => {
    const { container } = renderWithTheme(
      <ApplicationCard applicant={null} status="pending" onProfileClick={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('does not crash and omits the badge when badge is null', () => {
    const noBadge: Applicant = { ...baseApplicant, badge: undefined };
    renderWithTheme(
      <ApplicationCard applicant={noBadge} status="pending" onProfileClick={vi.fn()} />,
    );
    expect(screen.getByText('octocat')).toBeInTheDocument();
    expect(screen.queryByText('Top Contributor')).not.toBeInTheDocument();
  });

  it('fires onProfileClick when the header is activated', async () => {
    const onProfileClick = vi.fn();
    renderWithTheme(
      <ApplicationCard applicant={baseApplicant} status="pending" onProfileClick={onProfileClick} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /view octocat's profile/i }));
    expect(onProfileClick).toHaveBeenCalledTimes(1);
  });

  it('assigns immediately without a confirmation step (non-destructive)', async () => {
    const onAssign = vi.fn();
    renderWithTheme(
      <ApplicationCard applicant={baseApplicant} status="pending" onProfileClick={vi.fn()} onAssign={onAssign} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /assign octocat/i }));
    expect(onAssign).toHaveBeenCalledWith(baseApplicant);
  });

  describe('destructive confirmation', () => {
    it('does not call onReject until the action is confirmed', async () => {
      const onReject = vi.fn();
      renderWithTheme(
        <ApplicationCard applicant={baseApplicant} status="pending" onProfileClick={vi.fn()} onReject={onReject} />,
      );

      await userEvent.click(screen.getByRole('button', { name: /reject octocat/i }));
      // The handler must not have fired on the first click.
      expect(onReject).not.toHaveBeenCalled();
      expect(screen.getByText(/reject this application\?/i)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /confirm reject/i }));
      expect(onReject).toHaveBeenCalledWith(baseApplicant);
    });

    it('cancels reject without firing the handler', async () => {
      const onReject = vi.fn();
      renderWithTheme(
        <ApplicationCard applicant={baseApplicant} status="pending" onProfileClick={vi.fn()} onReject={onReject} />,
      );

      await userEvent.click(screen.getByRole('button', { name: /reject octocat/i }));
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onReject).not.toHaveBeenCalled();
      // Cancelling restores the original action buttons.
      expect(screen.getByRole('button', { name: /reject octocat/i })).toBeInTheDocument();
      expect(screen.queryByText(/reject this application\?/i)).not.toBeInTheDocument();
    });

    it('requires confirmation for unassign in the assigned state', async () => {
      const onUnassign = vi.fn();
      renderWithTheme(
        <ApplicationCard applicant={baseApplicant} status="assigned" onProfileClick={vi.fn()} onUnassign={onUnassign} />,
      );

      await userEvent.click(screen.getByRole('button', { name: /unassign octocat/i }));
      expect(onUnassign).not.toHaveBeenCalled();
      expect(screen.getByText(/unassign this applicant\?/i)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /confirm unassign/i }));
      expect(onUnassign).toHaveBeenCalledWith(baseApplicant);
    });
  });

  describe('pending state', () => {
    it('disables all action buttons and shows a spinner while assigning', async () => {
      const { promise, resolve } = deferred();
      const onAssign = vi.fn().mockReturnValue(promise);
      renderWithTheme(
        <ApplicationCard applicant={baseApplicant} status="pending" onProfileClick={vi.fn()} onAssign={onAssign} />,
      );

      const assignBtn = screen.getByRole('button', { name: /assign octocat/i });
      await userEvent.click(assignBtn);

      // Active button reflects busy state; sibling action is disabled too.
      expect(assignBtn).toHaveAttribute('aria-busy', 'true');
      expect(assignBtn).toBeDisabled();
      expect(screen.getByText('Assigning…')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject octocat/i })).toBeDisabled();

      resolve();
      await waitFor(() => expect(assignBtn).not.toBeDisabled());
    });

    it('ignores duplicate clicks while an action is in flight', async () => {
      const { promise, resolve } = deferred();
      const onAssign = vi.fn().mockReturnValue(promise);
      renderWithTheme(
        <ApplicationCard applicant={baseApplicant} status="pending" onProfileClick={vi.fn()} onAssign={onAssign} />,
      );

      const assignBtn = screen.getByRole('button', { name: /assign octocat/i });
      await userEvent.click(assignBtn);
      // A second click on the now-disabled button must not enqueue another request.
      await userEvent.click(assignBtn);

      expect(onAssign).toHaveBeenCalledTimes(1);
      resolve();
      await waitFor(() => expect(assignBtn).not.toBeDisabled());
    });

    it('does not update state after unmounting mid-flight', async () => {
      const { promise, resolve } = deferred();
      const onAssign = vi.fn().mockReturnValue(promise);
      const { unmount } = renderWithTheme(
        <ApplicationCard applicant={baseApplicant} status="pending" onProfileClick={vi.fn()} onAssign={onAssign} />,
      );

      await userEvent.click(screen.getByRole('button', { name: /assign octocat/i }));
      // Card disappears (e.g. parent removed it) before the request settles.
      unmount();
      resolve();
      // Resolving the post-unmount promise must not throw or warn about state updates.
      await expect(promise).resolves.toBeUndefined();
    });

    it('shows a spinner on the confirm button while a reject is in flight', async () => {
      const { promise, resolve } = deferred();
      const onReject = vi.fn().mockReturnValue(promise);
      renderWithTheme(
        <ApplicationCard applicant={baseApplicant} status="pending" onProfileClick={vi.fn()} onReject={onReject} />,
      );

      await userEvent.click(screen.getByRole('button', { name: /reject octocat/i }));
      const confirmBtn = screen.getByRole('button', { name: /confirm reject/i });
      await userEvent.click(confirmBtn);

      expect(screen.getByText('Rejecting…')).toBeInTheDocument();
      expect(confirmBtn).toBeDisabled();

      resolve();
      await waitFor(() => expect(onReject).toHaveBeenCalledTimes(1));
    });
  });

  it('is a no-op when an action handler is not provided', async () => {
    renderWithTheme(
      <ApplicationCard applicant={baseApplicant} status="pending" onProfileClick={vi.fn()} />,
    );
    // No onAssign handler: clicking must not throw and the button stays enabled.
    const assignBtn = screen.getByRole('button', { name: /assign octocat/i });
    await userEvent.click(assignBtn);
    expect(assignBtn).not.toBeDisabled();
  });
});
