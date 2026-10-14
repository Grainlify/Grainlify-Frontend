import type { ReactNode } from 'react';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { IssueCardSkeleton } from '../../../shared/components/IssueCardSkeleton';
import { PRRowSkeleton } from '../../../shared/components/PRRowSkeleton';
import { ActivityItemSkeleton } from '../../../shared/components/ActivityItemSkeleton';
import { ChartSkeleton } from '../../../shared/components/ChartSkeleton';
import { ProjectCardSkeleton } from './ProjectCardSkeleton';
import { OrganizationCardSkeleton } from './OrganizationCardSkeleton';
import { ContributorsTableSkeleton } from '../../leaderboard/components/ContributorsTableSkeleton';
import { ContributorsPodiumSkeleton } from '../../leaderboard/components/ContributorsPodiumSkeleton';
import { StatsCardSkeleton } from '../../maintainers/components/dashboard/StatsCardSkeleton';

function RouteSkeletonFrame({
  route,
  label,
  children,
}: {
  route: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      data-testid="route-skeleton"
      data-route-skeleton={route}
      aria-busy="true"
      aria-label={`Loading ${label}`}
      className="space-y-6"
    >
      {children}
    </div>
  );
}

function PageHeaderSkeleton({ withBack = false }: { withBack?: boolean }) {
  return (
    <div className="space-y-3">
      {withBack && <SkeletonLoader className="h-8 w-28 rounded-[10px]" />}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonLoader className="h-8 w-56" />
          <SkeletonLoader className="h-4 w-80 max-w-full" />
        </div>
        <SkeletonLoader className="h-10 w-44 rounded-[12px]" />
      </div>
    </div>
  );
}

export function DiscoverRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="discover" label="Discover">
      <div className="rounded-[24px] border border-white/15 bg-white/[0.08] p-6 space-y-4">
        <SkeletonLoader className="h-7 w-64" />
        <SkeletonLoader className="h-4 w-96 max-w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
      <div className="space-y-3">
        <IssueCardSkeleton />
        <IssueCardSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function BrowseRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="browse" label="Browse">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function ContributorsRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="contributors" label="Contributors">
      <PageHeaderSkeleton />
      <ContributorsTableSkeleton />
    </RouteSkeletonFrame>
  );
}

export function LeaderboardRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="leaderboard" label="Leaderboard">
      <PageHeaderSkeleton />
      <ContributorsPodiumSkeleton />
      <ContributorsTableSkeleton />
    </RouteSkeletonFrame>
  );
}

export function EcosystemsRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="ecosystems" label="Ecosystems">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <OrganizationCardSkeleton />
        <OrganizationCardSkeleton />
        <OrganizationCardSkeleton />
        <OrganizationCardSkeleton />
        <OrganizationCardSkeleton />
        <OrganizationCardSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function EcosystemDetailRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="ecosystem-detail" label="Ecosystem details">
      <PageHeaderSkeleton withBack />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function GrainHackEventsRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="grainhack-events" label="GrainHack events">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <OrganizationCardSkeleton />
        <OrganizationCardSkeleton />
        <OrganizationCardSkeleton />
        <OrganizationCardSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function GrainHackEventDetailRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="grainhack-event-detail" label="GrainHack event">
      <PageHeaderSkeleton withBack />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <div className="space-y-3">
        <IssueCardSkeleton />
        <IssueCardSkeleton />
        <IssueCardSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function MaintainersRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="maintainers" label="Maintainers">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <div className="space-y-3">
        <PRRowSkeleton />
        <PRRowSkeleton />
        <PRRowSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function ProfileRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="profile" label="Profile">
      <div className="rounded-[24px] border border-white/15 bg-white/[0.08] p-6 flex items-center gap-5">
        <SkeletonLoader variant="circle" className="w-20 h-20 shrink-0" />
        <div className="space-y-2 flex-1">
          <SkeletonLoader className="h-6 w-48" />
          <SkeletonLoader className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <div className="space-y-3">
        <ActivityItemSkeleton />
        <ActivityItemSkeleton />
        <ActivityItemSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function OrgProfileRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="org-profile" label="Organization profile">
      <PageHeaderSkeleton withBack />
      <div className="rounded-[24px] border border-white/15 bg-white/[0.08] p-6">
        <ChartSkeleton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function DataRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="data" label="Data analytics">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[24px] border border-white/15 bg-white/[0.08] p-6">
          <ChartSkeleton />
        </div>
        <div className="rounded-[24px] border border-white/15 bg-white/[0.08] p-6">
          <ChartSkeleton />
        </div>
      </div>
    </RouteSkeletonFrame>
  );
}

export function ProjectDetailRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="project-detail" label="Project details">
      <PageHeaderSkeleton withBack />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <div className="space-y-3">
        <IssueCardSkeleton />
        <IssueCardSkeleton />
        <IssueCardSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function IssueDetailRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="issue-detail" label="Issue details">
      <PageHeaderSkeleton withBack />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-[20px] border border-white/15 bg-white/[0.08] p-6 space-y-4">
          <SkeletonLoader className="h-6 w-2/3" />
          <SkeletonLoader className="h-4 w-full" />
          <SkeletonLoader className="h-4 w-5/6" />
          <SkeletonLoader className="h-32 w-full rounded-[12px]" />
        </div>
        <div className="rounded-[20px] border border-white/15 bg-white/[0.08] p-6 space-y-4">
          <SkeletonLoader className="h-5 w-32" />
          <SkeletonLoader className="h-10 w-full rounded-[12px]" />
          <SkeletonLoader className="h-4 w-3/4" />
        </div>
      </div>
    </RouteSkeletonFrame>
  );
}

export function BountiesRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="bounties" label="Bounties">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        <IssueCardSkeleton />
        <IssueCardSkeleton />
        <IssueCardSkeleton />
        <IssueCardSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function BlogRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="blog" label="Blog">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function SettingsRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="settings" label="Settings">
      <PageHeaderSkeleton />
      <div className="rounded-[24px] border border-white/15 bg-white/[0.08] p-6 space-y-4">
        <SkeletonLoader className="h-10 w-80 max-w-full rounded-[12px]" />
        <SkeletonLoader className="h-14 w-full rounded-[12px]" />
        <SkeletonLoader className="h-14 w-full rounded-[12px]" />
        <SkeletonLoader className="h-14 w-full rounded-[12px]" />
      </div>
    </RouteSkeletonFrame>
  );
}

export function AdminRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="admin" label="Admin dashboard">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <div className="space-y-3">
        <PRRowSkeleton />
        <PRRowSkeleton />
        <PRRowSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function MyGrainHackRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="my-grainhack" label="My GrainHack">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <div className="space-y-3">
        <PRRowSkeleton />
        <PRRowSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function NotificationsRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="notifications" label="Notifications">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        <ActivityItemSkeleton />
        <ActivityItemSkeleton />
        <ActivityItemSkeleton />
        <ActivityItemSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function GrainHackAdminRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="grainhack-admin" label="GrainHack administration">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <div className="space-y-3">
        <PRRowSkeleton />
        <PRRowSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}

export function SearchRouteSkeleton() {
  return (
    <RouteSkeletonFrame route="search" label="Search results">
      <PageHeaderSkeleton withBack />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
      <div className="space-y-3">
        <IssueCardSkeleton />
        <IssueCardSkeleton />
      </div>
    </RouteSkeletonFrame>
  );
}
