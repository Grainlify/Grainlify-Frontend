import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { OpenSourceWeekPage } from './pages/OpenSourceWeekPage';
import { OpenSourceWeekDetailPage } from './pages/OpenSourceWeekDetailPage';
import { EcosystemsPage } from './pages/EcosystemsPage';
import { EcosystemDetailPage } from './pages/EcosystemDetailPage';
import { MaintainersPage } from '../maintainers/pages/MaintainersPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { SearchPage } from './pages/SearchPage';
import { BlogArticlePage } from '../blog/pages/BlogArticlePage';
import { ResourceNotFound } from '../../shared/components/ResourceNotFound';
import { isValidRouteParam } from '../../shared/utils/validation';

// Open Source Week Page Wrapper
export function OpenSourceWeekPageRoute() {
  const navigate = useNavigate()

  const handleEventClick = (eventId: string, eventName: string) => {
    navigate(`/dashboard/open-source-week/${eventId}`, { state: { eventName } })
  }

  return <OpenSourceWeekPage onEventClick={handleEventClick} />
}

// Open Source Week Detail Page Wrapper
export function OpenSourceWeekDetailPageRoute() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as { eventName?: string }) || {}
  const eventName = state.eventName || ''

  if (!isValidRouteParam(eventId)) {
    return (
      <ResourceNotFound
        title="Event not found"
        backTo="/dashboard/open-source-week"
        backLabel="Back to Open Source Week"
      />
    );
  }

  const handleBack = () => {
    navigate('/dashboard/open-source-week')
  }

  return <OpenSourceWeekDetailPage eventId={eventId} eventName={eventName} onBack={handleBack} />
}

// Ecosystems Page Wrapper
export function EcosystemsPageRoute() {
  const navigate = useNavigate()

  const handleEcosystemClick = (
    ecosystemId: string,
    ecosystemName: string,
    description?: string | null,
    logoUrl?: string | null
  ) => {
    navigate(`/dashboard/ecosystems/${ecosystemId}`, {
      state: { ecosystemName, description, logoUrl },
    })
  }

  return <EcosystemsPage onEcosystemClick={handleEcosystemClick} />
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

  if (!isValidRouteParam(ecosystemId)) {
    return (
      <ResourceNotFound
        title="Ecosystem not found"
        backTo="/dashboard/ecosystems"
        backLabel="Back to Ecosystems"
      />
    );
  }

  const handleBack = () => {
    navigate('/dashboard/ecosystems')
  }

  const handleProjectClick = (projectId: string) => {
    navigate(`/dashboard/projects/${projectId}`, {
      state: { backTarget: 'ecosystems' },
    })
  }

  return (
    <EcosystemDetailPage
      ecosystemId={ecosystemId}
      ecosystemName={state.ecosystemName || ''}
      initialDescription={state.description || null}
      initialLogoUrl={state.logoUrl || null}
      onBack={handleBack}
      onProjectClick={handleProjectClick}
    />
  )
}

// Maintainers Page Wrapper
export function MaintainersPageRoute() {
  const navigate = useNavigate()

  const handleNavigate = (page: string) => {
    navigate(`/dashboard/${page}`)
  }

  return <MaintainersPage onNavigate={handleNavigate} />
}

// Project Detail Page Wrapper
export function ProjectDetailPageRoute() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as { backTarget?: string }) || {}

  if (!isValidRouteParam(projectId)) {
    return (
      <ResourceNotFound
        title="Project not found"
        backTo="/dashboard/browse"
        backLabel="Back to Browse"
      />
    );
  }

  const handleBack = () => {
    if (state.backTarget) {
      navigate(`/dashboard/${state.backTarget}`)
    } else {
      navigate('/dashboard/browse')
    }
  }

  const handleIssueClick = (issueId: string, projectId: string) => {
    navigate(`/dashboard/projects/${projectId}/issues/${issueId}`)
  }

  const getBackLabel = () => {
    switch (state.backTarget) {
      case 'browse':
        return 'Back to Browse'
      case 'profile':
        return 'Back to Profile'
      case 'leaderboard':
        return 'Back to Leaderboard'
      case 'ecosystems':
        return 'Back to Ecosystems'
      case 'discover':
        return 'Back to Discover'
      default:
        return 'Back'
    }
  }

  return (
    <ProjectDetailPage
      projectId={projectId}
      backLabel={getBackLabel()}
      onBack={handleBack}
      onIssueClick={handleIssueClick}
    />
  )
}

// Issue Detail Page Wrapper
export function IssueDetailPageRoute() {
  const { projectId, issueId } = useParams<{ projectId: string; issueId: string }>()
  const navigate = useNavigate()

  if (!isValidRouteParam(projectId) || !isValidRouteParam(issueId)) {
    return (
      <ResourceNotFound
        title="Issue not found"
        backTo="/dashboard/browse"
        backLabel="Back to Browse"
      />
    );
  }

  const handleClose = () => {
    navigate(`/dashboard/projects/${projectId}`)
  }

  return <IssueDetailPage issueId={issueId} projectId={projectId} onClose={handleClose} />
}

/**
 * Blog Article Page Wrapper
 * Validates the `:slug` parameter before rendering the article page.
 */
export function BlogArticlePageRoute() {
  const { slug } = useParams<{ slug: string }>();

  if (!isValidRouteParam(slug)) {
    return (
      <ResourceNotFound
        title="Article not found"
        backTo="/dashboard/blog"
        backLabel="Back to Blog"
      />
    );
  }

  return <BlogArticlePage />;
}

// Search Page Wrapper
export function SearchPageRoute() {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate('/dashboard/discover')
  }

  const handleIssueClick = (issueId?: string, projectId?: string) => {
    if (issueId && projectId) {
      navigate(`/dashboard/projects/${projectId}/issues/${issueId}`)
    } else {
      navigate('/dashboard/discover')
    }
  }

  const handleProjectClick = (projectId: string) => {
    navigate(`/dashboard/projects/${projectId}`, {
      state: { backTarget: 'discover' },
    })
  }

  const handleContributorClick = () => {
    navigate(`/dashboard/contributors`)
  }

  return (
    <SearchPage
      onBack={handleBack}
      onIssueClick={handleIssueClick}
      onProjectClick={handleProjectClick}
      onContributorClick={handleContributorClick}
    />
  )
}
