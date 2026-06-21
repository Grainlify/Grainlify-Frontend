import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '../../contexts/ThemeContext';
import { IssueCard } from './IssueCard';

function renderIssueCard(tags: string[]) {
  return render(
    <ThemeProvider>
      <IssueCard
        id="issue-93"
        number="#93"
        title="Replace array-index keys"
        tags={tags}
        showTags
      />
    </ThemeProvider>
  );
}

describe('IssueCard tags', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders reordered tags without losing their displayed labels', () => {
    const { rerender } = renderIssueCard(['frontend', 'bug', 'good first issue']);

    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('good first issue')).toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <IssueCard
          id="issue-93"
          number="#93"
          title="Replace array-index keys"
          tags={['good first issue', 'frontend', 'bug']}
          showTags
        />
      </ThemeProvider>
    );

    const card = screen.getByRole('button', { name: /replace array-index keys/i });
    const labels = within(card).getAllByText(/frontend|bug|good first issue/);

    expect(labels.map((label) => label.textContent)).toEqual([
      'good first issue',
      'frontend',
      'bug',
    ]);
  });

  it('uses unique stable keys for duplicate normalized tags', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderIssueCard(['frontend', 'Frontend', 'front end']);

    const consoleMessages = consoleError.mock.calls.flat().join('\n');

    expect(screen.getAllByText(/front/i)).toHaveLength(3);
    expect(consoleMessages).not.toContain('Encountered two children with the same key');

    consoleError.mockRestore();
  });
});
