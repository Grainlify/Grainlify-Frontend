import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider } from '../../../shared/contexts/ThemeContext';
import type { LeaderData } from '../types';
import { ContributorsPodium } from './ContributorsPodium';

function createLeader(overrides: Partial<LeaderData>): LeaderData {
  return {
    rank: 1,
    username: 'Contributor',
    avatar: 'AB',
    score: 100,
    trend: 'same',
    trendValue: 0,
    ...overrides,
  };
}

function renderPodium(topThree: LeaderData[]) {
  return render(
    <ThemeProvider>
      <ContributorsPodium topThree={topThree} isLoaded actualCount={3} />
    </ThemeProvider>
  );
}

describe('ContributorsPodium avatars', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders fallback initials when podium avatars are missing', () => {
    const leaders = [
      createLeader({ rank: 1, username: 'Ada Lovelace', avatar: null as unknown as string }),
      createLeader({ rank: 2, username: 'Grace Hopper', avatar: undefined as unknown as string }),
      createLeader({ rank: 3, username: 'Linus Torvalds', avatar: '' }),
    ];

    expect(() => renderPodium(leaders)).not.toThrow();
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.getByText('GH')).toBeInTheDocument();
    expect(screen.getByText('LT')).toBeInTheDocument();
  });

  it('keeps valid URL avatars as images and non-URL avatars as labels', () => {
    const leaders = [
      createLeader({
        rank: 1,
        username: 'Url Avatar',
        avatar: 'https://example.com/avatar.png',
      }),
      createLeader({ rank: 2, username: 'Initial Avatar', avatar: 'IA' }),
      createLeader({ rank: 3, username: 'Letter Avatar', avatar: 'LA' }),
    ];

    renderPodium(leaders);

    expect(screen.getByAltText('Url Avatar')).toHaveAttribute(
      'src',
      'https://example.com/avatar.png'
    );
    expect(screen.getByText('IA')).toBeInTheDocument();
    expect(screen.getByText('LA')).toBeInTheDocument();
  });
});
