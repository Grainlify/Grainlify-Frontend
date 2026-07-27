export type FilterType = 'overall' | 'rewards' | 'contributions' | 'ecosystems';
export type LeaderboardType = 'contributors' | 'projects';

export interface LeaderData {
  rank: number;
  rank_tier?: string;
  rank_tier_name?: string;
  username: string;
  avatar: string;
  user_id?: string;
  score: number;
  trend: 'up' | 'down' | 'same';
  trendValue: number;
  contributions?: number;
  ecosystems?: string[];
}

export interface ProjectData {
  /**
   * Stable project identifier used to deep-link to the project detail route
   * (`/dashboard/projects/:projectId`). Optional because some static/seed rows
   * predate per-project routing; rows without an id render a non-navigating
   * "View Project" control.
   */
  id?: string;
  rank: number;
  name: string;
  logo: string;
  score: number;
  trend: 'up' | 'down' | 'same';
  trendValue: number;
  contributors?: number;
  ecosystems?: string[];
  activity?: string;
}

export interface Petal {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  size: number;
}
