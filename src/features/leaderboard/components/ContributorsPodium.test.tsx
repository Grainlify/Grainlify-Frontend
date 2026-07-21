// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { ContributorsPodium } from './ContributorsPodium';
import { renderWithTheme } from '../../../test/renderWithTheme';
import { LeaderData } from '../types/index';

function makeEntry(overrides: Partial<LeaderData> & { rank: number; username: string }): LeaderData {
  return {
    score: 100,
    trend: 'up',
    trendValue: 0,
    avatar: 'https://example.com/avatar.png',
    ...overrides,
  };
}

const defaultTop3: LeaderData[] = [
  makeEntry({ rank: 1, username: 'Alice', avatar: 'https://example.com/alice.png' }),
  makeEntry({ rank: 2, username: 'Bob',   avatar: 'https://example.com/bob.png' }),
  makeEntry({ rank: 3, username: 'Carol', avatar: 'https://example.com/carol.png' }),
];

describe('ContributorsPodium – avatar null guard', () => {
  it('renders without crashing when all avatars are valid URLs', () => {
    renderWithTheme(<ContributorsPodium topThree={defaultTop3} isLoaded actualCount={3} />);
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('does not crash when 1st-place avatar is null', () => {
    const top3 = [
      makeEntry({ rank: 1, username: 'Alice', avatar: null as unknown as string }),
      makeEntry({ rank: 2, username: 'Bob' }),
      makeEntry({ rank: 3, username: 'Carol' }),
    ];
    expect(() =>
      renderWithTheme(<ContributorsPodium topThree={top3} isLoaded actualCount={3} />),
    ).not.toThrow();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('does not crash when 2nd-place avatar is undefined', () => {
    const top3 = [
      makeEntry({ rank: 1, username: 'Alice' }),
      makeEntry({ rank: 2, username: 'Bob', avatar: undefined as unknown as string }),
      makeEntry({ rank: 3, username: 'Carol' }),
    ];
    expect(() =>
      renderWithTheme(<ContributorsPodium topThree={top3} isLoaded actualCount={3} />),
    ).not.toThrow();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('does not crash when 3rd-place avatar is null', () => {
    const top3 = [
      makeEntry({ rank: 1, username: 'Alice' }),
      makeEntry({ rank: 2, username: 'Bob' }),
      makeEntry({ rank: 3, username: 'Carol', avatar: null as unknown as string }),
    ];
    expect(() =>
      renderWithTheme(<ContributorsPodium topThree={top3} isLoaded actualCount={3} />),
    ).not.toThrow();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('renders emoji avatar when avatar is a non-http string', () => {
    const top3 = [
      makeEntry({ rank: 1, username: 'Alice', avatar: '🏆' }),
      makeEntry({ rank: 2, username: 'Bob' }),
      makeEntry({ rank: 3, username: 'Carol' }),
    ];
    renderWithTheme(<ContributorsPodium topThree={top3} isLoaded actualCount={3} />);
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  it('renders all three positions with missing avatars without crashing', () => {
    const top3 = [
      makeEntry({ rank: 1, username: 'Alice', avatar: null as unknown as string }),
      makeEntry({ rank: 2, username: 'Bob',   avatar: null as unknown as string }),
      makeEntry({ rank: 3, username: 'Carol', avatar: null as unknown as string }),
    ];
    expect(() =>
      renderWithTheme(<ContributorsPodium topThree={top3} isLoaded actualCount={3} />),
    ).not.toThrow();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
