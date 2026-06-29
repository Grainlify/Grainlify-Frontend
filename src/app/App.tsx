import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AuthProvider } from '../shared/contexts/AuthContext'
import { ThemeProvider } from '../shared/contexts/ThemeContext'
import { LandingPage } from '../features/landing'
import { SignInPage, SignUpPage, AuthCallbackPage } from '../features/auth'
import { DashboardLayout } from '../features/dashboard/DashboardLayout'
import { DiscoverPage } from '../features/dashboard/pages/DiscoverPage'
import { BrowsePage } from '../features/dashboard/pages/BrowsePage'
import { ContributorsPage } from '../features/dashboard/pages/ContributorsPage'
import { ProfilePage } from '../features/dashboard/pages/ProfilePage'
import { DataPage } from '../features/dashboard/pages/DataPage'
import { LeaderboardPage } from '../features/leaderboard/pages/LeaderboardPage'
import { BlogPage } from '../features/blog/pages/BlogPage'
import { SettingsPage } from '../features/settings/pages/SettingsPage'
import { AdminPage } from '../features/admin/pages/AdminPage'
import {
  OpenSourceWeekPageRoute,
  OpenSourceWeekDetailPageRoute,
  EcosystemsPageRoute,
  EcosystemDetailPageRoute,
  MaintainersPageRoute,
  ProjectDetailPageRoute,
  IssueDetailPageRoute,
  SearchPageRoute,
  BlogArticlePageRoute,
} from '../features/dashboard/routeWrappers'
import { NotFoundPage } from '../shared/components/NotFoundPage'
import { RoleGuard } from '../shared/components/RoleGuard'
import { AuthGuard } from '../shared/components/AuthGuard'
import Toast from '../shared/components/Toast'
import { LocaleProvider } from '../shared/i18n'
import { ScrollToTop } from '../shared/components/ScrollToTop'

/**
 * Applies the three-state authentication boundary to protected routes.
 * Loading renders only the guard fallback, authenticated renders the route,
 * and unauthenticated redirects to sign in while preserving `returnTo`.
 */
export function ProtectedRoute({ children }: { children: ReactElement }) {
  return <AuthGuard>{children}</AuthGuard>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard/discover" replace />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="browse" element={<BrowsePage />} />
        <Route path="open-source-week" element={<OpenSourceWeekPageRoute />} />
        <Route path="open-source-week/:eventId" element={<OpenSourceWeekDetailPageRoute />} />
        <Route path="ecosystems" element={<EcosystemsPageRoute />} />
        <Route path="ecosystems/:ecosystemId" element={<EcosystemDetailPageRoute />} />
        <Route path="contributors" element={<ContributorsPage />} />
        <Route
          path="maintainers"
          element={
            <RoleGuard allow={['maintainer', 'admin']}>
              <MaintainersPageRoute />
            </RoleGuard>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="data" element={<DataPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPageRoute />} />
        <Route path="projects/:projectId/issues/:issueId" element={<IssueDetailPageRoute />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="blog" element={<BlogPage />} />
        {/* Deep link to an individual article. The `:slug` param is
            untrusted input — see BlogArticlePage for sanitize+lookup. */}
        <Route path="blog/:slug" element={<BlogArticlePageRoute />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="admin"
          element={
            <RoleGuard allow={['admin']}>
              <AdminPage />
            </RoleGuard>
          }
        />
        <Route path="search" element={<SearchPageRoute />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <LocaleProvider>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ScrollToTop />
            {/* Skip link: visible on keyboard focus, hidden otherwise */}
            <a
              href="#main"
              id="skip-target"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black focus:shadow"
            >
              Skip to main content
            </a>
            <main id="main" tabIndex={-1} className="outline-none overflow-x-hidden">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard/discover" replace />} />
                  <Route path="discover" element={<DiscoverPage />} />
                  <Route path="browse" element={<BrowsePage />} />
                  <Route path="open-source-week" element={<OpenSourceWeekPageRoute />} />
                  <Route
                    path="open-source-week/:eventId"
                    element={<OpenSourceWeekDetailPageRoute />}
                  />
                  <Route path="ecosystems" element={<EcosystemsPageRoute />} />
                  <Route path="ecosystems/:ecosystemId" element={<EcosystemDetailPageRoute />} />
                  <Route path="contributors" element={<ContributorsPage />} />
                  <Route
                    path="maintainers"
                    element={
                      <RoleGuard allow={['maintainer', 'admin']}>
                        <MaintainersPageRoute />
                      </RoleGuard>
                    }
                  />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="data" element={<DataPage />} />
                  <Route path="projects/:projectId" element={<ProjectDetailPageRoute />} />
                  <Route
                    path="projects/:projectId/issues/:issueId"
                    element={<IssueDetailPageRoute />}
                  />
                  <Route path="leaderboard" element={<LeaderboardPage />} />
                  <Route path="blog" element={<BlogPage />} />
                  {/* Deep link to an individual article. The `:slug` param is
                      untrusted input — see BlogArticlePageRoute for validation. */}
                  <Route path="blog/:slug" element={<BlogArticlePageRoute />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route
                    path="admin"
                    element={
                      <RoleGuard allow={['admin']}>
                        <AdminPage />
                      </RoleGuard>
                    }
                  />
                  <Route path="search" element={<SearchPageRoute />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <Toast />
            </main>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </LocaleProvider>
  )
}
