// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { ProjectsPodium } from './ProjectsPodium';
import { renderWithTheme } from '../../../test/renderWithTheme';
import { ProjectData } from '../types';

const topThree: ProjectData[] = [
  {
    rank: 1,
    name: 'Alpha Vault',
    logo: 'https://example.com/alpha.png',
    score: 980,
    trend: 'up',
    trendValue: 12,
  },
  {
    rank: 2,
    name: 'Beta Finance',
    logo: 'https://example.com/beta.png',
    score: 870,
    trend: 'same',
    trendValue: 0,
  },
  {
    rank: 3,
    name: 'Gamma Labs',
    logo: 'https://example.com/gamma.png',
    score: 760,
    trend: 'down',
    trendValue: 3,
  },
];

function renderPodium() {
  return renderWithTheme(<ProjectsPodium topThree={topThree} isLoaded />);
}

describe('ProjectsPodium accessibility', () => {
  it('keeps project logos accessible with project-specific alt text', () => {
    renderPodium();

    expect(screen.getByRole('img', { name: 'Alpha Vault logo' })).toHaveAttribute(
      'src',
      topThree[0].logo,
    );
    expect(screen.getByRole('img', { name: 'Beta Finance logo' })).toHaveAttribute(
      'src',
      topThree[1].logo,
    );
    expect(screen.getByRole('img', { name: 'Gamma Labs logo' })).toHaveAttribute(
      'src',
      topThree[2].logo,
    );
  });

  it('conveys podium ranks as visible text', () => {
    renderPodium();

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('hides decorative podium icons and animation overlays from assistive tech', () => {
    renderPodium();

    [
      'projects-podium-sparkles-second',
      'projects-podium-medal-second',
      'projects-podium-golden-glow',
      'projects-podium-rays',
      'projects-podium-particles',
      'projects-podium-ping-ring',
      'projects-podium-crown',
      'projects-podium-trophy',
      'projects-podium-sparkles-third',
      'projects-podium-medal-third',
    ].forEach((testId) => {
      expect(screen.getByTestId(testId)).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
