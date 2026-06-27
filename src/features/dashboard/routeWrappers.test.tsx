import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

// Mock the page components to render simple stubs
vi.mock('./pages/OpenSourceWeekDetailPage', () => ({
  OpenSourceWeekDetailPage: ({ eventId }: { eventId: string }) => (
    <div data-testid="osw-detail">OSW Detail: {eventId}</div>
  )
}));

vi.mock('./pages/EcosystemDetailPage', () => ({
  EcosystemDetailPage: ({ ecosystemId }: { ecosystemId: string }) => (
    <div data-testid="eco-detail">Eco Detail: {ecosystemId}</div>
  )
}));

vi.mock('./pages/ProjectDetailPage', () => ({
  ProjectDetailPage: ({ projectId }: { projectId: string }) => (
    <div data-testid="project-detail">Project Detail: {projectId}</div>
  )
}));

vi.mock('./pages/IssueDetailPage', () => ({
  IssueDetailPage: ({ issueId, projectId }: { issueId: string; projectId: string }) => (
    <div data-testid="issue-detail">Issue Detail: {projectId}/{issueId}</div>
  )
}));

import {
  OpenSourceWeekDetailPageRoute,
  EcosystemDetailPageRoute,
  ProjectDetailPageRoute,
  IssueDetailPageRoute,
} from './routeWrappers';

describe('routeWrappers param validation', () => {
  it('renders OpenSourceWeekDetailPageRoute when eventId is valid', () => {
    render(
      <MemoryRouter initialEntries={['/events/valid-event-id-123']}>
        <Routes>
          <Route path="/events/:eventId" element={<OpenSourceWeekDetailPageRoute />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('osw-detail')).toBeInTheDocument();
    expect(screen.getByText('OSW Detail: valid-event-id-123')).toBeInTheDocument();
  });

  it('renders empty state (null) for invalid eventId', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/events/invalid..event/id']}>
        <Routes>
          <Route path="/events/:eventId" element={<OpenSourceWeekDetailPageRoute />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders EcosystemDetailPageRoute when ecosystemId is valid', () => {
    render(
      <MemoryRouter initialEntries={['/ecosystems/stellar-123']}>
        <Routes>
          <Route path="/ecosystems/:ecosystemId" element={<EcosystemDetailPageRoute />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('eco-detail')).toBeInTheDocument();
  });

  it('renders empty state (null) for invalid ecosystemId', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/ecosystems/invalid%2feco']}>
        <Routes>
          <Route path="/ecosystems/:ecosystemId" element={<EcosystemDetailPageRoute />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders ProjectDetailPageRoute when projectId is valid', () => {
    render(
      <MemoryRouter initialEntries={['/projects/my-project-id']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetailPageRoute />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('project-detail')).toBeInTheDocument();
  });

  it('renders empty state (null) for invalid projectId', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/projects/invalid.id']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetailPageRoute />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders IssueDetailPageRoute when projectId and issueId are valid', () => {
    render(
      <MemoryRouter initialEntries={['/projects/proj-1/issues/issue-2']}>
        <Routes>
          <Route path="/projects/:projectId/issues/:issueId" element={<IssueDetailPageRoute />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('issue-detail')).toBeInTheDocument();
    expect(screen.getByText('Issue Detail: proj-1/issue-2')).toBeInTheDocument();
  });

  it('renders empty state (null) for invalid issueId or projectId', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/projects/proj..1/issues/issue-2']}>
        <Routes>
          <Route path="/projects/:projectId/issues/:issueId" element={<IssueDetailPageRoute />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });
});
