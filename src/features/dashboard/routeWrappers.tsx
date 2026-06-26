import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { OpenSourceWeekPage } from './pages/OpenSourceWeekPage';
import { OpenSourceWeekDetailPage } from './pages/OpenSourceWeekDetailPage';
import { EcosystemsPage } from './pages/EcosystemsPage';
import { EcosystemDetailPage } from './pages/EcosystemDetailPage';
import { MaintainersPage } from '../maintainers/pages/MaintainersPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { SearchPage } from './pages/SearchPage';
import { NotFoundPage } from '../../shared/components/NotFoundPage';

// ─── Param Validation ──────────────────────────────────────────────────────
// Validates route params before they reach detail pages, preventing malformed
// IDs from being forwarded to API endpoints.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NUMERIC_RE = /^\d+$/;
const MAX_PARAM_LENGTH = 128;

/**
 * Validate a path parameter.
 * Accepts: UUID format, numeric IDs, or URL-safe slugs (lowercase alphanumeric + hyphens).
 * Returns null if invalid.
 */
export function validateIdParam(value: string | undefined): string | null {
  if (!value || value.length > MAX_PARAM_LENGTH) return null;
  if (UUID_RE.test(value)) return value;
  if (NUMERIC_RE.test(value)) return value;
  if (SLUG_RE.test(value)) return value;
  return null;
}

/**
 * Validate a slug param (stricter — only lowercase alphanumeric + hyphens).
 */
export function validateSlugParam(value: string | undefined): string | null {
  if (!value || value.length > MAX_PARAM_LENGTH) return null;
  if (SLUG_RE.test(value)) return value;
  return null;
}

// Open Source Week Page Wrapper
export function OpenSourceWeekPageRoute() {
  const navigate = useNavigate();
  
  const handleEventClick = (eventId: string, eventName: string) => {
    navigate(`/dashboard/open-source-week/${eventId}`, { state: { eventName } });
  };

  return <OpenSourceWeekPage onEventClick={handleEventClick} />;
}

// Open Source Week Detail Page Wrapper
export function OpenSourceWeekDetailPageRoute() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { eventName?: string } || {};
  const eventName = state.eventName || 'Event';

  const validatedEventId = validateIdParam(eventId);
  if (!validatedEventId) return <NotFoundPage />;

  const handleBack = () => {
    navigate('/dashboard/open-source-week');
  };

  return (
    <OpenSourceWeekDetailPage
      eventId={validatedEventId}
      eventName={eventName}
      onBack={handleBack}
    />
  );
}

// Ecosystems Page Wrapper
export function EcosystemsPageRoute() {
  const navigate = useNavigate();

  const handleEcosystemClick = (
    ecosystemId: string,
    ecosystemName: string,
    description?: string | null,
    logoUrl?: string | null
  ) => {
    navigate(`/dashboard/ecosystems/${ecosystemId}`, {
      state: { ecosystemName, description, logoUrl }
    });
  };

  return <EcosystemsPage onEcosystemClick={handleEcosystemClick} />;
}

// Ecosystem Detail Page Wrapper
export function EcosystemDetailPageRoute() {
  const { ecosystemId } = useParams<{ ecosystemId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    ecosystemName?: string;
    description?: string | null;
    logoUrl?: string | null;
  } || {};

  const validatedEcosystemId = validateIdParam(ecosystemId);
  if (!validatedEcosystemId) return <NotFoundPage />;

  const handleBack = () => {
    navigate('/dashboard/ecosystems');
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/dashboard/projects/${projectId}`, {
      state: { backTarget: 'ecosystems' }
    });
  };

  return (
    <EcosystemDetailPage
      ecosystemId={validatedEcosystemId}
      ecosystemName={state.ecosystemName || ''}
      initialDescription={state.description || null}
      initialLogoUrl={state.logoUrl || null}
      onBack={handleBack}
      onProjectClick={handleProjectClick}
    />
  );
}

// Maintainers Page Wrapper
export function MaintainersPageRoute() {
  const navigate = useNavigate();

  const handleNavigate = (page: string) => {
    navigate(`/dashboard/${page}`);
  };

  return <MaintainersPage onNavigate={handleNavigate} />;
}

// Project Detail Page Wrapper
export function ProjectDetailPageRoute() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { backTarget?: string } || {};

  const validatedProjectId = validateIdParam(projectId);
  if (!validatedProjectId) return <NotFoundPage />;

  const handleBack = () => {
    if (state.backTarget) {
      navigate(`/dashboard/${state.backTarget}`);
    } else {
      navigate('/dashboard/browse');
    }
  };

  const handleIssueClick = (issueId: string, projectId: string) => {
    navigate(`/dashboard/projects/${projectId}/issues/${issueId}`);
  };

  const getBackLabel = () => {
    switch (state.backTarget) {
      case 'browse': return 'Back to Browse';
      case 'profile': return 'Back to Profile';
      case 'leaderboard': return 'Back to Leaderboard';
      case 'ecosystems': return 'Back to Ecosystems';
      case 'discover': return 'Back to Discover';
      default: return 'Back';
    }
  };

  return (
    <ProjectDetailPage
      projectId={validatedProjectId}
      backLabel={getBackLabel()}
      onBack={handleBack}
      onIssueClick={handleIssueClick}
    />
  );
}

// Issue Detail Page Wrapper
export function IssueDetailPageRoute() {
  const { projectId, issueId } = useParams<{ projectId: string; issueId: string }>();
  const navigate = useNavigate();

  const validatedProjectId = validateIdParam(projectId);
  const validatedIssueId = validateIdParam(issueId);
  if (!validatedProjectId || !validatedIssueId) return <NotFoundPage />;

  const handleClose = () => {
    navigate(`/dashboard/projects/${projectId}`);
  };

  return (
    <IssueDetailPage
      issueId={validatedIssueId}
      projectId={validatedProjectId}
      onClose={handleClose}
    />
  );
}

// Search Page Wrapper
export function SearchPageRoute() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/dashboard/discover');
  };

  const handleIssueClick = () => {
    // Navigate to the project/issue view
    navigate('/dashboard/discover');
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/dashboard/projects/${projectId}`, {
      state: { backTarget: 'discover' }
    });
  };

  const handleContributorClick = () => {
    navigate(`/dashboard/contributors`);
  };

  return (
    <SearchPage
      onBack={handleBack}
      onIssueClick={handleIssueClick}
      onProjectClick={handleProjectClick}
      onContributorClick={handleContributorClick}
    />
  );
}
