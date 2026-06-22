import { describe, it, expect } from 'vitest';
import { getRepoName, isValidProject } from './projectFilter';

describe('getRepoName', () => {
  it.each([
    ['owner/my-repo', 'my-repo'],
    ['org/team/repo', 'team'],
    ['standalone', 'standalone'],
    ['', ''],
    ['/leading-slash', 'leading-slash'],
    ['owner/', ''],
    ['owner/repo/extra', 'repo'],
  ])('extracts "%s" as "%s"', (fullName, expected) => {
    expect(getRepoName(fullName)).toBe(expected);
  });
});

describe('isValidProject', () => {
  it('accepts a valid project', () => {
    const project = { id: '123', github_full_name: 'owner/valid-repo' };
    expect(isValidProject(project)).toBe(true);
  });

  it('rejects .github repo', () => {
    const project = { id: '456', github_full_name: 'owner/.github' };
    expect(isValidProject(project)).toBe(false);
  });

  it.each([
    ['null project', null],
    ['undefined project', undefined],
    ['missing id', { github_full_name: 'owner/repo' }],
    ['empty id', { id: '', github_full_name: 'owner/repo' }],
    ['missing github_full_name', { id: '123' }],
    ['empty github_full_name', { id: '123', github_full_name: '' }],
    ['empty object', {}],
  ])('rejects %s', (_name, project) => {
    expect(isValidProject(project)).toBe(false);
  });

  it('rejects .github repo case-insensitively', () => {
    const project = { id: '789', github_full_name: 'owner/.GitHub' };
    expect(isValidProject(project)).toBe(false);
  });
});
