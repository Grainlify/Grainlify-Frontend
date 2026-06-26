import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { validateIdParam, validateSlugParam } from './routeWrappers';
import { NotFoundPage } from '../../shared/components/NotFoundPage';
import { OpenSourceWeekDetailPageRoute } from './routeWrappers';
import { ProjectDetailPageRoute } from './routeWrappers';
import { IssueDetailPageRoute } from './routeWrappers';
import { EcosystemDetailPageRoute } from './routeWrappers';

// ─── Unit tests for validateIdParam ──────────────────────────────────────────

describe('validateIdParam', () => {
  it('accepts valid UUID strings', () => {
    expect(validateIdParam('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('accepts numeric IDs', () => {
    expect(validateIdParam('12345')).toBe('12345');
  });

  it('accepts slug-format strings', () => {
    expect(validateIdParam('my-project-slug')).toBe('my-project-slug');
  });

  it('rejects strings with special characters', () => {
    expect(validateIdParam('abc<script>')).toBeNull();
    expect(validateIdParam('foo;drop table')).toBeNull();
    expect(validateIdParam('../../etc/passwd')).toBeNull();
  });

  it('rejects empty strings', () => {
    expect(validateIdParam('')).toBeNull();
  });

  it('rejects undefined', () => {
    expect(validateIdParam(undefined)).toBeNull();
  });

  it('rejects overly long strings', () => {
    const longStr = 'a'.repeat(129);
    expect(validateIdParam(longStr)).toBeNull();
  });

  it('accepts strings at the max length boundary', () => {
    const boundaryStr = 'a'.repeat(128);
    expect(validateIdParam(boundaryStr)).toBe(boundaryStr);
  });

  it('rejects SQL injection attempts', () => {
    expect(validateIdParam("1' OR '1'='1")).toBeNull();
    expect(validateIdParam('1; DROP TABLE users')).toBeNull();
  });

  it('rejects XSS payloads', () => {
    expect(validateIdParam('<script>alert(1)</script>')).toBeNull();
    expect(validateIdParam('javascript:alert(1)')).toBeNull();
  });
});

// ─── Unit tests for validateSlugParam ────────────────────────────────────────

describe('validateSlugParam', () => {
  it('accepts valid slugs', () => {
    expect(validateSlugParam('hello-world')).toBe('hello-world');
    expect(validateSlugParam('blog-post-2024')).toBe('blog-post-2024');
  });

  it('rejects uppercase characters', () => {
    expect(validateSlugParam('MyProject')).toBeNull();
  });

  it('rejects slugs with spaces', () => {
    expect(validateSlugParam('hello world')).toBeNull();
  });

  it('rejects empty strings', () => {
    expect(validateSlugParam('')).toBeNull();
  });

  it('rejects undefined', () => {
    expect(validateSlugParam(undefined)).toBeNull();
  });
});

// ─── Integration tests for route wrappers with invalid params ────────────────

describe('Route wrappers with invalid params', () => {
  it('renders NotFoundPage for invalid ecosystemId', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/ecosystems/<script>']}>
        <EcosystemDetailPageRoute />
      </MemoryRouter>
    );
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders NotFoundPage for invalid projectId', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/projects/foo;drop']}>
        <ProjectDetailPageRoute />
      </MemoryRouter>
    );
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders NotFoundPage for invalid issueId', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/projects/123/issues/<img>']}>
        <IssueDetailPageRoute />
      </MemoryRouter>
    );
    expect(screen.getByText('404')).toBeInTheDocument();
  });
});
