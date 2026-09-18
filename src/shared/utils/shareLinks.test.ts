import { describe, expect, it } from 'vitest';
import { shareableProjectUrl } from './shareLinks';

describe('shareableProjectUrl', () => {
  it('identifies the project and nothing about the sender', () => {
    const url = new URL(shareableProjectUrl('690c3ea8-e843-4698-98d6-ecd4b7542b1f', 'https://grainlify.com'));
    expect(url.pathname).toBe('/dashboard');
    expect(url.searchParams.get('project')).toBe('690c3ea8-e843-4698-98d6-ecd4b7542b1f');
    expect(url.searchParams.get('tab')).toBe('browse');
    // The reported link carried these from a maintainer's address bar.
    expect(url.searchParams.has('view')).toBe(false);
    expect(url.searchParams.has('from')).toBe(false);
  });
});
